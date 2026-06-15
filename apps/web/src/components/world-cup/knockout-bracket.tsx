import Image from 'next/image';
import { cn } from '@/lib/utils';
import { APP_TZ } from '@/lib/format';
import type { ApiMatch } from '@/lib/api-types';
import { KNOCKOUT_STAGES, stageLabel } from './stage-labels';

// ─── Match card sub-components ───────────────────────────────────────────────

function TeamRow({
  name,
  logo,
  score,
  won,
  isScheduled,
}: {
  name: string;
  logo: string | null;
  score: number | null;
  won: boolean;
  isScheduled: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 px-2.5 py-1.5',
        won && 'bg-primary/5',
      )}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        {logo ? (
          <Image
            src={logo}
            alt={name}
            width={16}
            height={16}
            className="h-4 w-4 shrink-0 object-contain"
            unoptimized
          />
        ) : (
          <span className="h-4 w-4 shrink-0 rounded-full bg-muted" />
        )}
        <span
          className={cn(
            'truncate text-[0.78rem] leading-tight',
            won ? 'font-bold text-foreground' : 'font-medium',
            isScheduled && 'text-muted-foreground',
          )}
        >
          {name || 'TBD'}
        </span>
      </span>
      <span
        className={cn(
          'shrink-0 tabular-nums text-[0.78rem]',
          won ? 'font-bold text-foreground' : 'text-muted-foreground/70',
          isScheduled && 'text-muted-foreground/40',
        )}
      >
        {score != null ? score : '–'}
      </span>
    </div>
  );
}

function MatchCard({
  match,
  isFinal = false,
}: {
  match: ApiMatch;
  isFinal?: boolean;
}) {
  const isFinished = match.status === 'FINISHED';
  const isScheduled = match.status === 'SCHEDULED';
  const isLive = match.status === 'LIVE';

  const homeWon =
    isFinished &&
    (match.winner === 'HOME_TEAM' ||
      (match.homeScore != null &&
        match.awayScore != null &&
        match.homeScore > match.awayScore));
  const awayWon =
    isFinished &&
    (match.winner === 'AWAY_TEAM' ||
      (match.homeScore != null &&
        match.awayScore != null &&
        match.awayScore > match.homeScore));

  return (
    <div
      className={cn(
        'group overflow-hidden rounded-lg border transition-all duration-150',
        // base
        'border-border/60 bg-card',
        // hover lift
        'hover:border-border hover:shadow-sm',
        // Final gold ring accent
        isFinal && 'border-amber-400/40 ring-1 ring-amber-400/30 shadow-amber-400/10 shadow-md',
        isFinal && 'hover:ring-amber-400/50 hover:border-amber-400/60',
        // Live pulse
        isLive && 'border-emerald-500/40',
        // Unplayed / TBD dimming
        isScheduled && 'opacity-80',
      )}
    >
      {/* Status bar (live only) */}
      {isLive && (
        <div className="flex items-center gap-1.5 border-b border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-[0.6rem] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            Live
          </span>
          {match.progress && (
            <span className="ml-auto text-[0.6rem] tabular-nums text-emerald-600/70 dark:text-emerald-400/70">
              {match.progress}
            </span>
          )}
        </div>
      )}

      {/* Scheduled hint */}
      {isScheduled && (
        <div className="border-b border-border/30 bg-muted/30 px-2.5 py-0.5 text-center">
          <span className="text-[0.6rem] tabular-nums text-muted-foreground/60">
            {new Date(match.startTime).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              timeZone: APP_TZ,
            })}{' '}
            ·{' '}
            {new Date(match.startTime).toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: APP_TZ,
            })}
          </span>
        </div>
      )}

      <TeamRow
        name={match.homeTeam.name}
        logo={match.homeTeam.logo}
        score={match.homeScore}
        won={homeWon}
        isScheduled={isScheduled}
      />
      <div className="border-t border-border/40" />
      <TeamRow
        name={match.awayTeam.name}
        logo={match.awayTeam.logo}
        score={match.awayScore}
        won={awayWon}
        isScheduled={isScheduled}
      />
    </div>
  );
}

