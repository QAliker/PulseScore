import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Observable, Subject } from 'rxjs';
import { SofascoreClient } from '../client/sofascore.client';
import { SofascoreNormalizer } from '../normalizer/sofascore.normalizer';
import { SportsDataCacheService, TTL_LIVE } from '../sports-data-cache.service';
import { MatchDto } from '../dto/match.dto';

@Injectable()
export class LiveStreamService {
  private readonly logger = new Logger(LiveStreamService.name);
  private readonly subject = new Subject<MatchDto[]>();

  constructor(
    private readonly client: SofascoreClient,
    private readonly normalizer: SofascoreNormalizer,
    private readonly cache: SportsDataCacheService,
  ) {}

  @Interval(30_000)
  async poll(): Promise<void> {
    try {
      const res = await this.client.getLive();
      const matches = this.normalizer.toMatchDtos(res);
      await this.cache.setCached(
        SportsDataCacheService.livescoresKey(),
        matches,
        TTL_LIVE,
      );
      this.subject.next(matches);
    } catch (err) {
      this.logger.warn(
        `Live poll failed, keeping last snapshot: ${String(err)}`,
      );
    }
  }

  async snapshot(): Promise<MatchDto[]> {
    const cached = await this.cache.getCached<MatchDto[]>(
      SportsDataCacheService.livescoresKey(),
    );
    return cached ?? [];
  }

  stream(): Observable<MatchDto[]> {
    return this.subject.asObservable();
  }
}
