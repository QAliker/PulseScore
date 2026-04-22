'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSocket } from './use-socket';
import type { Match, MatchesByLeague, SocketStatus } from '@/lib/types';

export type FlashEntry = { matchId: string; scorer: 'home' | 'away'; at: number };

type UseLiveScoresResult = {
  matchesByLeague: MatchesByLeague;
  all: Match[];
  status: SocketStatus;
  flashes: FlashEntry[];
};

export function useLiveScores(initial: Match[]): UseLiveScoresResult {
  const [matches, setMatches] = useState<Match[]>(initial);
  const [flashes, setFlashes] = useState<FlashEntry[]>([]);
  const prevRef = useRef<Match[]>(initial);
  const { status, subscribe } = useSocket();

  useEffect(() => {
    return subscribe((fresh: Match[]) => {
      const prev = prevRef.current;
      const newFlashes: FlashEntry[] = [];

      for (const next of fresh) {
        const old = prev.find((m) => m.id === next.id);
        if (!old) continue;
        if (next.homeScore > old.homeScore) {
          newFlashes.push({ matchId: next.id, scorer: 'home', at: Date.now() });
        } else if (next.awayScore > old.awayScore) {
          newFlashes.push({ matchId: next.id, scorer: 'away', at: Date.now() });
        }
      }

      prevRef.current = fresh;
      setMatches(fresh);
      if (newFlashes.length) {
        setFlashes((prev) => [
          ...prev.filter((f) => !newFlashes.some((n) => n.matchId === f.matchId)),
          ...newFlashes,
        ]);
      }
    });
  }, [subscribe]);

  // Auto-clear flashes after animation window.
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

  return { matchesByLeague, all: matches, status, flashes };
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
