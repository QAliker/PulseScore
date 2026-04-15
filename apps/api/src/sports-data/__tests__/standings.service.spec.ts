import { StandingsService } from '../services/standings.service';

describe('StandingsService', () => {
  let service: StandingsService;
  let mockClient: any;
  let mockNormalizer: any;
  let mockCache: any;
  let mockPrisma: any;

  beforeEach(() => {
    mockClient = { get: jest.fn() };
    mockNormalizer = {
      normalizeStanding: jest.fn((s: any) => ({
        leagueId: s.league_id,
        teamId: s.team_id,
        teamName: s.team_name,
        position: parseInt(s.overall_league_position),
        points: parseInt(s.overall_league_PTS),
      })),
    };
    mockCache = {
      getCached: jest.fn().mockResolvedValue(null),
      setCached: jest.fn().mockResolvedValue(undefined),
    };
    mockPrisma = {
      league: {
        findUnique: jest.fn().mockResolvedValue({ id: 'db-league-1' }),
      },
      team: { findUnique: jest.fn().mockResolvedValue({ id: 'db-team-1' }) },
      standing: { upsert: jest.fn().mockResolvedValue({}) },
    };
    service = new StandingsService(
      mockClient,
      mockNormalizer,
      mockCache,
      mockPrisma,
    );
  });

  it('should fetch standings from API when cache is empty', async () => {
    mockClient.get.mockResolvedValue([
      {
        league_id: '152',
        team_id: '2627',
        team_name: 'Leeds',
        overall_league_position: '1',
        overall_league_PTS: '83',
      },
    ]);
    const result = await service.getStandings('152');
    expect(mockClient.get).toHaveBeenCalledWith('get_standings', {
      league_id: '152',
    });
    expect(result).toHaveLength(1);
    expect(result[0].position).toBe(1);
  });

  it('should return cached standings when available', async () => {
    const cached = [{ position: 1, teamName: 'Leeds' }];
    mockCache.getCached.mockResolvedValue(cached);
    const result = await service.getStandings('152');
    expect(mockClient.get).not.toHaveBeenCalled();
    expect(result).toEqual(cached);
  });
});
