import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { LiveStreamService } from './live-stream.service';
import { SofascoreClient } from '../client/sofascore.client';
import { SofascoreNormalizer } from '../normalizer/sofascore.normalizer';
import { SportsDataCacheService } from '../sports-data-cache.service';
import { MatchDto } from '../dto/match.dto';

function fakeMatch(id: string): MatchDto {
  const m = new MatchDto();
  m.id = id;
  m.externalId = id;
  m.status = 'LIVE';
  return m;
}

describe('LiveStreamService', () => {
  let client: { getLive: jest.Mock };
  let normalizer: { toMatchDtos: jest.Mock };
  let cache: { getCached: jest.Mock; setCached: jest.Mock };
  let service: LiveStreamService;

  beforeEach(() => {
    client = { getLive: jest.fn() };
    normalizer = { toMatchDtos: jest.fn() };
    cache = { getCached: jest.fn(), setCached: jest.fn() };
    service = new LiveStreamService(
      client as unknown as SofascoreClient,
      normalizer as unknown as SofascoreNormalizer,
      cache as unknown as SportsDataCacheService,
    );
  });

  it('writes snapshot to redis and emits on the subject', async () => {
    const matches = [fakeMatch('sofa:1')];
    client.getLive.mockResolvedValue({ events: [] });
    normalizer.toMatchDtos.mockReturnValue(matches);

    const emitted = firstValueFrom(service.stream().pipe(take(1)));
    await service.poll();

    await expect(emitted).resolves.toEqual(matches);
    expect(cache.setCached).toHaveBeenCalledWith(
      SportsDataCacheService.livescoresKey(),
      matches,
      30,
    );
  });

  it('keeps previous snapshot and does not emit on poll error', async () => {
    client.getLive.mockRejectedValue(new Error('503'));
    const events: MatchDto[][] = [];
    const sub = service.stream().subscribe((v) => events.push(v));

    await service.poll();

    expect(events).toEqual([]);
    expect(cache.setCached).not.toHaveBeenCalled();
    sub.unsubscribe();
  });

  it('snapshot() returns the cached value or empty array', async () => {
    const matches = [fakeMatch('sofa:9')];
    cache.getCached.mockResolvedValueOnce(matches);
    await expect(service.snapshot()).resolves.toEqual(matches);

    cache.getCached.mockResolvedValueOnce(null);
    await expect(service.snapshot()).resolves.toEqual([]);
  });
});
