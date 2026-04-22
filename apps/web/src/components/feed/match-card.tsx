'use client';

import Link from 'next/link';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Match } from '@/lib/types';
import { formatFreshness } from '@/lib/format';
import { TeamCrest } from './team-crest';
import { MatchMinute } from './match-minute';
import { OddsPills } from './odds-pills';

type MatchCardProps = {
  match: Match;
  flashSide?: 'home' | 'away' | null;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
};

export function MatchCard({
  match,
  flashSide,
  isFavorite = false,
  onToggleFavorite,
}: MatchCardProps) {
  const isLive = match.status === 'live' || match.status === 'halftime';
  const isFinished = match.status === 'finished';
  const isScheduled = match.status === 'scheduled';

  return (
    <article
      className={cn(
        '@container group relative grid items-center gap-3 border-b border-border/50 px-3 py-3 transition-colors',
        'grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto]',
        'hover:bg-accent/40',
        isFinished && 'opacity-80',
        flashSide && (flashSide === 'home' ? 'score-flash-home' : 'score-flash-away'),
      )}
      aria-live="polite"
    >
      {/* Left rail: favorite + minute/time + freshness */}
      <div className="flex w-[68px] flex-col items-start gap-1">
        <button
          type="button"
          onClick={() => onToggleFavorite?.(match.id)}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          aria-pressed={isFavorite}
          className={cn(
            'inline-flex size-6 items-center justify-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            isFavorite
              ? 'text-amber-500'
              : 'text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100',
          )}
        >
          <Star className="size-4" fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
        <MatchMinute match={match} compact />
        {isLive && (
          <span className="text-[0.62rem] text-muted-foreground tabular">
            ·{formatFreshness(match.updatedAt)}
          </span>
        )}
      </div>

      {/* Home side */}
      <Link
        href={`/teams/${match.home.id}`}
        className="flex min-w-0 items-center gap-2 justify-self-end text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
      >
        <span
          className={cn(
            'truncate text-sm font-semibold',
            match.homeScore > match.awayScore && isFinished && 'text-foreground',
            isFinished && match.homeScore < match.awayScore && 'text-muted-foreground',
          )}
        >
          {match.home.name}
        </span>
        <TeamCrest shortName={match.home.shortName} side="home" />
      </Link>

      {/* Score — the single most-important element */}
      <Link
        href={`/match/${match.id}`}
        className="flex items-center gap-2 rounded-md px-2 py-1 font-display tabular focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`${match.home.name} ${match.homeScore} ${match.away.name} ${match.awayScore}`}
      >
        {isScheduled ? (
          <span className="text-sm font-semibold text-muted-foreground">vs</span>
        ) : (
          <>
            <span className="text-2xl font-extrabold leading-none">
              {match.homeScore}
            </span>
            <span className="text-muted-foreground/50">–</span>
            <span className="text-2xl font-extrabold leading-none">
              {match.awayScore}
            </span>
          </>
        )}
      </Link>

      {/* Away side */}
      <Link
        href={`/teams/${match.away.id}`}
        className="flex min-w-0 items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
      >
        <TeamCrest shortName={match.away.shortName} side="away" />
        <span
          className={cn(
            'truncate text-sm font-semibold',
            isFinished && match.awayScore > match.homeScore && 'text-foreground',
            isFinished && match.awayScore < match.homeScore && 'text-muted-foreground',
          )}
        >
          {match.away.name}
        </span>
      </Link>

      {/* Right rail: odds */}
      {match.odds && <OddsPills odds={match.odds} />}
    </article>
  );
}
