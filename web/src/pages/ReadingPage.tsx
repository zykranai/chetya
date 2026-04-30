import { useState, type ReactNode } from 'react';
import { generateReading, type ReadingRequest } from '@/api/client';
import { useAuthStore } from '@/store/authStore';

const CONCERNS = [
  { key: 'career', label: 'Career & job' },
  { key: 'marriage', label: 'Marriage & love' },
  { key: 'money', label: 'Money & finance' },
  { key: 'health', label: 'Health' },
  { key: 'family', label: 'Family' },
  { key: 'spiritual', label: 'Spiritual growth' },
  { key: 'general', label: 'Full life reading' },
];

export function ReadingPage() {
  const defaultLang = useAuthStore((s) => s.language);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    dob: '',
    tob: '',
    place: '',
    age: '',
    location_type: 'home' as ReadingRequest['location_type'],
    financial_situation: 'working',
    financial_level: 'medium' as ReadingRequest['financial_level'],
    main_concern: 'general',
    specific_question: '',
    language: defaultLang,
    current_city: '',
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const body: ReadingRequest = {
        ...form,
        age: parseInt(form.age, 10) || 30,
        tob: form.tob || '12:00',
        language: form.language || defaultLang,
      };
      const out = await generateReading(body);
      const payload = out.data as Record<string, unknown> | undefined;
      const reading = payload?.reading;
      const text =
        typeof reading === 'string'
          ? reading
          : reading
            ? JSON.stringify(reading, null, 2)
            : JSON.stringify(payload ?? {}, null, 2);
      setResult(text);
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { detail?: string } }; message?: string };
      setResult(`Error: ${ax.response?.data?.detail || ax.message || 'failed'}`);
    } finally {
      setLoading(false);
    }
  };

  if (result && !result.startsWith('Error:')) {
    return (
      <div className="flex h-full flex-col">
        <header className="border-b border-chetya-border px-4 py-3">
          <h1 className="text-lg font-semibold text-chetya-cream">Your reading</h1>
        </header>
        <div className="flex-1 overflow-y-auto p-4">
          <pre className="mx-auto max-w-4xl whitespace-pre-wrap font-mono text-sm text-chetya-cream/90">
            {result}
          </pre>
        </div>
        <div className="border-t border-chetya-border p-4">
          <button
            type="button"
            onClick={() => setResult(null)}
            className="rounded-xl bg-chetya-border/80 px-4 py-2 text-sm text-chetya-cream hover:bg-chetya-border"
          >
            New reading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-chetya-border px-4 py-3">
        <h1 className="text-lg font-semibold text-chetya-cream">Birth chart reading</h1>
        <p className="text-xs text-chetya-muted">
          Details are saved to your account for guru chat. Requires Google Maps API for place lookup on the
          server.
        </p>
      </header>
      <form
        onSubmit={submit}
        className="flex-1 overflow-y-auto p-4"
      >
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name *">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Age *">
              <input
                required
                type="number"
                min={1}
                max={120}
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                className="input"
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date of birth * (DD/MM/YYYY)">
              <input
                required
                placeholder="15/03/1995"
                value={form.dob}
                onChange={(e) => setForm({ ...form, dob: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Time of birth (24h)">
              <input
                placeholder="14:30"
                value={form.tob}
                onChange={(e) => setForm({ ...form, tob: e.target.value })}
                className="input"
              />
            </Field>
          </div>
          <Field label="Birth place *">
            <input
              required
              placeholder="City, Country"
              value={form.place}
              onChange={(e) => setForm({ ...form, place: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Current city (optional)">
            <input
              value={form.current_city}
              onChange={(e) => setForm({ ...form, current_city: e.target.value })}
              className="input"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Location">
              <select
                value={form.location_type}
                onChange={(e) =>
                  setForm({ ...form, location_type: e.target.value as ReadingRequest['location_type'] })
                }
                className="input"
              >
                <option value="home">Home / hometown</option>
                <option value="away">Different city</option>
                <option value="abroad">Abroad</option>
              </select>
            </Field>
            <Field label="Situation">
              <select
                value={form.financial_situation}
                onChange={(e) => setForm({ ...form, financial_situation: e.target.value })}
                className="input"
              >
                <option value="student">Student</option>
                <option value="working">Job / service</option>
                <option value="business">Business</option>
                <option value="homemaker">Homemaker</option>
                <option value="struggling">Going through difficulty</option>
                <option value="retired">Retired</option>
              </select>
            </Field>
            <Field label="Budget level">
              <select
                value={form.financial_level}
                onChange={(e) =>
                  setForm({ ...form, financial_level: e.target.value as ReadingRequest['financial_level'] })
                }
                className="input"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </Field>
          </div>
          <Field label="Main concern">
            <select
              value={form.main_concern}
              onChange={(e) => setForm({ ...form, main_concern: e.target.value })}
              className="input"
            >
              {CONCERNS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Specific question (optional)">
            <textarea
              rows={3}
              value={form.specific_question}
              onChange={(e) => setForm({ ...form, specific_question: e.target.value })}
              className="input resize-y"
            />
          </Field>
          <Field label="Reading language">
            <input
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
              className="input"
              placeholder="en, hi, hinglish…"
            />
          </Field>
          {result?.startsWith('Error:') && (
            <p className="rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-200">{result}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-chetya-gold py-3 font-semibold text-chetya-bg hover:brightness-110 disabled:opacity-50"
          >
            {loading ? 'Generating…' : 'Generate reading'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-chetya-muted">{label}</label>
      {children}
    </div>
  );
}
