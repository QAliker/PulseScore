import { StandingsService } from '../services/standings.service';

describe('StandingsService', () => {
  let service: StandingsService;
  let mockClient: any;
  let mockNormalizer: any;
  let mockCache: any;
  let mockPrisma: any;

  const makeRawStandingsResponse = () => ({
    league: {
      id: 40,
      name: 'Championship',
      country: 'England',
      logo: '',
      flag: '',
      season: 2025,
      standings: [[
        {
          rank: 1,
          team: { id: 2627, name: 'Leeds United', logo: '' },
          points: 83,
          goalsDiff: 40,
          group: 'Championship',
          form: 'WWWDW',
          status: 'same',
          description: 'Promotion - Premier League',
          all: { played: 38, win: 25, draw: 8, lose: 5, goals: { for: 70, against: 30 } },
          home: { played: 19, win: 14, draw: 3, lose: 2, goals: { for: 38, against: 15 } },
          away: { played: 19, win: 11, draw: 5, lose: 3, goals: { for: 32, against: 15 } },
          update: '2026-05-01T00:00:00+00:00',
        },
      ]],
    },
  });

  beforeEach(() => {
    mockClient = { get: jest.fn() };
    mockNormalizer = {
      normalizeStanding: jest.fn((entry: any, leagueId: string) => ({
        leagueId,
        teamId: String(entry.team.id),
        teamName: entry.team.name,
        position: entry.rank,
        points: entry.points,
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
    mockClient.get.mockResolvedValue([makeRawStandingsResponse()]);
    const result = await service.getStandings('40');
    expect(mockClient.get).toHaveBeenCalledWith('standings', {
      league: '40',
      season: 2025,
    });
    expect(result).toHaveLength(1);
    expect(result[0].position).toBe(1);
  });

  it('should return cached standings when available', async () => {
    const cached = [{ position: 1, teamName: 'Leeds' }];
    mockCache.getCached.mockResolvedValue(cached);
    const result = await service.getStandings('40');
    expect(mockClient.get).not.toHaveBeenCalled();
    expect(result).toEqual(cached);
  });

  it('should return empty array when API returns empty response', async () => {
    mockClient.get.mockResolvedValue([]);
    const result = await service.getStandings('40');
    expect(result).toEqual([]);
  });
});
