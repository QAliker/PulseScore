import { TeamsService } from '../services/teams.service';

describe('TeamsService', () => {
  let service: TeamsService;
  let mockClient: any;
  let mockNormalizer: any;
  let mockCache: any;
  let mockPrisma: any;

  beforeEach(() => {
    mockClient = { get: jest.fn() };
    mockNormalizer = {
      normalizePlayer: jest.fn((p: any, teamId: string) => ({
        externalId: p.player_key,
        name: p.player_name,
        teamId,
        goals: parseInt(p.player_goals) || 0,
      })),
    };
    mockCache = {
      getCached: jest.fn().mockResolvedValue(null),
      setCached: jest.fn().mockResolvedValue(undefined),
    };
    mockPrisma = {
      team: { upsert: jest.fn().mockResolvedValue({ id: 'db-team-1' }) },
      player: { upsert: jest.fn().mockResolvedValue({}) },
    };
    service = new TeamsService(
      mockClient,
      mockNormalizer,
      mockCache,
      mockPrisma,
    );
  });

  it('should fetch teams from API when cache is empty', async () => {
    const mockResponse = [
      {
        team_key: '2627',
        team_name: 'Leeds United',
        team_country: 'England',
        team_founded: '1919',
        team_badge: 'https://example.com/leeds.png',
        venue: {
          venue_name: 'Elland Road',
          venue_address: '',
          venue_city: 'Leeds',
          venue_capacity: '37890',
          venue_surface: 'grass',
        },
        players: [
          { player_key: '777', player_name: 'P. Bamford', player_goals: '15' },
        ],
        coaches: [],
      },
    ];
    mockClient.get.mockResolvedValue(mockResponse);
    const result = await service.getTeams('152');
    expect(mockClient.get).toHaveBeenCalledWith('get_teams', {
      league_id: '152',
    });
    expect(result).toHaveLength(1);
    expect(result[0].team_name).toBe('Leeds United');
  });

  it('should return cached teams', async () => {
    const cached = [{ team_key: '2627', team_name: 'Leeds' }];
    mockCache.getCached.mockResolvedValue(cached);
    const result = await service.getTeams('152');
    expect(mockClient.get).not.toHaveBeenCalled();
    expect(result).toEqual(cached);
  });
});
