import { ApiFootballClient } from '../client/api-football.client';
import { ConfigService } from '@nestjs/config';

describe('ApiFootballClient', () => {
  let client: ApiFootballClient;

  beforeEach(() => {
    const mockConfigService: Partial<ConfigService> = {
      get: jest.fn((key: string) => {
        if (key === 'RAPIDAPI_KEY') return 'test-rapidapi-key';
        return undefined;
      }),
    };
    client = new ApiFootballClient(mockConfigService as ConfigService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('get', () => {
    it('should call fetch with correct RapidAPI URL and headers', async () => {
      jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: [{ fixture: { id: 1 } }] }),
      } as Response);

      const result = await client.get('fixtures', { league: '40', season: 2025 });

      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      const [calledUrl, calledInit] = (globalThis.fetch as jest.Mock).mock.calls[0];
      expect(calledUrl).toContain('https://api-football-v1.p.rapidapi.com/v3/fixtures');
      expect(calledUrl).toContain('league=40');
      expect(calledUrl).toContain('season=2025');
      expect(calledInit.headers['x-rapidapi-key']).toBe('test-rapidapi-key');
      expect(calledInit.headers['x-rapidapi-host']).toBe('api-football-v1.p.rapidapi.com');
      expect(result).toHaveLength(1);
    });

    it('should throw on non-ok response', async () => {
      jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      } as Response);

      await expect(client.get('fixtures', {})).rejects.toThrow(
        'API-Football request failed: 403 Forbidden',
      );
    });

    it('should return unwrapped response array', async () => {
      const mockData = [{ fixture: { id: 1 } }, { fixture: { id: 2 } }];
      jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: mockData, results: 2, errors: [] }),
      } as Response);

      const result = await client.get('fixtures', {});
      expect(result).toEqual(mockData);
    });

    it('should throw on API error response object', async () => {
      jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: [],
          errors: { token: 'Error/Missing application key' },
        }),
      } as Response);

      await expect(client.get('fixtures', {})).rejects.toThrow('API-Football error');
    });

    it('should return empty array when response is null', async () => {
      jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: null, errors: [] }),
      } as Response);

      const result = await client.get('fixtures', {});
      expect(result).toEqual([]);
    });
  });
});
