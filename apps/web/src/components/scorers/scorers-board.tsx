import Link from 'next/link';
import Image from 'next/image';
import { Goal } from 'lucide-react';
import type { ApiScorer } from '@/lib/api-types';
import type { League } from '@/lib/leagues';

type Props = { scorers: ApiScorer[]; league: League };

// Goals are THE metric here — rendered in pitch-green throughout.
const GOAL_INK = 'text-[oklch(0.45_0.15_145)] dark:text-[oklch(0.78_0.16_145)]';
const GOAL_FILL = 'bg-[oklch(0.56_0.16_145)] dark:bg-[oklch(0.66_0.17_145)]';

function Crest({ src, alt, size = 28 }: { src: string | null; alt: string; size?: number }) {
  if (!src)
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-full bg-muted text-[0.6rem] font-bold text-muted-foreground"
        style={{ width: size, height: size }}
      >
        {alt.slice(0, 2).toUpperCase()}
      </span>
    );
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="shrink-0 object-contain"
      unoptimized
    />
  );
}

function TeamWrap({
  teamId,
  children,
}: {
  teamId: string | null;
  children: React.ReactNode;
}) {
  if (!teamId) return <>{children}</>;
  return (
    <Link
      href={`/teams/${teamId}`}
      className="transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
    >
      {children}
    </Link>
  );
}

export function ScorersBoard({ scorers, league }: Props) {
  if (scorers.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border/60 bg-card px-6 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted/60">
          <Goal className="size-6 text-muted-foreground" />
        </div>
        <p className="font-display text-lg font-extrabold tracking-tight">No scorers yet</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          The {league.name} scorers ranking will appear after the season&apos;s first goals.
        </p>
      </div>
    );
  }

  const [leader, ...rest] = scorers;
  const maxGoals = leader.goals || 1;

  return (
    <section className="flex flex-col gap-5">
      {/* Section heading — editorial, not a card */}
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-xl font-extrabold uppercase tracking-tight">
          Top scorers
        </h2>
        <span className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {league.season}
        </span>
      </div>

      {/* Leader feature */}
      <article className="relative overflow-hidden rounded-2xl border border-border/60 bg-card">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-4 -top-10 select-none font-display text-[9rem] font-black leading-none text-muted-foreground/[0.06] sm:text-[12rem]"
        >
          01
        </span>
        <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex items-center gap-4">
            <TeamWrap teamId={leader.teamId}>
              <Crest src={leader.teamCrest} alt={leader.teamName} size={52} />
            </TeamWrap>
            <div className="flex flex-col gap-0.5">
              <span className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Leader · {leader.playedMatches} matches
              </span>
              <h3 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                {leader.playerName}
              </h3>
              <span className="text-sm text-muted-foreground">
                {leader.teamName}
                {leader.nationality ? ` · ${leader.nationality}` : ''}
              </span>
            </div>
          </div>

          <div className="flex items-end gap-5 sm:flex-col sm:items-end sm:gap-1">
            <div className="flex items-baseline gap-2">
              <span className={`font-display text-6xl font-black leading-none tabular ${GOAL_INK} sm:text-7xl`}>
                {leader.goals}
              </span>
              <span className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                goals
              </span>
            </div>
            <div className="flex gap-4 pb-1 text-[0.72rem] text-muted-foreground sm:pb-0">
              {leader.assists != null && (
                <span>
                  <span className="font-bold tabular text-foreground">{leader.assists}</span> assists
                </span>
              )}
              {leader.penalties != null && leader.penalties > 0 && (
                <span>
                  <span className="font-bold tabular text-foreground">{leader.penalties}</span> pens.
                </span>
              )}
            </div>
          </div>
        </div>
      </article>

      {/* The chase */}
      {rest.length > 0 && (
        <ol className="flex flex-col divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/60 bg-card">
          {rest.map((s) => (
            <li
              key={`${s.playerId}-${s.rank}`}
              className="grid grid-cols-[1.75rem_1fr_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40 sm:gap-4 sm:px-5"
            >
              <span className="text-center font-display text-base font-bold tabular text-muted-foreground">
                {s.rank}
              </span>

              <div className="flex min-w-0 items-center gap-3">
                <TeamWrap teamId={s.teamId}>
                  <Crest src={s.teamCrest} alt={s.teamName} size={26} />
                </TeamWrap>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold">{s.playerName}</span>
                  <span className="truncate text-[0.72rem] text-muted-foreground">
                    {s.teamName}
                    {s.penalties != null && s.penalties > 0 ? ` · ${s.penalties} pens.` : ''}
                    {s.assists != null && s.assists > 0 ? ` · ${s.assists} assists` : ''}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* goal bar — goals relative to the leader */}
                <span className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-muted sm:block lg:w-28">
                  <span
                    className={`block h-full rounded-full ${GOAL_FILL}`}
                    style={{ width: `${Math.max(8, (s.goals / maxGoals) * 100)}%` }}
                  />
                </span>
                <span className={`w-7 text-right font-display text-xl font-extrabold tabular ${GOAL_INK}`}>
                  {s.goals}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
