import { H2hService } from '../services/h2h.service';

describe('H2hService', () => {
  let service: H2hService;
  let mockFdoClient: any;
  let mockFdoNormalizer: any;
  let mockPrisma: any;
  let mockCache: any;

  const makeFdoMatch = (id: number, homeId: number, awayId: number) => ({
    id,
    utcDate: '2025-01-01T15:00:00Z',
    status: 'FINISHED',
    matchday: 10,
    homeTeam: { id: homeId, name: 'Home', crest: '' },
    awayTeam: { id: awayId, name: 'Away', crest: '' },
    score: {
      winner: 'HOME_TEAM',
      fullTime: { home: 1, away: 0 },
      halfTime: { home: 1, away: 0 },
    },
    competition: { id: 2021, name: 'PL', code: 'PL' },
  });

  beforeEach(() => {
    mockFdoClient = { get: jest.fn() };
    mockFdoNormalizer = {
      normalizeMatch: jest.fn((raw: any, homeId: any, awayId: any) => ({
        id: `fdo:${raw.id}`,
        externalId: `fdo:${raw.id}`,
        homeTeam: { externalId: homeId ?? `fdo:${raw.homeTeam.id}` },
        awayTeam: { externalId: awayId ?? `fdo:${raw.awayTeam.id}` },
      })),
    };
    mockPrisma = {
      team: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      league: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    mockCache = {
      getCached: jest.fn().mockResolvedValue(null),
      setCached: jest.fn().mockResolvedValue(undefined),
    };
    service = new H2hService(
      mockFdoClient,
      mockFdoNormalizer,
      mockPrisma,
      mockCache,
    );
  });

  it('should fetch H2H from FDO when team IDs are fdo: prefixed', async () => {
    mockFdoClient.get.mockResolvedValue({
      head2head: {
        numberOfMatches: 2,
        matches: [makeFdoMatch(1, 57, 65), makeFdoMatch(2, 65, 57)],
      },
    });
    const result = await service.getH2H('fdo:57', 'fdo:65');
    expect(mockFdoClient.get).toHaveBeenCalledWith('matches', {
      headToHead: '57_65',
    });
    expect(result.headToHead).toHaveLength(2);
  });

  it('should return cached H2H without calling FDO', async () => {
    const cached = {
      headToHead: [],
      firstTeamResults: [],
      secondTeamResults: [],
    };
    mockCache.getCached.mockResolvedValue(cached);
    const result = await service.getH2H('fdo:57', 'fdo:65');
    expect(mockFdoClient.get).not.toHaveBeenCalled();
    expect(result).toEqual(cached);
  });

  it('should return empty when FDO IDs cannot be resolved', async () => {
    mockPrisma.team.findFirst.mockResolvedValue(null);
    const result = await service.getH2H('999', '888');
    expect(mockFdoClient.get).not.toHaveBeenCalled();
    expect(result.headToHead).toHaveLength(0);
  });
});
