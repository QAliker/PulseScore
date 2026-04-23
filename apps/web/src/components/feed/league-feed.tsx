'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMemo } from 'react';
import type { Match } from '@/lib/types';
import type { FlashEntry } from '@/hooks/use-live-scores';
import { getLeagueBySlug } from '@/lib/leagues';
import { MatchCard } from './match-card';

export function LeagueFeed({
  leagueSlug,
  matches,
  flashes,
  favorites,
  onToggleFavorite,
}: {
  leagueSlug: string;
  matches: Match[];
  flashes: FlashEntry[];
  favorites: Set<string>;
  onToggleFavorite: (id: string) => void;
}) {
  const league = getLeagueBySlug(leagueSlug);
  const leagueLogo = matches[0]?.leagueLogo;
  const liveCount = useMemo(
    () => matches.filter((m) => m.status === 'live').length,
    [matches],
  );

  // Push favorited matches to top within the league group.
  const ordered = useMemo(() => {
    const favs = matches.filter((m) => favorites.has(m.id));
    const rest = matches.filter((m) => !favorites.has(m.id));
    return [...favs, ...rest];
  }, [matches, favorites]);

  if (!league) return null;

  return (
    <section aria-labelledby={`league-${leagueSlug}`} className="flex flex-col">
      <header className="sticky top-14 z-10 flex items-center gap-3 border-b border-border/70 bg-background/90 px-3 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        {leagueLogo ? (
          <Image src={leagueLogo} alt="" width={28} height={28} className="size-7 object-contain" unoptimized />
        ) : (
          <span className="text-xl leading-none" aria-hidden>{league.flag}</span>
        )}
        <Link
          href={`/standings/${league.apiFootballId}`}
          id={`league-${leagueSlug}`}
          className="font-display text-lg font-extrabold tracking-tight hover:underline"
        >
          {league.name}
        </Link>
        <span className="text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground">
          {league.season}
        </span>
        {liveCount > 0 && (
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-live/12 px-2.5 py-1 text-[0.7rem] font-semibold text-live">
            <span className="size-1.5 rounded-full bg-live live-dot" aria-hidden />
            {liveCount} live
          </span>
        )}
      </header>

      <div className="flex flex-col">
        {ordered.map((match) => {
          const flash = flashes.find((f) => f.matchId === match.id);
          return (
            <MatchCard
              key={match.id}
              match={match}
              flashSide={flash?.scorer ?? null}
              isFavorite={favorites.has(match.id)}
              onToggleFavorite={onToggleFavorite}
            />
          );
        })}
      </div>
    </section>
  );
}
