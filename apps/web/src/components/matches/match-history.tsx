import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { ApiMatch } from '@/lib/api-types';
import Image from 'next/image';

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
  groupByRound?: boolean;
};

function MatchRow({ m, teamId }: { m: ApiMatch; teamId?: string }) {
  return (
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
          <Image src={m.homeTeam.logo} alt="" className="size-4 object-contain" loading="lazy" width={32} height={32} />
        )}
        <span className={cn('truncate font-medium', m.homeTeam.externalId === teamId && 'font-bold')}>
          {m.homeTeam.name}
        </span>
        <span className="shrink-0 text-muted-foreground">vs</span>
        <span className={cn('truncate font-medium', m.awayTeam.externalId === teamId && 'font-bold')}>
          {m.awayTeam.name}
        </span>
        {m.awayTeam.logo && (
          <Image src={m.awayTeam.logo} alt="" className="size-4 object-contain" loading="lazy" width={32} height={32} />
        )}
      </div>

      <div className="shrink-0">
        <ResultPill match={m} teamId={teamId} />
      </div>
    </Link>
  );
}

export function MatchHistory({ matches, teamId, emptyMessage = 'No matches found.', groupByRound = false }: Props) {
  if (!matches.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const hasRounds = groupByRound && matches.some((m) => m.round != null);

  if (!hasRounds) {
    return (
      <div className="divide-y divide-border/40">
        {matches.map((m) => <MatchRow key={m.id} m={m} teamId={teamId} />)}
      </div>
    );
  }

  const groups = new Map<string, ApiMatch[]>();
  for (const m of matches) {
    const key = m.round != null ? `Journée ${m.round}` : 'Autres';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }

  const entries = Array.from(groups.entries());

  return (
    <div className="flex flex-col">
      {entries.map(([label, group], i) => (
        <section key={label}>
          {i > 0 && <div className="border-t border-border/60 my-1" />}
          <div className="flex items-center gap-3 px-1 py-2">
            <span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground whitespace-nowrap">
              {label}
            </span>
            <div className="h-px flex-1 bg-border/40" />
          </div>
          <div className="divide-y divide-border/40">
            {group.map((m) => <MatchRow key={m.id} m={m} teamId={teamId} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
