import { StandingsService } from '../services/standings.service';

// Freeze time so getCurrentSeason() returns 2024 (historical → RAF path)
const MOCK_DATE = new Date('2024-05-11T12:00:00Z');

describe('StandingsService', () => {
  let service: StandingsService;
  let mockRafClient: any;
  let mockRafNormalizer: any;
  let mockFdoClient: any;
  let mockFdoNormalizer: any;
  let mockCache: any;
  let mockPrisma: any;
  let dateSpy: jest.SpyInstance;

  const makeRawStandingsResponse = () => ({
    league: {
      id: 39,
      name: 'Premier League',
      country: 'England',
      logo: '',
      flag: '',
      season: 2024,
      standings: [
        [
          {
            rank: 1,
            team: { id: 2627, name: 'Leeds United', logo: '' },
            points: 83,
            goalsDiff: 40,
            group: 'Premier League',
            form: 'WWWDW',
            status: 'same',
            description: 'Promotion - Premier League',
            all: {
              played: 38,
              win: 25,
              draw: 8,
              lose: 5,
              goals: { for: 70, against: 30 },
            },
            home: {
              played: 19,
              win: 14,
              draw: 3,
              lose: 2,
              goals: { for: 38, against: 15 },
            },
            away: {
              played: 19,
              win: 11,
              draw: 5,
              lose: 3,
              goals: { for: 32, against: 15 },
            },
            update: '2024-05-01T00:00:00+00:00',
          },
        ],
      ],
    },
  });

  beforeEach(() => {
    // Pin date to May 2024 so getCurrentSeason() returns 2024 (RAF path)
    dateSpy = jest
      .spyOn(global, 'Date')
      .mockImplementation(() => MOCK_DATE as any);

    mockRafClient = { get: jest.fn() };
    mockRafNormalizer = {
      normalizeStanding: jest.fn((entry: any, leagueId: string) => ({
        leagueId,
        teamId: String(entry.team.id),
        teamName: entry.team.name,
        position: entry.rank,
        points: entry.points,
      })),
    };
    mockFdoClient = { get: jest.fn() };
    mockFdoNormalizer = { normalizeStanding: jest.fn() };
    mockCache = {
      getCached: jest.fn().mockResolvedValue(null),
      setCached: jest.fn().mockResolvedValue(undefined),
    };
    mockPrisma = {
      league: {
        findUnique: jest.fn().mockResolvedValue({ id: 'db-league-1' }),
        findFirst: jest.fn().mockResolvedValue({ id: 'db-league-1' }),
      },
      team: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'db-team-1', externalId: '2627' }),
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'db-team-1', externalId: '2627' }),
      },
      standing: { upsert: jest.fn().mockResolvedValue({}) },
    };
    service = new StandingsService(
      mockRafClient,
      mockRafNormalizer,
      mockFdoClient,
      mockFdoNormalizer,
      mockCache,
      mockPrisma,
    );
  });

  afterEach(() => {
    dateSpy.mockRestore();
  });

  it('should fetch standings from RAF API when season < 2025', async () => {
    mockRafClient.get.mockResolvedValue([makeRawStandingsResponse()]);
    const result = await service.getStandings('39');
    expect(mockRafClient.get).toHaveBeenCalledWith('standings', {
      league: '39',
      season: 2024,
    });
    expect(result).toHaveLength(1);
    expect(result[0].position).toBe(1);
  });

  it('should return cached standings when available', async () => {
    const cached = [{ position: 1, teamName: 'Leeds' }];
    mockCache.getCached.mockResolvedValue(cached);
    const result = await service.getStandings('39');
    expect(mockRafClient.get).not.toHaveBeenCalled();
    expect(result).toEqual(cached);
  });

  it('should return empty array when RAF API returns empty response', async () => {
    mockRafClient.get.mockResolvedValue([]);
    const result = await service.getStandings('39');
    expect(result).toEqual([]);
  });

  it('getGroupStandings returns every group table labelled with its group', async () => {
    // Override date spy to 2026 so getCurrentSeason would return 2025+ if called,
    // but getGroupStandings is independent of season — it always uses FDO.
    const response = {
      competition: { id: 2000, name: 'FIFA World Cup', code: 'WC' },
      season: {
        id: 1,
        startDate: '2026-06-11',
        endDate: '2026-07-19',
        currentMatchday: 1,
        winner: null,
      },
      standings: [
        {
          type: 'TOTAL',
          group: 'GROUP_A',
          table: [
            {
              position: 1,
              team: { id: 759, name: 'Brazil', crest: 'c' },
              playedGames: 1,
              won: 1,
              draw: 0,
              lost: 0,
              goalsFor: 2,
              goalsAgainst: 0,
              points: 3,
              form: null,
            },
          ],
        },
        {
          type: 'TOTAL',
          group: 'GROUP_B',
          table: [
            {
              position: 1,
              team: { id: 760, name: 'France', crest: 'c' },
              playedGames: 1,
              won: 1,
              draw: 0,
              lost: 0,
              goalsFor: 3,
              goalsAgainst: 1,
              points: 3,
              form: null,
            },
          ],
        },
      ],
    };

    mockCache.getCached.mockResolvedValue(null);
    mockFdoClient.get.mockResolvedValue(response);
    mockPrisma.league.findFirst.mockResolvedValue(null);
    mockPrisma.team.findFirst.mockResolvedValue(null);

    mockFdoNormalizer.normalizeStanding.mockImplementation(
      (
        entry: any,
        _leagueId: string,
        _leagueName: string,
        _teamId: any,
        group: string | null,
      ) => ({
        teamName: entry.team.name,
        group,
        position: entry.position,
        points: entry.points,
      }),
    );

    const result = await service.getGroupStandings('1');
    expect(result).toHaveLength(2);
    expect(result.map((r: any) => r.group)).toEqual(['GROUP_A', 'GROUP_B']);
    expect(result[0].teamName).toBe('Brazil');
  });
});
