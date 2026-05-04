import { OddsService } from '../services/odds.service';

describe('OddsService', () => {
  let service: OddsService;
  let mockClient: any;
  let mockCache: any;

  const makeRawOdds = (fixtureId: string) => ({
    league: {
      id: 40,
      name: 'Championship',
      country: 'England',
      logo: '',
      flag: '',
      season: 2025,
    },
    fixture: {
      id: parseInt(fixtureId),
      timezone: 'UTC',
      date: '2026-05-10',
      timestamp: 1000,
    },
    update: '2026-05-09T10:00:00Z',
    bookmakers: [
      {
        id: 6,
        name: 'Bet365',
        bets: [
          {
            id: 1,
            name: 'Match Winner',
            values: [
              { value: 'Home', odd: '1.5' },
              { value: 'Draw', odd: '3.2' },
              { value: 'Away', odd: '5.0' },
            ],
          },
        ],
      },
    ],
  });

  beforeEach(() => {
    mockClient = { get: jest.fn() };
    mockCache = {
      getCached: jest.fn().mockResolvedValue(null),
      setCached: jest.fn().mockResolvedValue(undefined),
    };
    service = new OddsService(mockClient, mockCache);
  });

  it('should fetch odds from API when cache is empty', async () => {
    mockClient.get.mockResolvedValue([makeRawOdds('123')]);
    const result = await service.getOdds('123');
    expect(mockClient.get).toHaveBeenCalledWith('odds', { fixture: '123' });
    expect(result).toHaveLength(1);
    expect(result[0].bookmaker).toBe('Bet365');
    expect(result[0].home).toBe('1.5');
    expect(result[0].draw).toBe('3.2');
    expect(result[0].away).toBe('5.0');
  });

  it('should return cached odds', async () => {
    const cached = [{ matchId: '123', bookmaker: 'Bet365' }];
    mockCache.getCached.mockResolvedValue(cached);
    const result = await service.getOdds('123');
    expect(mockClient.get).not.toHaveBeenCalled();
    expect(result).toEqual(cached);
  });

  it('should return empty array when no bookmakers have Match Winner bet', async () => {
    mockClient.get.mockResolvedValue([
      {
        ...makeRawOdds('123'),
        bookmakers: [
          {
            id: 6,
            name: 'Bet365',
            bets: [{ id: 2, name: 'Asian Handicap', values: [] }],
          },
        ],
      },
    ]);
    const result = await service.getOdds('123');
    expect(result).toHaveLength(1);
    expect(result[0].home).toBeNull();
  });
});
