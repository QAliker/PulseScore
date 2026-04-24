'use client';

import { useMemo } from 'react';
import type { Match } from '@/lib/types';
import { useLiveScores } from '@/hooks/use-live-scores';
import { useFavorites } from '@/hooks/use-favorites';
import { useGoalNotifications } from '@/hooks/use-goal-notifications';
import { FeaturedMatch } from './featured-match';
import { FeedError } from './feed-states';

export function LiveFeed({ initial }: { initial: Match[] }) {
  const { all, status, flashes } = useLiveScores(initial);
  useFavorites();
  useGoalNotifications(flashes, all);

  // Featured = biggest live game (most goals), else next scheduled.
  const featured = useMemo(() => pickFeatured(all), [all]);
  const featuredFlash = featured
    ? flashes.find((f) => f.matchId === featured.id)?.scorer ?? null
    : null;



  return (
    <div className="flex flex-col gap-6">
      {status === 'offline' && (
        <FeedError />
      )}

      {featured && <FeaturedMatch match={featured} flashSide={featuredFlash} />}

    </div>
  );
}

function pickFeatured(matches: Match[]): Match | null {
  const live = matches.filter((m) => m.status === 'live');
  if (live.length) {
    return [...live].sort(
      (a, b) =>
        b.homeScore + b.awayScore - (a.homeScore + a.awayScore) ||
        (b.minute ?? 0) - (a.minute ?? 0),
    )[0];
  }
  const scheduled = matches
    .filter((m) => m.status === 'scheduled')
    .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());
  return scheduled[0] ?? matches[0] ?? null;
}
