import { FixturesService } from '../services/fixtures.service';

describe('FixturesService', () => {
  let service: FixturesService;
  let mockClient: any;
  let mockNormalizer: any;
  let mockCache: any;

  const makeRawFixture = (id: string) => ({
    fixture: { id: parseInt(id), date: '2026-04-10T20:45:00Z', status: { short: 'FT', elapsed: 90 }, venue: { name: 'Stadium' } },
    league: { id: 40, name: 'Championship', country: 'England', logo: '', flag: '', season: 2025, round: 'Round 38' },
    teams: { home: { id: 1, name: 'Leeds', logo: '' }, away: { id: 2, name: 'Sheffield', logo: '' } },
    goals: { home: 2, away: 1 },
    score: { halftime: { home: 1, away: 0 }, fulltime: { home: 2, away: 1 }, extratime: { home: null, away: null }, penalty: { home: null, away: null } },
    events: [],
    lineups: [],
    statistics: [],
    players: [],
  });

  beforeEach(() => {
    mockClient = { get: jest.fn() };
    mockNormalizer = {
      normalizeFixture: jest.fn((m: any) => ({
        externalId: String(m.fixture.id),
        homeTeam: { name: m.teams.home.name },
        awayTeam: { name: m.teams.away.name },
        status: 'FINISHED',
        sport: 'Football',
      })),
    };
    mockCache = {
      getCached: jest.fn().mockResolvedValue(null),
      setCached: jest.fn().mockResolvedValue(undefined),
    };
    const mockPrisma = {
      player: { findMany: jest.fn().mockResolvedValue([]) },
    };
    service = new FixturesService(
      mockClient,
      mockNormalizer,
      mockCache,
      mockPrisma as any,
    );
  });

  it('should fetch fixtures from API when cache is empty', async () => {
    mockClient.get.mockResolvedValue([makeRawFixture('1')]);
    const result = await service.getFixtures('40', '2026-04-10', '2026-04-10');
    expect(mockClient.get).toHaveBeenCalledWith('fixtures', {
      league: '40',
      season: 2025,
      from: '2026-04-10',
      to: '2026-04-10',
    });
    expect(result).toHaveLength(1);
  });

  it('should return cached data when available', async () => {
    const cached = [{ externalId: '1' }];
    mockCache.getCached.mockResolvedValue(cached);
    const result = await service.getFixtures('40', '2026-04-10', '2026-04-10');
    expect(mockClient.get).not.toHaveBeenCalled();
    expect(result).toEqual(cached);
  });
});
