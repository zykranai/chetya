import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { authWithEmail } from '@/api/client';
import { APP_LANGUAGES } from '@/constants/languages';
import { useAuthStore } from '@/store/authStore';

export function LoginPage() {
  const token = useAuthStore((s) => s.token);
  const [email, setEmail] = useState('');
  const [lang, setLang] = useState('en');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (token) {
    return <Navigate to="/chat" replace />;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const t = email.trim().toLowerCase();
    if (!t.includes('@')) {
      setErr('Please enter a valid email.');
      return;
    }
    setLoading(true);
    try {
      await authWithEmail(t, lang);
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { detail?: string } }; message?: string };
      setErr(ax.response?.data?.detail || ax.message || 'Sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-center text-3xl font-bold text-chetya-cream">Chetya</h1>
        <p className="mt-2 text-center text-chetya-muted">Not your kundli. Your life.</p>
        <p className="mt-6 text-center text-sm text-chetya-muted">
          Sign in with your email and choose your language. Your guru responds in that language.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <div>
            <label className="mb-1.5 block text-sm text-chetya-cream/90">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-chetya-border bg-chetya-panel px-4 py-3 text-chetya-cream placeholder:text-chetya-muted/60 focus:border-chetya-gold focus:outline-none focus:ring-1 focus:ring-chetya-gold"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-chetya-cream/90">App language</label>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="w-full rounded-xl border border-chetya-border bg-chetya-panel px-4 py-3 text-chetya-cream focus:border-chetya-gold focus:outline-none focus:ring-1 focus:ring-chetya-gold"
            >
              {APP_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          {err && (
            <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-200">{err}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-chetya-gold py-3 font-semibold text-chetya-bg transition hover:brightness-110 disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Continue'}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-chetya-muted/80">
          Passwordless session. Set <code className="text-chetya-muted">CHETYA_JWT_SECRET</code> on the
          server for production.
        </p>
      </div>
    </div>
  );
}
