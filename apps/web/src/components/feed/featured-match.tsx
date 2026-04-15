'use client';

import Link from 'next/link';
import type { Match } from '@/lib/types';
import { formatKickoff } from '@/lib/format';
import { MatchMinute } from './match-minute';
import { TeamCrest } from './team-crest';
import { cn } from '@/lib/utils';
import { getLeagueBySlug } from '@/lib/leagues';

export function FeaturedMatch({
  match,
  flashSide,
}: {
  match: Match;
  flashSide?: 'home' | 'away' | null;
}) {
  const league = getLeagueBySlug(match.leagueSlug);
  const isLive = match.status === 'live';
  const isScheduled = match.status === 'scheduled';

  return (
    <section
      aria-labelledby="featured-heading"
      className={cn(
        'relative overflow-hidden rounded-2xl pitch-grass',
        flashSide && (flashSide === 'home' ? 'score-flash-home' : 'score-flash-away'),
      )}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-white/20" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/55 via-black/15 to-transparent" aria-hidden />

      <div className="relative flex flex-col gap-5 p-5 text-pitch-foreground sm:p-7">
        <header className="flex items-center justify-between text-[0.7rem] font-semibold uppercase tracking-[0.18em]">
          <span className="opacity-85">
            {isLive ? 'Featured · Live' : isScheduled ? 'Featured · Up next' : 'Featured'}
          </span>
          {league && (
            <span className="flex items-center gap-1.5 opacity-85">
              <span aria-hidden>{league.flag}</span>
              {league.name}
            </span>
          )}
        </header>

        <Link
          href={`/match/${match.id}`}
          className="flex flex-col gap-4 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-8">
            <TeamSide match={match} side="home" />
            <ScoreBlock match={match} />
            <TeamSide match={match} side="away" />
          </div>

          <div className="flex items-center justify-between text-[0.78rem] font-medium opacity-90">
            <MatchMinute match={match} />
            <span className="tabular">
              {isScheduled ? `Kick off ${formatKickoff(match.kickoff)}` : 'Follow live'}
            </span>
          </div>
        </Link>
      </div>
    </section>
  );
}

function TeamSide({ match, side }: { match: Match; side: 'home' | 'away' }) {
  const team = side === 'home' ? match.home : match.away;
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col items-center gap-2 text-center',
      )}
    >
      <TeamCrest shortName={team.shortName} side={side} size="lg" />
      <span className="font-display text-base font-extrabold leading-tight sm:text-lg">
        {team.name}
      </span>
    </div>
  );
}

function ScoreBlock({ match }: { match: Match }) {
  const isScheduled = match.status === 'scheduled';
  return (
    <div className="flex items-center justify-center">
      {isScheduled ? (
        <span className="font-display text-2xl font-extrabold tabular opacity-80">vs</span>
      ) : (
        <span className="flex items-center gap-3 font-display tabular text-white">
          <span className="text-5xl font-black leading-none sm:text-6xl">
            {match.homeScore}
          </span>
          <span className="text-2xl opacity-50">–</span>
          <span className="text-5xl font-black leading-none sm:text-6xl">
            {match.awayScore}
          </span>
        </span>
      )}
    </div>
  );
}
