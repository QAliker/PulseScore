import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { ApiMatch } from '@/lib/api-types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function ResultPill({ match, teamId }: { match: ApiMatch; teamId?: string }) {
  if (match.status !== 'FINISHED' || match.homeScore == null || match.awayScore == null) {
    return <span className="text-xs text-muted-foreground">{match.status}</span>;
  }

  const isHome = match.homeTeam.externalId === teamId;
  const isAway = match.awayTeam.externalId === teamId;
  let result: 'W' | 'D' | 'L' | null = null;

  if (teamId && (isHome || isAway)) {
    const scored = isHome ? match.homeScore : match.awayScore;
    const conceded = isHome ? match.awayScore : match.homeScore;
    result = scored > conceded ? 'W' : scored < conceded ? 'L' : 'D';
  }

  return (
    <div className="flex items-center gap-2">
      {result && (
        <span
          className={cn(
            'rounded px-1.5 py-0.5 text-[0.65rem] font-bold',
            result === 'W' && 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
            result === 'D' && 'bg-muted text-muted-foreground',
            result === 'L' && 'bg-red-500/15 text-red-600 dark:text-red-400',
          )}
        >
          {result}
        </span>
      )}
      <span className="tabular font-bold">
        {match.homeScore} – {match.awayScore}
      </span>
    </div>
  );
}

type Props = {
  matches: ApiMatch[];
  teamId?: string;
  emptyMessage?: string;
};

export function MatchHistory({ matches, teamId, emptyMessage = 'No matches found.' }: Props) {
  if (!matches.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="divide-y divide-border/40">
      {matches.map((m) => (
        <Link
          key={m.id}
          href={`/match/${m.id}`}
          className="flex items-center justify-between gap-3 px-1 py-3 text-sm transition-colors hover:bg-accent/40"
        >
          <span className="w-24 shrink-0 text-[0.68rem] text-muted-foreground">
            {formatDate(m.startTime)}
          </span>

          <div className="flex min-w-0 flex-1 items-center gap-2">
            {m.homeTeam.logo && (
              <img src={m.homeTeam.logo} alt="" className="size-4 object-contain" loading="lazy" />
            )}
            <span
              className={cn(
                'truncate font-medium',
                m.homeTeam.externalId === teamId && 'font-bold',
              )}
            >
              {m.homeTeam.name}
            </span>
            <span className="shrink-0 text-muted-foreground">vs</span>
            <span
              className={cn(
                'truncate font-medium',
                m.awayTeam.externalId === teamId && 'font-bold',
              )}
            >
              {m.awayTeam.name}
            </span>
            {m.awayTeam.logo && (
              <img src={m.awayTeam.logo} alt="" className="size-4 object-contain" loading="lazy" />
            )}
          </div>

          <div className="shrink-0">
            <ResultPill match={m} teamId={teamId} />
          </div>
        </Link>
      ))}
    </div>
  );
}
