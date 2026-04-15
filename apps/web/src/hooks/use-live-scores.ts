'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSocket } from './use-socket';
import type { Match, MatchEvent, MatchesByLeague, SocketStatus } from '@/lib/types';

export type FlashEntry = { matchId: string; scorer: 'home' | 'away'; at: number };

type UseLiveScoresResult = {
  matchesByLeague: MatchesByLeague;
  all: Match[];
  status: SocketStatus;
  flashes: FlashEntry[];
  simulateDrop: () => void;
};

/**
 * Owns the in-memory match state. Seeds from SSR fixtures, then mutates in response
 * to WebSocket events. Emits `flashes` entries when a score changes so downstream UI
 * can animate + fire toasts.
 */
export function useLiveScores(initial: Match[]): UseLiveScoresResult {
  const [matches, setMatches] = useState<Match[]>(initial);
  const [flashes, setFlashes] = useState<FlashEntry[]>([]);
  const { status, subscribe, simulateDrop } = useSocket({ initialMatches: initial });

  useEffect(() => {
    return subscribe((e: MatchEvent) => {
      setMatches((prev) =>
        prev.map((m) => {
          if (m.id !== e.matchId) return m;
          if (e.type === 'score') {
            return {
              ...m,
              homeScore: e.homeScore,
              awayScore: e.awayScore,
              minute: e.minute,
              updatedAt: e.updatedAt,
            };
          }
          if (e.type === 'tick') {
            return { ...m, minute: e.minute, stoppage: e.stoppage, updatedAt: e.updatedAt };
          }
          return { ...m, status: e.status, updatedAt: e.updatedAt };
        }),
      );
      if (e.type === 'score') {
        setFlashes((prev) => [
          ...prev.filter((f) => f.matchId !== e.matchId),
          { matchId: e.matchId, scorer: e.scorer, at: Date.now() },
        ]);
      }
    });
  }, [subscribe]);

  // Auto-clear flash entries after the animation window (1s).
  useEffect(() => {
    if (!flashes.length) return;
    const t = setTimeout(() => {
      const cutoff = Date.now() - 1000;
      setFlashes((prev) => prev.filter((f) => f.at > cutoff));
    }, 1100);
    return () => clearTimeout(t);
  }, [flashes]);

  const matchesByLeague = useMemo(() => {
    const map: MatchesByLeague = {};
    for (const m of matches) {
      (map[m.leagueSlug] ??= []).push(m);
    }
    for (const slug of Object.keys(map)) {
      map[slug].sort(sortMatch);
    }
    return map;
  }, [matches]);

  return { matchesByLeague, all: matches, status, flashes, simulateDrop };
}

const statusRank: Record<Match['status'], number> = {
  live: 0,
  halftime: 1,
  scheduled: 2,
  postponed: 3,
  finished: 4,
};

function sortMatch(a: Match, b: Match): number {
  const rs = statusRank[a.status] - statusRank[b.status];
  if (rs !== 0) return rs;
  return new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime();
}
