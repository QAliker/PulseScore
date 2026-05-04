import { H2hService } from '../services/h2h.service';

describe('H2hService', () => {
  let service: H2hService;
  let mockClient: any;
  let mockNormalizer: any;
  let mockCache: any;

  const makeRawFixture = (id: string, homeId: number, awayId: number) => ({
    fixture: {
      id: parseInt(id),
      date: '2025-01-01T15:00:00Z',
      status: { short: 'FT', elapsed: 90 },
      venue: { name: null },
    },
    league: {
      id: 40,
      name: 'Championship',
      country: 'England',
      logo: '',
      flag: '',
      season: 2025,
      round: '',
    },
    teams: {
      home: { id: homeId, name: 'Home', logo: '' },
      away: { id: awayId, name: 'Away', logo: '' },
    },
    goals: { home: 1, away: 0 },
    score: {
      halftime: { home: 0, away: 0 },
      fulltime: { home: 1, away: 0 },
      extratime: { home: null, away: null },
      penalty: { home: null, away: null },
    },
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
        homeTeam: { externalId: String(m.teams.home.id) },
        awayTeam: { externalId: String(m.teams.away.id) },
      })),
    };
    mockCache = {
      getCached: jest.fn().mockResolvedValue(null),
      setCached: jest.fn().mockResolvedValue(undefined),
    };
    service = new H2hService(mockClient, mockNormalizer, mockCache);
  });

  it('should fetch H2H from API when cache is empty', async () => {
    mockClient.get.mockResolvedValue([
      makeRawFixture('1', 2627, 2637),
      makeRawFixture('2', 2637, 2627),
    ]);
    const result = await service.getH2H('2627', '2637');
    expect(mockClient.get).toHaveBeenCalledWith('fixtures/headtohead', {
      h2h: '2627-2637',
    });
    expect(result.headToHead).toHaveLength(2);
  });

  it('should return cached H2H', async () => {
    const cached = {
      headToHead: [],
      firstTeamResults: [],
      secondTeamResults: [],
    };
    mockCache.getCached.mockResolvedValue(cached);
    const result = await service.getH2H('2627', '2637');
    expect(mockClient.get).not.toHaveBeenCalled();
    expect(result).toEqual(cached);
  });
});
