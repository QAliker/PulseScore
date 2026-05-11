import { FootballDataOrgClient } from '../client/football-data-org.client';
import { ConfigService } from '@nestjs/config';

const mockConfigService = {
  get: jest.fn().mockReturnValue('test-token'),
} as unknown as ConfigService;

describe('FootballDataOrgClient', () => {
  let client: FootballDataOrgClient;

  beforeEach(() => {
    client = new FootballDataOrgClient(mockConfigService);
    global.fetch = jest.fn();
  });

  afterEach(() => jest.resetAllMocks());

  it('calls correct URL with X-Auth-Token header', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ matches: [] }),
    });

    await client.get<{ matches: unknown[] }>('competitions/PL/matches', { matchday: '5' });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.football-data.org/v4/competitions/PL/matches?matchday=5',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Auth-Token': 'test-token' }),
      }),
    );
  });

  it('throws on non-ok response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    });

    await expect(
      client.get('competitions/PL/matches'),
    ).rejects.toThrow('football-data.org request failed: 429 Too Many Requests');
  });
});
