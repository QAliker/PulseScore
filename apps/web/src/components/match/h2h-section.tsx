/* eslint-disable jsx-a11y/role-has-required-aria-props */
import { cn } from '@/lib/utils';
import type { H2HStats, Match } from '@/lib/types';

type Props = {
  h2h: H2HStats;
  match: Match;
};

function formatH2HDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
}

function ResultPill({ result }: { result: 'W' | 'D' | 'L' }) {
  return (
    <span
      className={cn(
        'inline-flex size-5 items-center justify-center rounded text-[0.62rem] font-bold',
        result === 'W' && 'bg-live/15 text-live',
        result === 'D' && 'bg-muted text-muted-foreground',
        result === 'L' && 'bg-destructive/10 text-destructive',
      )}
    >
      {result}
    </span>
  );
}

export function H2HSection({ h2h, match }: Props) {
  const total = h2h.homeWins + h2h.draws + h2h.awayWins;
  const homeWinPct = total ? (h2h.homeWins / total) * 100 : 33;
  const drawPct = total ? (h2h.draws / total) * 100 : 34;

  return (
    <div className="flex flex-col gap-5">
      {/* Summary bar */}
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-3 text-sm">
          <div>
            <p className="font-display text-2xl font-extrabold tabular text-home">{h2h.homeWins}</p>
            <p className="text-[0.68rem] uppercase tracking-wider text-muted-foreground truncate">{match.home.shortName} wins</p>
          </div>
          <div className="text-center">
            <p className="font-display text-2xl font-extrabold tabular text-muted-foreground">{h2h.draws}</p>
            <p className="text-[0.68rem] uppercase tracking-wider text-muted-foreground">Draws</p>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-extrabold tabular text-away">{h2h.awayWins}</p>
            <p className="text-[0.68rem] uppercase tracking-wider text-muted-foreground truncate">{match.away.shortName} wins</p>
          </div>
        </div>

        {/* Segmented progress bar */}
        <div className="flex h-1.5 overflow-hidden rounded-full bg-muted" role="meter" aria-label="Head-to-head record">
          <div className="bg-home transition-all" style={{ width: `${homeWinPct}%` }} />
          <div className="bg-muted-foreground/30 transition-all" style={{ width: `${drawPct}%` }} />
          <div className="bg-away transition-all" style={{ width: `${100 - homeWinPct - drawPct}%` }} />
        </div>
      </div>

      {/* Match list */}
      <div className="flex flex-col divide-y divide-border/50">
        {h2h.matches.map((m) => {
          const isHomeAtHome = m.homeTeamId === match.home.id;
          const homeTeamScore = isHomeAtHome ? m.homeScore : m.awayScore;
          const awayTeamScore = isHomeAtHome ? m.awayScore : m.homeScore;
          const result: 'W' | 'D' | 'L' =
            homeTeamScore > awayTeamScore ? 'W' : homeTeamScore < awayTeamScore ? 'L' : 'D';

          return (
            <div key={m.id} className="grid grid-cols-[auto_1fr_auto_1fr_auto] items-center gap-2 py-2.5 text-sm">
              {/* Date */}
              <span className="w-16 shrink-0 text-[0.68rem] tabular text-muted-foreground">
                {formatH2HDate(m.date)}
              </span>

              {/* Home team */}
              <span
                className={cn(
                  'truncate text-right text-xs font-medium',
                  m.homeTeamId === match.home.id ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {m.homeTeamName}
              </span>

              {/* Score */}
              <span className="font-display font-bold tabular whitespace-nowrap px-1">
                {m.homeScore}
                <span className="mx-0.5 text-muted-foreground/50">–</span>
                {m.awayScore}
              </span>

              {/* Away team */}
              <span
                className={cn(
                  'truncate text-xs font-medium',
                  m.awayTeamId === match.away.id ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {m.awayTeamName}
              </span>

              {/* Result pill relative to match.home */}
              <ResultPill result={result} />
            </div>
          );
        })}
      </div>

      <p className="text-[0.65rem] text-muted-foreground">
        Result shown from {match.home.name}&apos;s perspective.
      </p>
    </div>
  );
}
