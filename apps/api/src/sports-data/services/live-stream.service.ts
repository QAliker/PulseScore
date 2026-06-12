import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Observable, Subject } from 'rxjs';
import { EspnClient } from '../client/espn.client';
import { EspnLiveNormalizer } from '../normalizer/espn-live.normalizer';
import { SportsDataCacheService, TTL_LIVE } from '../sports-data-cache.service';
import { MatchDto } from '../dto/match.dto';

// Leagues polled for live scores. ESPN has no working "all" aggregate, so we
// fan out across a curated slug list and keep matches that are in-progress.
export const LIVE_LEAGUE_SLUGS = [
  'eng.1',
  'eng.2',
  'eng.fa',
  'esp.1',
  'esp.2',
  'esp.copa_del_rey',
  'ita.1',
  'ger.1',
  'ger.2',
  'fra.1',
  'ned.1',
  'por.1',
  'usa.1',
  'mex.1',
  'bra.1',
  'arg.1',
  'tur.1',
  'sco.1',
  'bel.1',
  'uefa.champions',
  'uefa.europa',
  'uefa.europa.conf',
  // World Cup — the only live football during the June/July summer window when
  // every domestic league above is in off-season. Without it the live feed is
  // empty for the whole tournament.
  'fifa.world',
];

@Injectable()
export class LiveStreamService {
  private readonly logger = new Logger(LiveStreamService.name);
  private readonly subject = new Subject<MatchDto[]>();

  constructor(
    private readonly client: EspnClient,
    private readonly normalizer: EspnLiveNormalizer,
    private readonly cache: SportsDataCacheService,
  ) {}

  @Interval(30_000)
  async poll(): Promise<void> {
    try {
      const matches = await this.fetchLive();
      await this.cache.setCached(
        SportsDataCacheService.livescoresKey(),
        matches,
        TTL_LIVE,
      );
      this.subject.next(matches);
      this.logger.debug(`Live poll: ${matches.length} in-progress matches`);
    } catch (err) {
      this.logger.warn(
        `Live poll failed, keeping last snapshot: ${String(err)}`,
      );
    }
  }

  private async fetchLive(): Promise<MatchDto[]> {
    const results = await Promise.allSettled(
      LIVE_LEAGUE_SLUGS.map((slug) => this.client.getScoreboard(slug)),
    );

    const anyOk = results.some((r) => r.status === 'fulfilled');
    if (!anyOk) {
      throw new Error('all ESPN league fetches failed');
    }

    // Dev-only: LIVE_INCLUDE_ALL=1 keeps every match (scheduled/finished too) so
    // the UI can be exercised when nothing is actually in progress.
    const includeAll = process.env.LIVE_INCLUDE_ALL === '1';

    const matches: MatchDto[] = [];
    for (const result of results) {
      if (result.status !== 'fulfilled') continue;
      for (const match of this.normalizer.toMatchDtos(result.value)) {
        if (includeAll || match.status === 'LIVE') matches.push(match);
      }
    }
    return matches;
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
