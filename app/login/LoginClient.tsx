'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogIn } from 'lucide-react';
import { authClient } from '@/lib/auth-client';

export default function LoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const result = await authClient.signIn.email({ email, password });
    if (result.error) {
      setError('Nieprawidłowy e-mail lub hasło.');
      setLoading(false);
      return;
    }
    router.replace('/');
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="panel-surface w-full max-w-sm space-y-4 rounded-[2rem] p-6 shadow-xl">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-2xl ring-1 ring-teal-100">🫒</div>
        <h1 className="text-xl font-semibold text-gray-900">NutriMind</h1>
        <p className="mt-1 text-sm text-gray-400">Zaloguj się do swojego planu</p>
      </div>
      <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" className="input-base w-full rounded-xl px-3 py-2.5 text-sm" />
      <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Hasło" className="input-base w-full rounded-xl px-3 py-2.5 text-sm" />
      <button disabled={loading} className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-60">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
        {loading ? 'Logowanie…' : 'Zaloguj się'}
      </button>
      {error && <p className="text-center text-sm text-red-500">{error}</p>}
    </form>
  );
}
