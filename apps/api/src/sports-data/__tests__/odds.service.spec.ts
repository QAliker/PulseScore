import { OddsService } from '../services/odds.service';

describe('OddsService', () => {
  let service: OddsService;
  let mockClient: any;
  let mockCache: any;

  beforeEach(() => {
    mockClient = { get: jest.fn() };
    mockCache = {
      getCached: jest.fn().mockResolvedValue(null),
      setCached: jest.fn().mockResolvedValue(undefined),
    };
    service = new OddsService(mockClient, mockCache);
  });

  it('should fetch odds from API when cache is empty', async () => {
    mockClient.get.mockResolvedValue([
      {
        match_id: '123',
        odd_bookmakers: 'Bet365',
        odd_1: '1.5',
        odd_x: '3.2',
        odd_2: '5.0',
        bts_yes: '1.8',
        bts_no: '2.0',
        odd_date: '2026-04-10',
      },
    ]);
    const result = await service.getOdds('123');
    expect(mockClient.get).toHaveBeenCalledWith('get_odds', {
      match_id: '123',
    });
    expect(result).toHaveLength(1);
    expect(result[0].bookmaker).toBe('Bet365');
    expect(result[0].home).toBe('1.5');
  });

  it('should return cached odds', async () => {
    const cached = [{ matchId: '123', bookmaker: 'Bet365' }];
    mockCache.getCached.mockResolvedValue(cached);
    const result = await service.getOdds('123');
    expect(mockClient.get).not.toHaveBeenCalled();
    expect(result).toEqual(cached);
  });
});
