import type { ApiSidelined } from '@/lib/api-types';

type Props = { sidelined: ApiSidelined[] };

function formatDateRange(start: string, end: string | null): string {
  const s = new Date(start).toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric',
  });
  if (!end) return `${s} – present`;
  const e = new Date(end).toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric',
  });
  return `${s} – ${e}`;
}

export function SidelinedSection({ sidelined }: Props) {
  if (sidelined.length === 0) {
    return (
      <p className="px-4 py-6 text-sm italic text-muted-foreground sm:px-6">
        No sidelined records found.
      </p>
    );
  }

  const sorted = sidelined
    .slice()
    .sort((a, b) => b.start.localeCompare(a.start));

  return (
    <div className="flex flex-col divide-y divide-border/40 px-4 sm:px-6">
      {sorted.map((entry, i) => {
        const isOngoing = !entry.end;
        return (
          <div key={i} className="flex items-center justify-between gap-3 py-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold leading-snug">{entry.type}</span>
              <time className="text-[0.72rem] tabular text-muted-foreground">
                {formatDateRange(entry.start, entry.end)}
              </time>
            </div>

            {isOngoing && (
              <span className="shrink-0 rounded bg-live/12 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-live">
                Ongoing
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
