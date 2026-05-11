import { FixturesService } from '../services/fixtures.service';

// Mock getCurrentSeason to return a historical season so RAF path is exercised
jest.mock('../constants/season.constants', () => ({
  getCurrentSeason: () => 2024,
  HISTORY_SEASON_RAF: 2024,
  LEAGUE_MAP: {
    '39': { fdoCode: 'PL', name: 'Premier League' },
    '40': { fdoCode: 'ELC', name: 'Championship' },
  },
}));

describe('FixturesService', () => {
  let service: FixturesService;
  let mockRafClient: any;
  let mockRafNormalizer: any;
  let mockFdoClient: any;
  let mockFdoNormalizer: any;
  let mockCache: any;
  let mockPrisma: any;

  const makeRawFixture = (id: string) => ({
    fixture: {
      id: parseInt(id),
      date: '2026-04-10T20:45:00Z',
      status: { short: 'FT', elapsed: 90 },
      venue: { name: 'Stadium' },
    },
    league: {
      id: 40,
      name: 'Championship',
      country: 'England',
      logo: '',
      flag: '',
      season: 2024,
      round: 'Round 38',
    },
    teams: {
      home: { id: 1, name: 'Leeds', logo: '' },
      away: { id: 2, name: 'Sheffield', logo: '' },
    },
    goals: { home: 2, away: 1 },
    score: {
      halftime: { home: 1, away: 0 },
      fulltime: { home: 2, away: 1 },
      extratime: { home: null, away: null },
      penalty: { home: null, away: null },
    },
    events: [],
    lineups: [],
    statistics: [],
    players: [],
  });

  beforeEach(() => {
    mockRafClient = { get: jest.fn() };
    mockRafNormalizer = {
      normalizeFixture: jest.fn((m: any) => ({
        externalId: String(m.fixture.id),
        homeTeam: { name: m.teams.home.name },
        awayTeam: { name: m.teams.away.name },
        status: 'FINISHED',
        sport: 'Football',
      })),
    };
    mockFdoClient = { get: jest.fn() };
    mockFdoNormalizer = { normalizeMatch: jest.fn() };
    mockCache = {
      getCached: jest.fn().mockResolvedValue(null),
      setCached: jest.fn().mockResolvedValue(undefined),
    };
    mockPrisma = {
      player: { findMany: jest.fn().mockResolvedValue([]) },
      team: { findFirst: jest.fn().mockResolvedValue(null) },
      league: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    service = new FixturesService(
      mockRafClient,
      mockRafNormalizer,
      mockFdoClient,
      mockFdoNormalizer,
      mockCache,
      mockPrisma,
      { getLineups: jest.fn().mockResolvedValue(null) } as any,
    );
  });

  it('should fetch fixtures from RAF API when cache is empty (historical season)', async () => {
    mockRafClient.get.mockResolvedValue([makeRawFixture('1')]);
    const result = await service.getFixtures('40', '2026-04-10', '2026-04-10');
    expect(mockRafClient.get).toHaveBeenCalledWith('fixtures', {
      league: '40',
      season: 2024,
      from: '2026-04-10',
      to: '2026-04-10',
    });
    expect(result).toHaveLength(1);
  });

  it('should return cached data when available', async () => {
    const cached = [{ externalId: '1' }];
    mockCache.getCached.mockResolvedValue(cached);
    const result = await service.getFixtures('40', '2026-04-10', '2026-04-10');
    expect(mockRafClient.get).not.toHaveBeenCalled();
    expect(result).toEqual(cached);
  });
});
