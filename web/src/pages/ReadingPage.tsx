import { useState, useId, type ReactNode } from 'react';
import { generateReading, type ReadingRequest } from '@/api/client';
import {
  ReadingDisplay,
  parseReadingPayload,
  type ChartSummaryLite,
  type ReadingJson,
} from '@/components/ReadingDisplay';
import { friendlyApiError } from '@/lib/apiErrors';
import { APP_LANGUAGES } from '@/constants/languages';
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

type ReadingViewModel = {
  reading: ReadingJson;
  chartSummary?: ChartSummaryLite | null;
  generatedAt?: string;
  rawFallback?: string;
};

export function ReadingPage() {
  const defaultLang = useAuthStore((s) => s.language);
  const baseId = useId();
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [readingView, setReadingView] = useState<ReadingViewModel | null>(null);
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
    setSubmitError(null);
    setReadingView(null);
    try {
      const body: ReadingRequest = {
        ...form,
        age: parseInt(form.age, 10) || 30,
        tob: form.tob || '12:00',
        language: form.language || defaultLang,
      };
      const out = await generateReading(body);
      const parsed = parseReadingPayload(out as Record<string, unknown>);
      if (parsed) {
        setReadingView({
          reading: parsed.reading,
          chartSummary: parsed.chartSummary,
          generatedAt: parsed.generatedAt,
        });
      } else {
        const payload = (out as { data?: Record<string, unknown> }).data ?? (out as Record<string, unknown>);
        const raw =
          typeof payload?.reading === 'string'
            ? payload.reading
            : JSON.stringify(payload ?? out, null, 2);
        setReadingView({
          reading: {},
          rawFallback: raw,
        });
      }
    } catch (e: unknown) {
      setSubmitError(friendlyApiError(e));
    } finally {
      setLoading(false);
    }
  };

  if (readingView) {
    return (
      <div className="flex h-full flex-col bg-chetya-bg">
        <header className="border-b border-chetya-border/60 bg-chetya-bg/90 px-4 py-3 backdrop-blur-md">
          <h1 className="text-[15px] font-semibold tracking-tight text-chetya-cream">Your reading</h1>
          <p className="mt-1 text-xs text-chetya-muted">
            Grounded in your birth data. Continue the conversation in Talk to Guru anytime.
          </p>
        </header>
        <div className="flex-1 overflow-y-auto p-4">
          {readingView.rawFallback ? (
            <div className="mx-auto max-w-2xl space-y-4">
              <p className="text-sm text-chetya-muted">
                We couldn’t lay out this reading in the usual format. Here is the raw response — try generating again
                or contact support if this persists.
              </p>
              <pre className="whitespace-pre-wrap rounded-xl border border-chetya-border/60 bg-chetya-panel/20 p-4 font-mono text-xs text-chetya-cream/85">
                {readingView.rawFallback}
              </pre>
            </div>
          ) : (
            <ReadingDisplay
              reading={readingView.reading}
              chartSummary={readingView.chartSummary}
              generatedAt={readingView.generatedAt}
            />
          )}
        </div>
        <div className="border-t border-chetya-border p-4">
          <button
            type="button"
            onClick={() => setReadingView(null)}
            className="rounded-xl bg-chetya-border/80 px-4 py-2 text-sm text-chetya-cream hover:bg-chetya-border"
          >
            New reading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-chetya-bg">
      <header className="shrink-0 border-b border-chetya-border/60 bg-chetya-bg/90 px-4 py-3 backdrop-blur-md">
        <h1 className="text-[15px] font-semibold tracking-tight text-chetya-cream">Birth chart reading</h1>
        <p className="mt-1 text-xs leading-relaxed text-chetya-muted">
          Your chart is saved to your account so Guru can answer using the same calculations. Place lookup uses Google
          Maps on the server.
        </p>
      </header>
      <form onSubmit={submit} className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name *" fieldId={`${baseId}-name`}>
              <input
                id={`${baseId}-name`}
                required
                autoComplete="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Age *" fieldId={`${baseId}-age`}>
              <input
                id={`${baseId}-age`}
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
            <Field label="Date of birth * (DD/MM/YYYY)" fieldId={`${baseId}-dob`}>
              <input
                id={`${baseId}-dob`}
                required
                placeholder="15/03/1995"
                value={form.dob}
                onChange={(e) => setForm({ ...form, dob: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Time of birth (24h)" fieldId={`${baseId}-tob`}>
              <input
                id={`${baseId}-tob`}
                placeholder="14:30"
                value={form.tob}
                onChange={(e) => setForm({ ...form, tob: e.target.value })}
                className="input"
              />
            </Field>
          </div>
          <Field label="Birth place *" fieldId={`${baseId}-place`}>
            <input
              id={`${baseId}-place`}
              required
              placeholder="City, Country"
              value={form.place}
              onChange={(e) => setForm({ ...form, place: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Current city (optional)" fieldId={`${baseId}-current`}>
            <input
              id={`${baseId}-current`}
              value={form.current_city}
              onChange={(e) => setForm({ ...form, current_city: e.target.value })}
              className="input"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Location" fieldId={`${baseId}-loc`}>
              <select
                id={`${baseId}-loc`}
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
            <Field label="Situation" fieldId={`${baseId}-sit`}>
              <select
                id={`${baseId}-sit`}
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
            <Field label="Budget level" fieldId={`${baseId}-budget`}>
              <select
                id={`${baseId}-budget`}
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
          <Field label="Main concern" fieldId={`${baseId}-concern`}>
            <select
              id={`${baseId}-concern`}
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
          <Field label="Specific question (optional)" fieldId={`${baseId}-q`}>
            <textarea
              id={`${baseId}-q`}
              rows={3}
              value={form.specific_question}
              onChange={(e) => setForm({ ...form, specific_question: e.target.value })}
              className="input resize-y"
            />
          </Field>
          <Field label="Reading language" fieldId={`${baseId}-lang`}>
            <select
              id={`${baseId}-lang`}
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
              className="input"
              aria-label="Language for the generated reading"
            >
              {APP_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </Field>
          {submitError && (
            <p
              className="rounded-lg bg-red-950/40 px-3 py-2 text-sm leading-relaxed text-red-200"
              role="alert"
              aria-live="polite"
            >
              {submitError}
            </p>
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

function Field({ label, fieldId, children }: { label: string; fieldId: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={fieldId} className="mb-1 block text-xs font-medium text-chetya-muted">
        {label}
      </label>
      {children}
    </div>
  );
}
