import { H2hService } from '../services/h2h.service';

describe('H2hService', () => {
  let service: H2hService;
  let mockClient: any;
  let mockNormalizer: any;
  let mockCache: any;

  beforeEach(() => {
    mockClient = { get: jest.fn() };
    mockNormalizer = {
      normalizeMatch: jest.fn((m: any) => ({ externalId: m.match_id })),
    };
    mockCache = {
      getCached: jest.fn().mockResolvedValue(null),
      setCached: jest.fn().mockResolvedValue(undefined),
    };
    service = new H2hService(mockClient, mockNormalizer, mockCache);
  });

  it('should fetch H2H from API when cache is empty', async () => {
    mockClient.get.mockResolvedValue({
      firstTeam_VS_secondTeam: [{ match_id: '1' }],
      firstTeam_lastResults: [{ match_id: '2' }],
      secondTeam_lastResults: [{ match_id: '3' }],
    });
    const result = await service.getH2H('2627', '2637');
    expect(mockClient.get).toHaveBeenCalledWith('get_H2H', {
      firstTeamId: '2627',
      secondTeamId: '2637',
    });
    expect(result.headToHead).toHaveLength(1);
    expect(result.firstTeamResults).toHaveLength(1);
    expect(result.secondTeamResults).toHaveLength(1);
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
