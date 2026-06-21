import { PrismaClient } from '@prisma/client';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';

const prisma = new PrismaClient();

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Brak wymaganej zmiennej ${name}.`);
  return value;
}

const ownerEmail = required('OWNER_EMAIL').toLowerCase();
const ownerPassword = required('OWNER_INITIAL_PASSWORD');
const momEmail = required('MOM_EMAIL').toLowerCase();
const momPassword = required('MOM_INITIAL_PASSWORD');

const bootstrapAuth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: { enabled: true, disableSignUp: false, minPasswordLength: 8 },
  secret: required('BETTER_AUTH_SECRET'),
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
});

async function ensureUser(email: string, password: string, name: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;
  await bootstrapAuth.api.signUpEmail({
    body: { email, password, name },
  });
  return prisma.user.findUniqueOrThrow({ where: { email } });
}

async function main() {
  const owner = await ensureUser(ownerEmail, ownerPassword, 'Michał');
  const mom = await ensureUser(momEmail, momPassword, 'Mama');

  const legacyHousehold = await prisma.household.findUnique({
    where: { id: 'legacy-household' },
  });
  if (!legacyHousehold) {
    throw new Error('Brak gospodarstwa legacy. Najpierw uruchom migracje.');
  }

  await prisma.$transaction([
    prisma.householdMember.upsert({
      where: {
        householdId_userId: {
          householdId: legacyHousehold.id,
          userId: owner.id,
        },
      },
      create: { householdId: legacyHousehold.id, userId: owner.id, role: 'owner' },
      update: { role: 'owner' },
    }),
    prisma.personProfile.update({
      where: { id: 'legacy-primary-profile' },
      data: { userId: owner.id },
    }),
  ]);

  const existingMomMembership = await prisma.householdMember.findFirst({
    where: { userId: mom.id },
  });
  if (!existingMomMembership) {
    await prisma.household.create({
      data: {
        name: 'Dom Mamy',
        members: { create: { userId: mom.id, role: 'owner' } },
        profiles: {
          create: {
            userId: mom.id,
            name: 'Mama',
            targetKcal: 1800,
            isPrimary: true,
            activeForPlanning: true,
          },
        },
        settings: {
          create: {
            personAName: 'Mama',
            personAKcal: 1800,
            personBName: '',
            personBKcal: 1800,
            planMode: 'shared',
          },
        },
      },
    });
  }

  console.log('Konta i gospodarstwa zostały przygotowane.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
