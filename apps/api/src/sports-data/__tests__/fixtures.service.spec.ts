import { FixturesService } from '../services/fixtures.service';

describe('FixturesService', () => {
  let service: FixturesService;
  let mockClient: any;
  let mockNormalizer: any;
  let mockCache: any;

  beforeEach(() => {
    mockClient = { get: jest.fn() };
    mockNormalizer = {
      normalizeMatch: jest.fn((m: any) => ({
        externalId: m.match_id,
        homeTeam: { name: m.match_hometeam_name },
        awayTeam: { name: m.match_awayteam_name },
        status: 'FINISHED',
        sport: 'Football',
      })),
    };
    mockCache = {
      getCached: jest.fn().mockResolvedValue(null),
      setCached: jest.fn().mockResolvedValue(undefined),
    };
    service = new FixturesService(mockClient, mockNormalizer, mockCache);
  });

  it('should fetch events from API when cache is empty', async () => {
    mockClient.get.mockResolvedValue([
      {
        match_id: '1',
        match_hometeam_name: 'Leeds',
        match_awayteam_name: 'Sheffield',
      },
    ]);
    const result = await service.getFixtures('152', '2026-04-10', '2026-04-10');
    expect(mockClient.get).toHaveBeenCalledWith('get_events', {
      league_id: '152',
      from: '2026-04-10',
      to: '2026-04-10',
    });
    expect(result).toHaveLength(1);
  });

  it('should return cached data when available', async () => {
    const cached = [{ externalId: '1' }];
    mockCache.getCached.mockResolvedValue(cached);
    const result = await service.getFixtures('152', '2026-04-10', '2026-04-10');
    expect(mockClient.get).not.toHaveBeenCalled();
    expect(result).toEqual(cached);
  });
});
