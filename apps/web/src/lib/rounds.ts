import type { ApiMatch } from './api-types';

/** Round with the earliest upcoming/today match (for fixtures). */
export function getCurrentRound(matches: ApiMatch[]): number | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = matches.filter(
    (m) => m.round != null && new Date(m.startTime) >= today,
  );
  if (upcoming.length === 0) return null;

  return Math.min(...(upcoming.map((m) => m.round) as number[]));
}

/** Round with the highest number among finished matches (for results). */
export function getLatestRound(matches: ApiMatch[]): number | null {
  const finished = matches.filter(
    (m) => m.round != null && m.status === 'FINISHED',
  );
  if (finished.length === 0) return null;

  return Math.max(...(finished.map((m) => m.round) as number[]));
}
