import type { ReactNode } from 'react';

/** Shape returned by the backend reading generator (`reading` field). */

export type ReadingRemedyBlock = {
  type?: string;
  title?: string;
  description?: string;
  shastra_basis?: string;
  is_optional?: boolean;
} | null;

export type ReadingJson = {
  opening?: string;
  current_season?: string;
  concern_response?: string;
  guidance?: string;
  remedies?: {
    free?: ReadingRemedyBlock;
    affordable?: ReadingRemedyBlock;
    elevated?: ReadingRemedyBlock;
  };
  closing?: string;
  shastra_citations?: string[];
  frameworks_used?: string[];
};

export type ChartSummaryLite = {
  lagna?: string;
  moon_sign?: string;
  moon_nakshatra?: string;
  current_dasha?: unknown;
  active_yogas?: string[];
};

function isRemedyBlock(v: unknown): v is NonNullable<ReadingRemedyBlock> {
  return v != null && typeof v === 'object';
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-chetya-border/60 bg-chetya-panel/30 p-4 shadow-sm backdrop-blur-sm">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-chetya-gold/90">{title}</h2>
      <div className="text-[15px] leading-relaxed text-chetya-cream/95">{children}</div>
    </section>
  );
}

function RemedyCard({
  badge,
  block,
}: {
  badge: string;
  block: NonNullable<ReadingRemedyBlock>;
}) {
  const title = block.title?.trim() || badge;
  const desc = block.description?.trim();
  const basis = block.shastra_basis?.trim();
  const typ = block.type?.trim();
  return (
    <div className="rounded-xl border border-chetya-border/50 bg-chetya-bg/60 p-4">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="rounded-md bg-chetya-gold/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-chetya-gold">
          {badge}
        </span>
        {typ && <span className="text-[11px] text-chetya-muted">{typ}</span>}
      </div>
      <h3 className="mt-2 font-semibold text-chetya-cream">{title}</h3>
      {desc && <p className="mt-2 text-sm leading-relaxed text-chetya-cream/90">{desc}</p>}
      {basis && (
        <p className="mt-3 border-t border-chetya-border/40 pt-3 text-xs italic leading-relaxed text-chetya-muted">
          {basis}
        </p>
      )}
    </div>
  );
}

export function ReadingDisplay({
  reading,
  chartSummary,
  generatedAt,
}: {
  reading: ReadingJson;
  chartSummary?: ChartSummaryLite | null;
  generatedAt?: string | null;
}) {
  const remedies = reading.remedies ?? {};
  const tiers: { key: keyof typeof remedies; label: string }[] = [
    { key: 'free', label: 'Free / daily' },
    { key: 'affordable', label: 'Affordable' },
    { key: 'elevated', label: 'Optional (advanced)' },
  ];

  const summaryBits: string[] = [];
  if (chartSummary?.lagna) summaryBits.push(`${chartSummary.lagna} Lagna`);
  if (chartSummary?.moon_sign) summaryBits.push(`Moon · ${chartSummary.moon_sign}`);
  if (chartSummary?.moon_nakshatra) summaryBits.push(chartSummary.moon_nakshatra);
  const yogas = chartSummary?.active_yogas?.slice(0, 4);
  const generatedLabel =
    generatedAt &&
    (() => {
      const d = new Date(generatedAt);
      return Number.isNaN(d.getTime()) ? null : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    })();

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-8">
      {(summaryBits.length > 0 || generatedLabel) && (
        <div className="rounded-xl border border-chetya-border/50 bg-white/[0.03] px-4 py-3 text-sm text-chetya-muted">
          {summaryBits.length > 0 && <p className="text-chetya-cream/90">{summaryBits.join(' · ')}</p>}
          {yogas && yogas.length > 0 && (
            <p className="mt-1 text-xs text-chetya-muted">Notable yogas: {yogas.join(', ')}</p>
          )}
          {generatedLabel && <p className="mt-2 text-xs text-chetya-muted">Generated {generatedLabel}</p>}
        </div>
      )}

      {reading.opening?.trim() && <Section title="Overview">{reading.opening.trim()}</Section>}
      {reading.current_season?.trim() && (
        <Section title="This season">{reading.current_season.trim()}</Section>
      )}
      {reading.concern_response?.trim() && (
        <Section title="Your question">{reading.concern_response.trim()}</Section>
      )}
      {reading.guidance?.trim() && <Section title="Guidance">{reading.guidance.trim()}</Section>}

      {tiers.some((t) => isRemedyBlock(remedies[t.key])) && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-chetya-gold/90">Remedies</h2>
          <p className="text-xs leading-relaxed text-chetya-muted">
            Practical steps from classical Jyotisha — start with what fits your life; nothing here replaces medical or legal advice.
          </p>
          <div className="grid gap-3 sm:grid-cols-1">
            {tiers.map(({ key, label }) => {
              const block = remedies[key];
              if (!isRemedyBlock(block)) return null;
              return <RemedyCard key={key} badge={label} block={block} />;
            })}
          </div>
        </section>
      )}

      {reading.closing?.trim() && (
        <blockquote className="border-l-2 border-chetya-gold/50 pl-4 text-[15px] italic leading-relaxed text-chetya-cream/90">
          {reading.closing.trim()}
        </blockquote>
      )}

      {(reading.shastra_citations?.length || reading.frameworks_used?.length) && (
        <details className="rounded-xl border border-chetya-border/40 bg-chetya-bg/40 px-4 py-3 text-sm text-chetya-muted">
          <summary className="cursor-pointer select-none text-chetya-cream/80">Sources & frameworks</summary>
          {reading.frameworks_used && reading.frameworks_used.length > 0 && (
            <p className="mt-3 text-xs leading-relaxed">
              <span className="font-medium text-chetya-muted">Frameworks: </span>
              {reading.frameworks_used.join(', ')}
            </p>
          )}
          {reading.shastra_citations && reading.shastra_citations.length > 0 && (
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed">
              {reading.shastra_citations.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}
        </details>
      )}
    </div>
  );
}

/** Accepts full POST `/reading/generate` JSON (`{ success, data }`) or the inner `data` object. */
export function parseReadingPayload(raw: unknown): {
  reading: ReadingJson;
  chartSummary?: ChartSummaryLite;
  generatedAt?: string;
} | null {
  if (!raw || typeof raw !== 'object') return null;
  const envelope = raw as Record<string, unknown>;
  const inner = (envelope.data ?? envelope) as Record<string, unknown>;
  const reading = inner.reading;
  if (!reading || typeof reading !== 'object') return null;
  const cs = inner.chart_summary;
  const chartSummary =
    cs && typeof cs === 'object' ? (cs as ChartSummaryLite) : undefined;
  const generatedAt =
    typeof inner.generated_at === 'string' ? inner.generated_at : undefined;
  return {
    reading: reading as ReadingJson,
    chartSummary,
    generatedAt,
  };
}
