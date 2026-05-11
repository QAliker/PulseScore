import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { ApiMatch } from '@/lib/api-types';
import Image from 'next/image';

function formatShortDate(iso: string): { day: string; month: string } {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString('en-GB', { day: 'numeric' }),
    month: d.toLocaleDateString('en-GB', { month: 'short' }),
  };
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

type Props = {
  matches: ApiMatch[];
  teamId?: string;
  emptyMessage?: string;
  groupByRound?: boolean;
};

function MatchRow({ m, teamId }: { m: ApiMatch; teamId?: string }) {
  const isFinished = m.status === 'FINISHED' && m.homeScore != null && m.awayScore != null;
  const homeWon = isFinished && m.homeScore! > m.awayScore!;
  const awayWon = isFinished && m.awayScore! > m.homeScore!;
  const isDraw = isFinished && !homeWon && !awayWon;

  const isHomeTeam = teamId != null && m.homeTeam.externalId === teamId;
  const isAwayTeam = teamId != null && m.awayTeam.externalId === teamId;
  let result: 'W' | 'D' | 'L' | null = null;
  if (isFinished && (isHomeTeam || isAwayTeam)) {
    const scored = isHomeTeam ? m.homeScore! : m.awayScore!;
    const conceded = isHomeTeam ? m.awayScore! : m.homeScore!;
    result = scored > conceded ? 'W' : scored < conceded ? 'L' : 'D';
  }

  const { day, month } = formatShortDate(m.startTime);

  return (
    <Link
      href={`/match/${m.id}`}
      className="grid grid-cols-[2.5rem_1fr_5rem_1fr_1.5rem] items-center gap-x-3 px-3 py-2.5 transition-colors hover:bg-accent/40"
    >
      {/* Stacked date */}
      <div className="flex flex-col items-center text-center leading-none">
        <span className="text-[0.72rem] font-semibold text-primary/60">{day}</span>
        <span className="mt-0.5 text-[0.55rem] uppercase tracking-widest text-muted-foreground/50">{month}</span>
      </div>

      {/* Home team — right-aligned */}
      <div className="flex min-w-0 items-center justify-end gap-2">
        <span
          className={cn(
            'truncate text-[0.82rem]',
            !isFinished && 'font-medium text-foreground',
            isFinished && homeWon && 'font-bold text-foreground',
            isFinished && awayWon && 'font-medium text-muted-foreground/55',
            isFinished && isDraw && 'font-semibold text-foreground/75',
          )}
        >
          {m.homeTeam.name}
        </span>
        {m.homeTeam.logo ? (
          <Image
            src={m.homeTeam.logo}
            alt=""
            className={cn('size-5 shrink-0 object-contain', isFinished && awayWon && 'opacity-50')}
            width={32}
            height={32}
            loading="lazy"
          />
        ) : (
          <div className="size-5 shrink-0 rounded-full bg-muted" />
        )}
      </div>

      {/* Score / time — the hero */}
      <div className="flex items-center justify-center gap-1 tabular-nums">
        {isFinished ? (
          <>
            <span
              className={cn(
                'text-lg font-extrabold leading-none',
                homeWon ? 'text-primary' : isDraw ? 'text-foreground/70' : 'text-muted-foreground/40',
              )}
            >
              {m.homeScore}
            </span>
            <span className="text-[0.65rem] text-primary/20">–</span>
            <span
              className={cn(
                'text-lg font-extrabold leading-none',
                awayWon ? 'text-primary' : isDraw ? 'text-foreground/70' : 'text-muted-foreground/40',
              )}
            >
              {m.awayScore}
            </span>
          </>
        ) : (
          <span className="text-xs font-semibold text-muted-foreground">
            {m.status === 'SCHEDULED' ? formatTime(m.startTime) : m.status}
          </span>
        )}
      </div>

      {/* Away team — left-aligned */}
      <div className="flex min-w-0 items-center gap-2">
        {m.awayTeam.logo ? (
          <Image
            src={m.awayTeam.logo}
            alt=""
            className={cn('size-5 shrink-0 object-contain', isFinished && homeWon && 'opacity-50')}
            width={32}
            height={32}
            loading="lazy"
          />
        ) : (
          <div className="size-5 shrink-0 rounded-full bg-muted" />
        )}
        <span
          className={cn(
            'truncate text-[0.82rem]',
            !isFinished && 'font-medium text-foreground',
            isFinished && awayWon && 'font-bold text-foreground',
            isFinished && homeWon && 'font-medium text-muted-foreground/55',
            isFinished && isDraw && 'font-semibold text-foreground/75',
          )}
        >
          {m.awayTeam.name}
        </span>
      </div>

      {/* W/D/L badge (team context only) */}
      <div className="flex justify-center">
        {result && (
          <span
            className={cn(
              'inline-flex h-5 w-5 items-center justify-center rounded text-[0.58rem] font-bold',
              result === 'W' && 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
              result === 'D' && 'bg-muted text-muted-foreground',
              result === 'L' && 'bg-red-500/15 text-red-600 dark:text-red-400',
            )}
          >
            {result}
          </span>
        )}
      </div>
    </Link>
  );
}

export function MatchHistory({
  matches,
  teamId,
  emptyMessage = 'No matches found.',
  groupByRound = false,
}: Props) {
  if (!matches.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const hasRounds = groupByRound && matches.some((m) => m.round != null);

  if (!hasRounds) {
    return (
      <div className="divide-y divide-border/40">
        {matches.map((m) => (
          <MatchRow key={m.id} m={m} teamId={teamId} />
        ))}
      </div>
    );
  }

  const groups = new Map<number | null, ApiMatch[]>();
  for (const m of matches) {
    const key = m.round ?? null;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }

  const entries = Array.from(groups.entries()).sort((a, b) => {
    if (a[0] == null) return 1;
    if (b[0] == null) return -1;
    return b[0] - a[0];
  });

  return (
    <div className="flex flex-col">
      {entries.map(([round, group], i) => (
        <section key={round ?? 'other'}>
          <div
            className={cn(
              'flex items-baseline gap-2 px-3 pb-1.5 pt-4',
              i === 0 && 'pt-3',
            )}
          >
            <span className="text-[0.58rem] font-bold uppercase tracking-[0.22em] text-primary/35">
              Journée
            </span>
            <span className="font-display text-sm font-extrabold text-primary/30">
              {round ?? '—'}
            </span>
          </div>
          <div className="divide-y divide-border/40">
            {group.map((m) => (
              <MatchRow key={m.id} m={m} teamId={teamId} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
