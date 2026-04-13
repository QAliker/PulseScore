import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ApiFootballClient } from '../client/api-football.client';
import { ApiFootballNormalizer } from '../normalizer/api-football.normalizer';
import { SportsDataCacheService, TTL_FIXTURES } from '../sports-data-cache.service';
import { AfMatch } from '../interfaces/api-football.interfaces';
import { MatchDto } from '../dto/match.dto';

const LEAGUE_IDS = ['152', '168']; // Championship, Ligue 2

@Injectable()
export class FixturesService {
  private readonly logger = new Logger(FixturesService.name);

  constructor(
    private readonly client: ApiFootballClient,
    private readonly normalizer: ApiFootballNormalizer,
    private readonly cacheService: SportsDataCacheService,
  ) {}

  async getFixtures(leagueId: string, from: string, to: string): Promise<MatchDto[]> {
    const cacheKey = SportsDataCacheService.fixturesKey(leagueId, from, to);
    const cached = await this.cacheService.getCached<MatchDto[]>(cacheKey);
    if (cached) return cached;

    const raw = await this.client.get<AfMatch[]>('get_events', {
      league_id: leagueId,
      from,
      to,
    });

    if (!Array.isArray(raw)) return [];

    const fixtures = raw.map((m) => this.normalizer.normalizeMatch(m));
    await this.cacheService.setCached(cacheKey, fixtures, TTL_FIXTURES);
    return fixtures;
  }

  @Cron('0 */6 * * *')
  async refreshFixtures(): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    for (const leagueId of LEAGUE_IDS) {
      try {
        this.logger.log(`Refreshing fixtures for league ${leagueId}`);
        await this.cacheService.invalidate(
          SportsDataCacheService.fixturesKey(leagueId, today, nextWeek),
        );
        await this.getFixtures(leagueId, today, nextWeek);
      } catch (err) {
        this.logger.error(`Failed to refresh fixtures for league ${leagueId}: ${String(err)}`);
      }
    }
  }
}
