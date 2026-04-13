import { ApiFootballClient } from '../client/api-football.client';
import { ConfigService } from '@nestjs/config';

describe('ApiFootballClient', () => {
  let client: ApiFootballClient;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'APIFOOTBALL_API_KEY') return 'test-api-key';
        if (key === 'APIFOOTBALL_TIMEZONE') return 'Europe/Paris';
        return undefined;
      }),
    };
    client = new ApiFootballClient(mockConfigService as ConfigService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('get', () => {
    it('should call fetch with correct URL and API key', async () => {
      const mockResponse = [{ match_id: '1' }];
      jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await client.get('get_events', { from: '2026-04-10', to: '2026-04-10' });

      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      const calledUrl = (globalThis.fetch as jest.Mock).mock.calls[0][0];
      expect(calledUrl).toContain('https://apiv3.apifootball.com/?action=get_events');
      expect(calledUrl).toContain('APIkey=test-api-key');
      expect(calledUrl).toContain('from=2026-04-10');
      expect(calledUrl).toContain('to=2026-04-10');
      expect(result).toEqual(mockResponse);
    });

    it('should throw on non-ok response', async () => {
      jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      } as Response);

      await expect(client.get('get_events', {})).rejects.toThrow('APIFootball request failed: 403 Forbidden');
    });

    it('should return API error response as data', async () => {
      jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: 404, message: 'No events found' }),
      } as Response);

      const result = await client.get('get_events', {});
      expect(result).toEqual({ error: 404, message: 'No events found' });
    });

    it('should include timezone parameter', async () => {
      jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response);

      await client.get('get_standings', { league_id: '152' });

      const calledUrl = (globalThis.fetch as jest.Mock).mock.calls[0][0];
      expect(calledUrl).toContain('timezone=Europe%2FParis');
    });
  });
});
