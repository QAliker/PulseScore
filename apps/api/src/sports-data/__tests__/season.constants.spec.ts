import { getCurrentSeason, LEAGUE_MAP } from '../constants/season.constants';

describe('getCurrentSeason', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns current year in August', () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-08-15'));
    expect(getCurrentSeason()).toBe(2025);
  });

  it('returns previous year in May', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-11'));
    expect(getCurrentSeason()).toBe(2025);
  });

  it('returns previous year in July', () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-07-31'));
    expect(getCurrentSeason()).toBe(2024);
  });
});

describe('LEAGUE_MAP', () => {
  it('maps Premier League API-Football ID to PL', () => {
    expect(LEAGUE_MAP['39'].fdoCode).toBe('PL');
  });

  it('has all 6 required leagues', () => {
    expect(Object.keys(LEAGUE_MAP)).toHaveLength(6);
    for (const league of Object.values(LEAGUE_MAP)) {
      expect(league.fdoCode).toBeDefined();
      expect(league.name).toBeDefined();
    }
  });
});