// ─── Column header ────────────────────────────────────────────────────────────

function RoundHeader({ label, isFinal }: { label: string; isFinal?: boolean }) {
  return (
    <h3
      className={cn(
        'mb-3 text-center text-[0.6rem] font-bold uppercase tracking-[0.18em]',
        isFinal
          ? 'text-amber-500 dark:text-amber-400'
          : 'text-muted-foreground/70',
      )}
    >
      {label}
    </h3>
  );
}

// ─── Connector lines between rounds ──────────────────────────────────────────
// Each pair of matches feeds into one in the next round; we render vertical
// guide lines alongside the right edge of every non-final column.

function ConnectorLines({ count }: { count: number }) {
  // `count` = number of matches in THIS column (left side of the connector).
  // We draw `count / 2` bracket-pairs.
  const pairs = Math.ceil(count / 2);
  return (
    <div className="flex flex-col justify-around" aria-hidden>
      {Array.from({ length: pairs }).map((_, i) => (
        <div key={i} className="relative flex h-[4.5rem] w-5 items-center justify-center">
          {/* top arm */}
          <span className="absolute left-0 top-1/4 h-px w-full bg-border/50" />
          {/* bottom arm */}
          <span className="absolute bottom-1/4 left-0 h-px w-full bg-border/50" />
          {/* vertical bridge on the right */}
          <span className="absolute right-0 top-1/4 h-1/2 w-px bg-border/50" />
        </div>
      ))}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function KnockoutBracket({ matches }: { matches: ApiMatch[] }) {
  const knockout = matches.filter(
    (m) =>
      m.stage != null &&
      KNOCKOUT_STAGES.includes(m.stage as (typeof KNOCKOUT_STAGES)[number]),
  );
  const thirdPlace = matches.filter((m) => m.stage === 'THIRD_PLACE');

  if (knockout.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        The bracket will be set once the group stage is complete.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Bracket scroll container ── */}
      <div
        className="flex items-stretch gap-0 overflow-x-auto pb-3 pt-1"
        style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        {KNOCKOUT_STAGES.map((stage, colIdx) => {
          const isFinalStage = stage === 'FINAL';
          const stageMatches = knockout
            .filter((m) => m.stage === stage)
            .sort(
              (a, b) =>
                new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
            );

          if (stageMatches.length === 0) return null;

          const prevStage = colIdx > 0 ? KNOCKOUT_STAGES[colIdx - 1] : null;
          const prevCount = prevStage
            ? knockout.filter((m) => m.stage === prevStage).length
            : 0;
          const showConnector = !isFinalStage && prevCount > stageMatches.length;

          return (
            <div key={stage} className="flex shrink-0 items-stretch">
              {/* Connector from previous round */}
              {colIdx > 0 && prevCount > 0 && (
                <ConnectorLines count={prevCount} />
              )}

              {/* Round column */}
              <div
                className={cn(
                  'flex flex-col',
                  isFinalStage ? 'min-w-[200px] max-w-[220px]' : 'min-w-[180px] max-w-[200px]',
                )}
              >
                <RoundHeader label={stageLabel(stage)} isFinal={isFinalStage} />
                <div
                  className={cn(
                    'flex flex-1 flex-col gap-3',
                    isFinalStage ? 'justify-center' : 'justify-around',
                  )}
                >
                  {stageMatches.map((m) => (
                    <MatchCard key={m.id} match={m} isFinal={isFinalStage} />
                  ))}
                </div>
              </div>

              {/* Connector after this column (before the next) */}
              {showConnector && <ConnectorLines count={stageMatches.length} />}
            </div>
          );
        })}
      </div>

      {/* ── Third-place playoff ── */}
      {thirdPlace.length > 0 && (
        <div className="mx-auto w-full max-w-[220px]">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-px flex-1 bg-border/40" />
            <h3 className="text-center text-[0.6rem] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">
              {stageLabel('THIRD_PLACE')}
            </h3>
            <div className="h-px flex-1 bg-border/40" />
          </div>
          {thirdPlace.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      )}
    </div>
  );
}
