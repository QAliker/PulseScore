import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { LiveStreamService } from './live-stream.service';
import { EspnClient } from '../client/espn.client';
import { EspnLiveNormalizer } from '../normalizer/espn-live.normalizer';
import { SportsDataCacheService } from '../sports-data-cache.service';
import { MatchDto } from '../dto/match.dto';

function fakeMatch(id: string, status: MatchDto['status'] = 'LIVE'): MatchDto {
  const m = new MatchDto();
  m.id = id;
  m.externalId = id;
  m.status = status;
  return m;
}

describe('LiveStreamService', () => {
  let client: { getScoreboard: jest.Mock };
  let normalizer: { toMatchDtos: jest.Mock };
  let cache: { getCached: jest.Mock; setCached: jest.Mock };
  let service: LiveStreamService;

  beforeEach(() => {
    client = { getScoreboard: jest.fn() };
    normalizer = { toMatchDtos: jest.fn().mockReturnValue([]) };
    cache = { getCached: jest.fn(), setCached: jest.fn() };
    service = new LiveStreamService(
      client as unknown as EspnClient,
      normalizer as unknown as EspnLiveNormalizer,
      cache as unknown as SportsDataCacheService,
    );
  });

  it('caches only LIVE matches and emits them on the subject', async () => {
    const live = fakeMatch('espn:1', 'LIVE');
    const finished = fakeMatch('espn:2', 'FINISHED');
    client.getScoreboard.mockResolvedValue({ events: [] });
    // First league yields a live + finished match; rest yield nothing.
    normalizer.toMatchDtos.mockReturnValueOnce([live, finished]);

    const emitted = firstValueFrom(service.stream().pipe(take(1)));
    await service.poll();

    await expect(emitted).resolves.toEqual([live]);
    expect(cache.setCached).toHaveBeenCalledWith(
      SportsDataCacheService.livescoresKey(),
      [live],
      30,
    );
  });

  it('keeps previous snapshot when every league fetch fails', async () => {
    client.getScoreboard.mockRejectedValue(new Error('503'));
    const events: MatchDto[][] = [];
    const sub = service.stream().subscribe((v) => events.push(v));

    await service.poll();

    expect(events).toEqual([]);
    expect(cache.setCached).not.toHaveBeenCalled();
    sub.unsubscribe();
  });

  it('tolerates partial league failures', async () => {
    const live = fakeMatch('espn:7', 'LIVE');
    client.getScoreboard
      .mockResolvedValueOnce({ events: [] })
      .mockRejectedValue(new Error('boom'));
    normalizer.toMatchDtos.mockReturnValueOnce([live]);

    await service.poll();

    expect(cache.setCached).toHaveBeenCalledWith(
      SportsDataCacheService.livescoresKey(),
      [live],
      30,
    );
  });

  it('snapshot() returns the cached value or empty array', async () => {
    const matches = [fakeMatch('espn:9')];
    cache.getCached.mockResolvedValueOnce(matches);
    await expect(service.snapshot()).resolves.toEqual(matches);

    cache.getCached.mockResolvedValueOnce(null);
    await expect(service.snapshot()).resolves.toEqual([]);
  });
});
