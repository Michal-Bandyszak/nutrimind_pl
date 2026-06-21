-- Create authentication and tenancy tables first.
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Household" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HouseholdMember" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HouseholdMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PersonProfile" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "targetKcal" INTEGER NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "activeForPlanning" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PersonProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MealPlanParticipant" (
    "id" TEXT NOT NULL,
    "mealPlanId" TEXT NOT NULL,
    "personProfileId" TEXT,
    "nameSnapshot" TEXT NOT NULL,
    "targetKcalSnapshot" INTEGER NOT NULL,
    "isPrimarySnapshot" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "MealPlanParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MealPlanMealPortion" (
    "id" TEXT NOT NULL,
    "mealPlanMealId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "personProfileId" TEXT,
    "servings" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    CONSTRAINT "MealPlanMealPortion_pkey" PRIMARY KEY ("id")
);

-- Preserve all existing application data under a legacy household.
INSERT INTO "Household" ("id", "name", "updatedAt")
VALUES ('legacy-household', 'Dom Michała', CURRENT_TIMESTAMP);

INSERT INTO "AppSettings" (
    "id", "personAName", "personAKcal", "personBName", "personBKcal",
    "defaultBatchConfig", "updatedAt"
)
SELECT 'default', 'Michał', 2500, 'Dziewczyna', 2500, '', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "AppSettings");

ALTER TABLE "AppSettings" ADD COLUMN "householdId" TEXT;
ALTER TABLE "AppSettings" ADD COLUMN "planMode" TEXT NOT NULL DEFAULT 'shared';
UPDATE "AppSettings" SET "householdId" = 'legacy-household';
ALTER TABLE "AppSettings" ALTER COLUMN "householdId" SET NOT NULL;
ALTER TABLE "AppSettings" ALTER COLUMN "id" DROP DEFAULT;

INSERT INTO "PersonProfile" (
    "id", "householdId", "name", "targetKcal", "isPrimary",
    "activeForPlanning", "updatedAt"
)
SELECT
    'legacy-primary-profile', 'legacy-household', "personAName", "personAKcal",
    true, true, CURRENT_TIMESTAMP
FROM "AppSettings"
WHERE "householdId" = 'legacy-household'
LIMIT 1;

INSERT INTO "PersonProfile" (
    "id", "householdId", "name", "targetKcal", "isPrimary",
    "activeForPlanning", "updatedAt"
)
SELECT
    'legacy-secondary-profile', 'legacy-household',
    CASE WHEN "personBName" = 'Osoba B' THEN 'Dziewczyna' ELSE "personBName" END,
    CASE WHEN "personBKcal" = 1800 THEN 2500 ELSE "personBKcal" END,
    false, true, CURRENT_TIMESTAMP
FROM "AppSettings"
WHERE "householdId" = 'legacy-household'
LIMIT 1;

ALTER TABLE "MealPlan" ADD COLUMN "householdId" TEXT;
UPDATE "MealPlan" SET "householdId" = 'legacy-household';
ALTER TABLE "MealPlan" ALTER COLUMN "householdId" SET NOT NULL;

ALTER TABLE "Recipe" ADD COLUMN "householdId" TEXT;
UPDATE "Recipe" SET "householdId" = 'legacy-household' WHERE "source" = 'user';

ALTER TABLE "HealthLog" ADD COLUMN "personProfileId" TEXT;
UPDATE "HealthLog" SET "personProfileId" = 'legacy-primary-profile';
ALTER TABLE "HealthLog" ALTER COLUMN "personProfileId" SET NOT NULL;
DROP INDEX "HealthLog_date_key";

INSERT INTO "MealPlanParticipant" (
    "id", "mealPlanId", "personProfileId", "nameSnapshot",
    "targetKcalSnapshot", "isPrimarySnapshot"
)
SELECT
    'primary-' || mp."id", mp."id", p."id", p."name", p."targetKcal", true
FROM "MealPlan" mp
JOIN "PersonProfile" p ON p."id" = 'legacy-primary-profile';

