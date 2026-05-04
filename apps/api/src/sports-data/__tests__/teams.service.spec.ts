import { TeamsService } from '../services/teams.service';

describe('TeamsService', () => {
  let service: TeamsService;
  let mockClient: any;
  let mockNormalizer: any;
  let mockCache: any;
  let mockPrisma: any;

  const makeRawTeam = (id: number, name: string) => ({
    team: {
      id,
      name,
      code: null,
      country: 'England',
      founded: 1919,
      national: false,
      logo: `https://example.com/${id}.png`,
    },
    venue: {
      id: 1,
      name: 'Elland Road',
      address: null,
      city: 'Leeds',
      capacity: 37890,
      surface: 'grass',
      image: null,
    },
  });

  beforeEach(() => {
    mockClient = { get: jest.fn() };
    mockNormalizer = {
      normalizePlayer: jest.fn(),
    };
    mockCache = {
      getCached: jest.fn().mockResolvedValue(null),
      setCached: jest.fn().mockResolvedValue(undefined),
    };
    mockPrisma = {
      team: {
        count: jest.fn().mockResolvedValue(1),
        upsert: jest.fn().mockResolvedValue({ id: 'db-team-1' }),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      player: {
        count: jest.fn().mockResolvedValue(0),
        upsert: jest.fn().mockResolvedValue({}),
      },
    };
    service = new TeamsService(
      mockClient,
      mockNormalizer,
      mockCache,
      mockPrisma,
    );
  });

  it('should fetch teams from API when cache is empty', async () => {
    mockClient.get.mockResolvedValue([makeRawTeam(2627, 'Leeds United')]);
    const result = await service.getTeams('40');
    expect(mockClient.get).toHaveBeenCalledWith('teams', {
      league: '40',
      season: 2025,
    });
    expect(result).toHaveLength(1);
    expect(result[0].team.name).toBe('Leeds United');
  });

  it('should return cached teams', async () => {
    const cached = [makeRawTeam(2627, 'Leeds')];
    mockCache.getCached.mockResolvedValue(cached);
    const result = await service.getTeams('40');
    expect(mockClient.get).not.toHaveBeenCalled();
    expect(result).toEqual(cached);
  });
});
