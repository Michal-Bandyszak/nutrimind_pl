import { redirect } from 'next/navigation';
import { getAuthContext } from '@/lib/auth-context';
import LoginClient from './LoginClient';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (await getAuthContext()) redirect('/');
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <LoginClient />
    </div>
  );
}
