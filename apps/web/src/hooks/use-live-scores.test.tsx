import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useLiveScores } from './use-live-scores';
import type { Match } from '@/lib/types';

function makeMatch(over: Partial<Match> = {}): Match {
  return {
    id: 'm1',
    leagueSlug: 'england-championship',
    kickoff: new Date().toISOString(),
    status: 'live',
    minute: 42,
    stoppage: null,
    home: { id: 'h', name: 'Leeds United', shortName: 'LEE' },
    away: { id: 'a', name: 'Burnley', shortName: 'BUR' },
    homeScore: 0,
    awayScore: 0,
    odds: { home: 2, draw: 3, away: 3 },
    updatedAt: new Date().toISOString(),
    ...over,
  };
}

describe('useLiveScores', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('seeds state from initial fixtures and groups by league', () => {
    const { result } = renderHook(() =>
      useLiveScores([
        makeMatch({ id: 'm1' }),
        makeMatch({ id: 'm2', leagueSlug: 'france-ligue-2' }),
      ]),
    );
    expect(result.current.all).toHaveLength(2);
    expect(result.current.matchesByLeague['england-championship']).toHaveLength(1);
    expect(result.current.matchesByLeague['france-ligue-2']).toHaveLength(1);
  });

  it('advances the live match minute when the mock socket ticks', async () => {
    const { result } = renderHook(() => useLiveScores([makeMatch({ minute: 42 })]));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500); // connect
      await vi.advanceTimersByTimeAsync(8_500); // one tick
    });

    expect(result.current.all[0].minute).toBeGreaterThan(42);
  });

  it('orders matches by status rank: live → halftime → scheduled → finished', () => {
    const { result } = renderHook(() =>
      useLiveScores([
        makeMatch({ id: 'fin', status: 'finished', minute: null }),
        makeMatch({ id: 'sch', status: 'scheduled', minute: null }),
        makeMatch({ id: 'ht', status: 'halftime' }),
        makeMatch({ id: 'live', status: 'live' }),
      ]),
    );
    const ids = result.current.matchesByLeague['england-championship'].map((m) => m.id);
    expect(ids).toEqual(['live', 'ht', 'sch', 'fin']);
  });
});
