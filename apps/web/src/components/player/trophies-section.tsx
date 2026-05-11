import type { ApiTrophy } from '@/lib/api-types';

type Props = { trophies: ApiTrophy[] };

const WINNERS_LABEL = 'Winner';

export function TrophiesSection({ trophies }: Props) {
  if (trophies.length === 0) {
    return (
      <p className="px-4 py-6 text-sm italic text-muted-foreground sm:px-6">
        No trophy records found.
      </p>
    );
  }

  const winners = trophies.filter((t) => t.place === WINNERS_LABEL);
  const others = trophies.filter((t) => t.place !== WINNERS_LABEL);
  const sorted = [...winners, ...others];

  return (
    <div className="flex flex-col divide-y divide-border/40 px-4 sm:px-6">
      {sorted.map((trophy, i) => (
        <div key={i} className="flex items-center justify-between gap-3 py-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm font-semibold leading-snug">{trophy.league}</span>
            <span className="text-[0.72rem] text-muted-foreground">
              {trophy.country} · {trophy.season}
            </span>
          </div>

          <span
            className={`shrink-0 rounded px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em] ${
              trophy.place === WINNERS_LABEL
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {trophy.place}
          </span>
        </div>
      ))}
    </div>
  );
}
