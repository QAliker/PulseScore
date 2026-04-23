'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { Match, Goalscorer, MatchCardEvent, Substitution } from '@/lib/types';
import { formatKickoff } from '@/lib/format';
import { MatchMinute } from './match-minute';
import { cn } from '@/lib/utils';
import { getLeagueBySlug } from '@/lib/leagues';

// ─── Pitch SVG — top-down view, 1px ≈ 1m (105×68m real pitch) ──────────────

function FootballPitch() {
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 1050 680"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <g stroke="white" strokeWidth="2.5" fill="none" opacity="0.12">
        {/* Outer boundary */}
        <rect x="0" y="0" width="1050" height="680" />
        {/* Halfway line */}
        <line x1="525" y1="0" x2="525" y2="680" />
        {/* Center circle r=91.5 */}
        <circle cx="525" cy="340" r="91.5" />
        {/* Center spot */}
        <circle cx="525" cy="340" r="5" fill="white" stroke="none" opacity="0.2" />

        {/* Left penalty area: 16.5m deep, 40.32m wide centred */}
        <rect x="0" y="138" width="165" height="404" />
        {/* Left 6-yard box: 5.5m deep, 18.32m wide centred */}
        <rect x="0" y="248" width="55" height="184" />
        {/* Left penalty spot at 11m */}
        <circle cx="110" cy="340" r="4" fill="white" stroke="none" opacity="0.2" />
        {/* Left penalty arc: r=91.5 centred on spot, part outside penalty area */}
        <path d="M 165 267 A 91.5 91.5 0 0 1 165 413" />
        {/* Left goal: 7.32m wide, 2.44m deep */}
        <path d="M 0 303 L 24 303 L 24 377 L 0 377" />

        {/* Right penalty area */}
        <rect x="885" y="138" width="165" height="404" />
        {/* Right 6-yard box */}
        <rect x="995" y="248" width="55" height="184" />
        {/* Right penalty spot */}
        <circle cx="940" cy="340" r="4" fill="white" stroke="none" opacity="0.2" />
        {/* Right penalty arc */}
        <path d="M 885 267 A 91.5 91.5 0 0 0 885 413" />
        {/* Right goal */}
        <path d="M 1050 303 L 1026 303 L 1026 377 L 1050 377" />

        {/* Corner arcs r=9.15 */}
        <path d="M 9 0 A 9.15 9.15 0 0 1 0 9" />
        <path d="M 1041 0 A 9.15 9.15 0 0 0 1050 9" />
        <path d="M 1050 671 A 9.15 9.15 0 0 0 1041 680" />
        <path d="M 9 680 A 9.15 9.15 0 0 1 0 671" />
      </g>
    </svg>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isHomeGoal(g: Goalscorer): boolean {
  return (
    g.homeScorer !== null ||
    (g.homeScorer === null && g.awayScorer === null && g.info === 'home')
  );
}

function isAwayGoal(g: Goalscorer): boolean {
  return (
    g.awayScorer !== null ||
    (g.homeScorer === null && g.awayScorer === null && g.info === 'away')
  );
}

function isRedCard(card: string): boolean {
  return card === 'red card' || card === 'yellow-red card';
}

function countCards(
  cards: MatchCardEvent[],
  team: 'home' | 'away',
  type: 'yellow' | 'red',
): number {
  return cards.filter((c) => {
    const fault = team === 'home' ? c.homeFault : c.awayFault;
    const byInfo = c.homeFault === null && c.awayFault === null && c.info === team;
    if (fault === null && !byInfo) return false;
    return type === 'yellow' ? c.card === 'yellow card' : isRedCard(c.card);
  }).length;
}

function goalInfo(g: Goalscorer): string | null {
  if (!g.info || g.info === 'home' || g.info === 'away') return null;
  return g.info;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function TeamBadge({
  name,
  logo,
  shortName,
  side,
}: {
  name: string;
  logo?: string;
  shortName: string;
  side: 'home' | 'away';
}) {
  if (logo) {
    return (
      <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-white/10 p-2 sm:size-20 sm:p-2.5">
        <Image
          src={logo}
          alt={name}
          width={80}
          height={80}
          className="h-full w-full object-contain drop-shadow-lg"
          unoptimized
        />
      </div>
    );
  }
  return (
    <div
      className={cn(
        'flex size-16 shrink-0 items-center justify-center rounded-xl font-display text-xl font-extrabold sm:size-20 sm:text-2xl',
        side === 'home' ? 'bg-home/30' : 'bg-away/30',
      )}
    >
      {shortName.slice(0, 3)}
    </div>
  );
}

function CardPips({ yellows, reds }: { yellows: number; reds: number }) {
  if (yellows === 0 && reds === 0) return null;
  return (
    <div
      className="flex items-center gap-0.5"
      role="img"
      aria-label={`${yellows} yellow${reds > 0 ? `, ${reds} red` : ''} card${yellows + reds > 1 ? 's' : ''}`}
    >
      {Array.from({ length: Math.min(yellows, 5) }, (_, i) => (
        <span key={`y${i}`} className="inline-block h-3 w-2 rounded-[2px] bg-amber-400 shadow-sm" aria-hidden />
      ))}
      {Array.from({ length: Math.min(reds, 3) }, (_, i) => (
        <span key={`r${i}`} className="inline-block h-3 w-2 rounded-[2px] bg-red-500 shadow-sm" aria-hidden />
      ))}
    </div>
  );
}

function GoalEntry({ goal, side }: { goal: Goalscorer; side: 'home' | 'away' }) {
  const name = (side === 'home' ? goal.homeScorer : goal.awayScorer) ?? '—';
  const info = goalInfo(goal);
  return (
    <p
      className={cn(
        'text-[0.67rem] leading-snug',
        side === 'home' ? 'text-right' : 'text-left',
      )}
    >
      <span className="tabular font-semibold opacity-50">{goal.time}&apos;</span>
      {' '}
      <span className="font-medium opacity-90">{name}</span>
      {info && <span className="opacity-50"> ({info})</span>}
    </p>
  );
}

function CardEntry({ card, side }: { card: MatchCardEvent; side: 'home' | 'away' }) {
  const name = side === 'home' ? card.homeFault : card.awayFault;
  if (!name) return null;
  const isRed = isRedCard(card.card);
  const isYellowRed = card.card === 'yellow-red card';
  return (
    <p
      className={cn(
        'flex items-center gap-1 text-[0.67rem] leading-snug',
        side === 'home' ? 'flex-row-reverse text-right' : 'flex-row text-left',
      )}
    >
      <span className="tabular font-semibold opacity-50">{card.time}&apos;</span>
      <span className="font-medium opacity-90">{name}</span>
      <span className="flex shrink-0 items-center gap-0.5" aria-hidden>
        {isYellowRed && (
          <span className="inline-block h-2.5 w-1.5 rounded-[1px] bg-amber-400" />
        )}
        <span className={cn('inline-block h-2.5 w-1.5 rounded-[1px]', isRed ? 'bg-red-500' : 'bg-amber-400')} />
      </span>
    </p>
  );
}

function SubEntry({ sub, side }: { sub: Substitution; side: 'home' | 'away' }) {
  if (!sub.playerIn) return null;
  return (
    <p
      className={cn(
        'text-[0.67rem] leading-snug opacity-60',
        side === 'home' ? 'text-right' : 'text-left',
      )}
    >
      <span className="tabular font-semibold opacity-70">{sub.time}&apos;</span>
      {' '}
      <span className="opacity-60">&#x2191;</span>
      {' '}
      <span className="font-medium">{sub.playerIn}</span>
    </p>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function FeaturedMatch({
  match,
  flashSide,
}: {
  match: Match;
  flashSide?: 'home' | 'away' | null;
}) {
  const league = getLeagueBySlug(match.leagueSlug);
  const isLive = match.status === 'live';
  const isHalftime = match.status === 'halftime';
  const isScheduled = match.status === 'scheduled';
  const isFinished = match.status === 'finished';

  const homeGoals = match.goalscorers.filter(isHomeGoal);
  const awayGoals = match.goalscorers.filter(isAwayGoal);
  const homeYellows = countCards(match.cards, 'home', 'yellow');
  const homeReds = countCards(match.cards, 'home', 'red');
  const awayYellows = countCards(match.cards, 'away', 'yellow');
  const awayReds = countCards(match.cards, 'away', 'red');

  const homeCards = match.cards.filter((c) => c.homeFault !== null || (c.homeFault === null && c.awayFault === null && c.info === 'home'));
  const awayCards = match.cards.filter((c) => c.awayFault !== null || (c.homeFault === null && c.awayFault === null && c.info === 'away'));
  const homeSubs = (match.substitutions ?? []).filter((s) => s.team === 'home');
  const awaySubs = (match.substitutions ?? []).filter((s) => s.team === 'away');

  const hasGoals = match.goalscorers.length > 0;
  const hasCards = homeCards.length > 0 || awayCards.length > 0;
  const hasSubs = homeSubs.length > 0 || awaySubs.length > 0;
  const leagueName = match.leagueName ?? league?.name ?? '';
  const leagueCountry = match.leagueCountry ?? league?.country ?? '';
  const leagueLabel = [leagueCountry, leagueName].filter(Boolean).join(' · ');

  return (
    <section
      aria-label={`${match.home.name} vs ${match.away.name}`}
      className={cn(
        'relative overflow-hidden rounded-2xl pitch-grass',
        flashSide === 'home' && 'score-flash-home',
        flashSide === 'away' && 'score-flash-away',
      )}
    >
      <FootballPitch />

      {/* Depth gradients */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/20" aria-hidden />

      <div className="relative z-10 flex flex-col gap-4 p-5 text-pitch-foreground sm:gap-5 sm:p-7">

        {/* ── Header: league identity + status ── */}
        <header className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {match.leagueLogo ? (
              <div className="flex size-6 shrink-0 items-center justify-center rounded bg-white/10 p-0.5">
                <Image
                  src={match.leagueLogo}
                  alt=""
                  width={20}
                  height={20}
                  className="size-5 object-contain"
                  unoptimized
                />
              </div>
            ) : league ? (
              <span className="shrink-0 text-lg leading-none" aria-hidden>
                {league.flag}
              </span>
            ) : null}
            {leagueLabel && (
              <span className="truncate text-[0.67rem] font-semibold uppercase tracking-[0.18em] opacity-80">
                {leagueLabel}
              </span>
            )}
            {match.round != null && (
              <span className="shrink-0 rounded bg-white/12 px-1.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-wide opacity-90">
                R{match.round}
              </span>
            )}
          </div>

          <div className="shrink-0">
            {isLive && (
              <span className="flex items-center gap-1.5 rounded-full bg-live/25 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-live">
                <span className="size-1.5 rounded-full bg-live live-dot" aria-hidden />
                <MatchMinute match={match} />
              </span>
            )}
            {isHalftime && (
              <span className="rounded-full bg-amber-500/20 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-amber-300">
                Half Time
              </span>
            )}
            {isScheduled && (
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] opacity-65">
                {formatKickoff(match.kickoff)}
              </span>
            )}
            {isFinished && (
              <span className="rounded bg-white/15 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-widest">
                FT
              </span>
            )}
          </div>
        </header>

        {/* ── Teams + Score ── */}
        <Link
          href={`/match/${match.id}`}
          className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl sm:gap-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          aria-label={`${match.home.name} ${match.homeScore} – ${match.awayScore} ${match.away.name}, view match details`}
        >
          {/* Home */}
          <div className="flex flex-col items-center gap-2.5 text-center">
            <TeamBadge
              name={match.home.name}
              logo={match.home.logo}
              shortName={match.home.shortName}
              side="home"
            />
            <div className="flex flex-col items-center gap-1">
              <span className="font-display text-sm font-extrabold leading-tight sm:text-base">
                {match.home.name}
              </span>
              <CardPips yellows={homeYellows} reds={homeReds} />
            </div>
          </div>

          {/* Score */}
          <div className="flex flex-col items-center gap-1">
            {isScheduled ? (
              <span className="font-display text-3xl font-extrabold tabular opacity-70">vs</span>
            ) : (
              <div className="flex items-center gap-2 sm:gap-4">
                <span
                  className={cn(
                    'font-display font-black tabular leading-none text-5xl sm:text-7xl',
                    isFinished && match.homeScore > match.awayScore && 'text-white',
                    isFinished && match.homeScore < match.awayScore && 'text-white/40',
                    isFinished && match.homeScore === match.awayScore && 'text-white/70',
                    !isFinished && 'text-white',
                  )}
                >
                  {match.homeScore}
                </span>
                <span className="text-xl font-light opacity-20 sm:text-2xl">–</span>
                <span
                  className={cn(
                    'font-display font-black tabular leading-none text-5xl sm:text-7xl',
                    isFinished && match.awayScore > match.homeScore && 'text-white',
                    isFinished && match.awayScore < match.homeScore && 'text-white/40',
                    isFinished && match.awayScore === match.homeScore && 'text-white/70',
                    !isFinished && 'text-white',
                  )}
                >
                  {match.awayScore}
                </span>
              </div>
            )}
            <span className="text-[0.57rem] font-semibold uppercase tracking-[0.25em] opacity-35">
              {isScheduled
                ? 'kick off'
                : isLive
                  ? 'live'
                  : isHalftime
                    ? 'half time'
                    : 'final'}
            </span>
          </div>

          {/* Away */}
          <div className="flex flex-col items-center gap-2.5 text-center">
            <TeamBadge
              name={match.away.name}
              logo={match.away.logo}
              shortName={match.away.shortName}
              side="away"
            />
            <div className="flex flex-col items-center gap-1">
              <span className="font-display text-sm font-extrabold leading-tight sm:text-base">
                {match.away.name}
              </span>
              <CardPips yellows={awayYellows} reds={awayReds} />
            </div>
          </div>
        </Link>

        {/* ── Goalscorers ── */}
        {hasGoals && (
          <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
            <div className="flex flex-col gap-0.5">
              {homeGoals.map((g, i) => (
                <GoalEntry key={i} goal={g} side="home" />
              ))}
            </div>
            <div className="flex flex-col gap-0.5">
              {awayGoals.map((g, i) => (
                <GoalEntry key={i} goal={g} side="away" />
              ))}
            </div>
          </div>
        )}

        {/* ── Cards ── */}
        {hasCards && (
          <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
            <div className="flex flex-col gap-0.5">
              {homeCards.map((c, i) => (
                <CardEntry key={i} card={c} side="home" />
              ))}
            </div>
            <div className="flex flex-col gap-0.5">
              {awayCards.map((c, i) => (
                <CardEntry key={i} card={c} side="away" />
              ))}
            </div>
          </div>
        )}

        {/* ── Substitutions ── */}
        {hasSubs && (
          <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
            <div className="flex flex-col gap-0.5">
              {homeSubs.map((s, i) => (
                <SubEntry key={i} sub={s} side="home" />
              ))}
            </div>
            <div className="flex flex-col gap-0.5">
              {awaySubs.map((s, i) => (
                <SubEntry key={i} sub={s} side="away" />
              ))}
            </div>
          </div>
        )}

        {/* ── Venue ── */}
        {match.venue && (
          <footer className="flex items-center justify-center gap-1.5 opacity-40">
            <svg width="8" height="11" viewBox="0 0 8 11" fill="currentColor" aria-hidden>
              <path d="M4 0C1.79 0 0 1.79 0 4c0 3 4 7 4 7s4-4 4-7c0-2.21-1.79-4-4-4zm0 5.5C3.17 5.5 2.5 4.83 2.5 4S3.17 2.5 4 2.5 5.5 3.17 5.5 4 4.83 5.5 4 5.5z" />
            </svg>
            <span className="text-[0.62rem] font-medium tracking-wide">{match.venue}</span>
          </footer>
        )}
      </div>
    </section>
  );
}
