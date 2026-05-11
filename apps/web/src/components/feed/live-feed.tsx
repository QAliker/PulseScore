'use client';

import { useCallback, useMemo, useState } from 'react';
import type { Match } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useLiveScores } from '@/hooks/use-live-scores';
import { useFavorites } from '@/hooks/use-favorites';
import { useGoalNotifications } from '@/hooks/use-goal-notifications';
import { FeaturedMatch } from './featured-match';
import { FeedError } from './feed-states';

function ChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function rankFeatured(matches: Match[]): Match[] {
  const live = matches
    .filter((m) => m.status === 'live')
    .sort(
      (a, b) =>
        b.homeScore + b.awayScore - (a.homeScore + a.awayScore) ||
        (b.minute ?? 0) - (a.minute ?? 0),
    );

  if (live.length > 0) return live.slice(0, 6);

  return matches
    .filter((m) => m.status === 'scheduled')
    .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
    .slice(0, 5);
}

export function LiveFeed({ initial }: { initial: Match[] }) {
  const { all, status, flashes } = useLiveScores(initial);
  useFavorites();
  useGoalNotifications(flashes, all);

  const featured = useMemo(() => rankFeatured(all), [all]);

  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState<'next' | 'prev'>('next');
  const [navKey, setNavKey] = useState(0);

  const clampedIdx = Math.min(idx, Math.max(0, featured.length - 1));
  const match = featured[clampedIdx] ?? null;
  const flashSide = match ? (flashes.find((f) => f.matchId === match.id)?.scorer ?? null) : null;
  const canNav = featured.length > 1;

  const goNext = useCallback(() => {
    setDir('next');
    setIdx((i) => (i + 1) % featured.length);
    setNavKey((k) => k + 1);
  }, [featured.length]);

  const goPrev = useCallback(() => {
    setDir('prev');
    setIdx((i) => (i - 1 + featured.length) % featured.length);
    setNavKey((k) => k + 1);
  }, [featured.length]);

  const goTo = useCallback((target: number) => {
    setDir(target > clampedIdx ? 'next' : 'prev');
    setIdx(target);
    setNavKey((k) => k + 1);
  }, [clampedIdx]);

  if (!match) return null;

  return (
    <div className="flex flex-col gap-6">
      {status === 'offline' && <FeedError />}

      <div className="relative">
        <div
          key={navKey}
          className={dir === 'next' ? 'featured-slide-next' : 'featured-slide-prev'}
        >
          <FeaturedMatch match={match} flashSide={flashSide} />
        </div>

        {canNav && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-3 top-1/2 z-20 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-sm transition-colors hover:bg-black/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 active:scale-95"
              aria-label="Match précédent"
            >
              <ChevronLeft />
            </button>

            <button
              onClick={goNext}
              className="absolute right-3 top-1/2 z-20 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-sm transition-colors hover:bg-black/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 active:scale-95"
              aria-label="Match suivant"
            >
              <ChevronRight />
            </button>

            <div className="absolute bottom-3.5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5">
              {featured.map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => goTo(i)}
                  aria-label={`Match ${i + 1}`}
                  className={cn(
                    'rounded-full transition-all duration-200',
                    i === clampedIdx
                      ? 'size-2 bg-white'
                      : 'size-1.5 bg-white/35 hover:bg-white/60',
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
