import { describe, it, expect } from 'vitest';
import { formatMinute, formatFreshness } from './format';
import type { Match } from './types';

function m(over: Partial<Match>): Match {
  return {
    id: 'x',
    leagueSlug: 'x',
    kickoff: '2026-04-15T15:00:00Z',
    status: 'live',
    minute: 10,
    stoppage: null,
    home: { id: 'h', name: 'H', shortName: 'H' },
    away: { id: 'a', name: 'A', shortName: 'A' },
    homeScore: 0,
    awayScore: 0,
    odds: null,
    updatedAt: new Date().toISOString(),
    ...over,
  };
}

describe('formatMinute', () => {
  it('returns minute with apostrophe for live matches', () => {
    expect(formatMinute(m({ status: 'live', minute: 34 }))).toBe("34'");
  });
  it('renders stoppage-time suffix when minute >= 90', () => {
    expect(formatMinute(m({ status: 'live', minute: 93, stoppage: 3 }))).toBe("90+3'");
  });
  it('returns HT/FT/PPD for non-playing statuses', () => {
    expect(formatMinute(m({ status: 'halftime' }))).toBe('HT');
    expect(formatMinute(m({ status: 'finished', minute: null }))).toBe('FT');
    expect(formatMinute(m({ status: 'postponed' }))).toBe('PPD');
  });
});

describe('formatFreshness', () => {
  it('reports "now" for sub-5-second diffs', () => {
    const now = Date.now();
    expect(formatFreshness(new Date(now - 2_000).toISOString(), now)).toBe('now');
  });
  it('reports seconds under a minute', () => {
    const now = Date.now();
    expect(formatFreshness(new Date(now - 30_000).toISOString(), now)).toBe('30s');
  });
  it('reports minutes under an hour', () => {
    const now = Date.now();
    expect(formatFreshness(new Date(now - 5 * 60_000).toISOString(), now)).toBe('5m');
  });
});
