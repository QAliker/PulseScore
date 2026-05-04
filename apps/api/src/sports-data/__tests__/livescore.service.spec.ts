import { LivescoreService } from '../services/livescore.service';

describe('LivescoreService (stub)', () => {
  let service: LivescoreService;

  beforeEach(() => {
    service = new LivescoreService();
  });

  it('getCurrent should return empty array', async () => {
    const result = await service.getCurrent();
    expect(result).toEqual([]);
  });

  it('liveMatches$ should be an observable', () => {
    expect(service.liveMatches$).toBeDefined();
    expect(typeof service.liveMatches$.subscribe).toBe('function');
  });
});
