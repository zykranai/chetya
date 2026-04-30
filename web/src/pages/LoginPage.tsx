import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
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
    <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(201,162,39,0.22) 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(45,74,111,0.2) 0%, transparent 45%)',
        }}
      />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <img
            src="/logo.svg"
            alt=""
            width={56}
            height={56}
            className="mb-4 h-14 w-14 rounded-2xl shadow-glass ring-1 ring-white/[0.1]"
            decoding="async"
          />
          <h1 className="text-center text-3xl font-bold tracking-tight text-chetya-cream">Chetya</h1>
          <p className="mt-2 text-center text-chetya-muted">Not your kundli. Your life.</p>
        </div>
        <p className="text-center text-sm leading-relaxed text-chetya-muted">
          Sign in with your email and choose your language. Your guru responds in that language.
        </p>

        <form
          onSubmit={submit}
          className="mt-8 space-y-5 rounded-2xl border border-chetya-border/80 bg-chetya-panel/40 p-6 shadow-glass backdrop-blur-md"
        >
          <div>
            <label className="mb-1.5 block text-sm text-chetya-cream/90">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input w-full py-3"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-chetya-cream/90">App language</label>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="input w-full py-3"
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
            className="w-full rounded-xl bg-chetya-gold py-3.5 font-semibold text-chetya-bg shadow-md transition-all duration-200 hover:brightness-110 active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Continue'}
          </button>
        </form>

        <div className="relative mt-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-chetya-border/60" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-wide">
            <span className="bg-chetya-bg px-3 text-chetya-muted">or</span>
          </div>
        </div>

        <Link
          to="/try"
          className="mt-6 flex w-full items-center justify-center rounded-xl border border-chetya-border/90 bg-chetya-panel/50 py-3.5 text-sm font-medium text-chetya-cream shadow-sm transition-colors hover:bg-white/[0.06]"
        >
          Try free — 6 questions with Guru
        </Link>
        <p className="mt-2 text-center text-[11px] leading-relaxed text-chetya-muted/75">
          No email required. Replies are not saved. Sign in anytime for full chat, voice, and saved charts.
        </p>

        <p className="mt-6 text-center text-xs text-chetya-muted/80">
          Passwordless session. Set <code className="text-chetya-muted">CHETYA_JWT_SECRET</code> on the
          server for production.
        </p>
      </div>
    </div>
  );
}
