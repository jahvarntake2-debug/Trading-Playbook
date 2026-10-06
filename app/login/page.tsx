'use client';

import { signIn } from 'next-auth/react';
import { FormEvent, useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('client@demo.local');
  const [password, setPassword] = useState('hub22');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError('Invalid email or password.');
      setLoading(false);
      return;
    }

    window.location.href = '/';
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted p-6">
      <div className="w-full max-w-md rounded-lg bg-white p-8">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Auckland school supply exchange</p>
          <h1 className="mt-2 text-5xl text-ink">Sign in</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-lg text-ink">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border-2 border-transparent bg-muted px-3 py-3 text-base outline-none transition focus:border-primary focus:bg-white"
              type="email"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-lg text-ink">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border-2 border-transparent bg-muted px-3 py-3 text-base outline-none transition focus:border-primary focus:bg-white"
              type="password"
              required
            />
          </div>

          {error ? (
            <p className="rounded-md bg-accent px-3 py-2 text-base text-ink">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="min-h-14 w-full rounded-md bg-primary px-4 py-3 text-base font-semibold text-white transition-all duration-200 hover:scale-105 hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-ink/60">
          Demo access: client@demo.local / hub22
        </p>
      </div>
    </main>
  );
}