INSERT INTO "MealPlanParticipant" (
    "id", "mealPlanId", "personProfileId", "nameSnapshot",
    "targetKcalSnapshot", "isPrimarySnapshot"
)
SELECT
    'secondary-' || mp."id", mp."id", p."id", p."name", p."targetKcal", false
FROM "MealPlan" mp
JOIN "PersonProfile" p ON p."id" = 'legacy-secondary-profile';

INSERT INTO "MealPlanMealPortion" (
    "id", "mealPlanMealId", "participantId", "personProfileId", "servings"
)
SELECT
    'primary-' || meal."id", meal."id", 'primary-' || meal."mealPlanId",
    'legacy-primary-profile', meal."servings" / 2.0
FROM "MealPlanMeal" meal;

INSERT INTO "MealPlanMealPortion" (
    "id", "mealPlanMealId", "participantId", "personProfileId", "servings"
)
SELECT
    'secondary-' || meal."id", meal."id", 'secondary-' || meal."mealPlanId",
    'legacy-secondary-profile', meal."servings" / 2.0
FROM "MealPlanMeal" meal;

-- Indexes and constraints.
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Account_userId_idx" ON "Account"("userId");
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");
CREATE UNIQUE INDEX "HouseholdMember_householdId_userId_key" ON "HouseholdMember"("householdId", "userId");
CREATE INDEX "HouseholdMember_userId_idx" ON "HouseholdMember"("userId");
CREATE UNIQUE INDEX "PersonProfile_userId_key" ON "PersonProfile"("userId");
CREATE INDEX "PersonProfile_householdId_idx" ON "PersonProfile"("householdId");
CREATE UNIQUE INDEX "MealPlanParticipant_mealPlanId_personProfileId_key" ON "MealPlanParticipant"("mealPlanId", "personProfileId");
CREATE INDEX "MealPlanParticipant_mealPlanId_idx" ON "MealPlanParticipant"("mealPlanId");
CREATE UNIQUE INDEX "MealPlanMealPortion_mealPlanMealId_participantId_key" ON "MealPlanMealPortion"("mealPlanMealId", "participantId");
CREATE INDEX "MealPlanMealPortion_mealPlanMealId_idx" ON "MealPlanMealPortion"("mealPlanMealId");
CREATE UNIQUE INDEX "AppSettings_householdId_key" ON "AppSettings"("householdId");
CREATE INDEX "Recipe_householdId_idx" ON "Recipe"("householdId");
CREATE INDEX "MealPlan_householdId_status_idx" ON "MealPlan"("householdId", "status");
CREATE UNIQUE INDEX "HealthLog_personProfileId_date_key" ON "HealthLog"("personProfileId", "date");
CREATE INDEX "HealthLog_personProfileId_date_idx" ON "HealthLog"("personProfileId", "date");

ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HouseholdMember" ADD CONSTRAINT "HouseholdMember_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HouseholdMember" ADD CONSTRAINT "HouseholdMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonProfile" ADD CONSTRAINT "PersonProfile_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonProfile" ADD CONSTRAINT "PersonProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AppSettings" ADD CONSTRAINT "AppSettings_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MealPlan" ADD CONSTRAINT "MealPlan_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HealthLog" ADD CONSTRAINT "HealthLog_personProfileId_fkey" FOREIGN KEY ("personProfileId") REFERENCES "PersonProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MealPlanParticipant" ADD CONSTRAINT "MealPlanParticipant_mealPlanId_fkey" FOREIGN KEY ("mealPlanId") REFERENCES "MealPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MealPlanParticipant" ADD CONSTRAINT "MealPlanParticipant_personProfileId_fkey" FOREIGN KEY ("personProfileId") REFERENCES "PersonProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MealPlanMealPortion" ADD CONSTRAINT "MealPlanMealPortion_mealPlanMealId_fkey" FOREIGN KEY ("mealPlanMealId") REFERENCES "MealPlanMeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MealPlanMealPortion" ADD CONSTRAINT "MealPlanMealPortion_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "MealPlanParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MealPlanMealPortion" ADD CONSTRAINT "MealPlanMealPortion_personProfileId_fkey" FOREIGN KEY ("personProfileId") REFERENCES "PersonProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
