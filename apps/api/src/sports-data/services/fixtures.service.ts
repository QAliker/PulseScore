import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ApiFootballClient } from '../client/api-football.client';
import { ApiFootballNormalizer } from '../normalizer/api-football.normalizer';
import {
  SportsDataCacheService,
  TTL_FIXTURES,
} from '../sports-data-cache.service';
import { AfMatch } from '../interfaces/api-football.interfaces';
import { MatchDto } from '../dto/match.dto';

const LEAGUE_IDS = ['153', '164']; // Championship, Ligue 2

@Injectable()
export class FixturesService {
  private readonly logger = new Logger(FixturesService.name);

  constructor(
    private readonly client: ApiFootballClient,
    private readonly normalizer: ApiFootballNormalizer,
    private readonly cacheService: SportsDataCacheService,
  ) {}

  async getFixtures(
    leagueId: string,
    from: string,
    to: string,
  ): Promise<MatchDto[]> {
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

  async getTeamResults(teamId: string, limit = 10, offset = 0): Promise<MatchDto[]> {
    const cacheKey = SportsDataCacheService.teamResultsKey(teamId);
    const cached = await this.cacheService.getCached<MatchDto[]>(cacheKey);
    if (cached) return cached.slice(offset, offset + limit);

    const today = new Date().toISOString().slice(0, 10);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);

    const raw = await this.client.get<AfMatch[]>('get_events', {
      team_id: teamId,
      from: ninetyDaysAgo,
      to: today,
    });

    if (!Array.isArray(raw)) return [];

    const results = raw
      .map((m) => this.normalizer.normalizeMatch(m))
      .filter((m) => m.status === 'FINISHED')
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    await this.cacheService.setCached(cacheKey, results, TTL_FIXTURES);
    return results.slice(offset, offset + limit);
  }

  async getTeamFixtures(teamId: string): Promise<MatchDto[]> {
    const cacheKey = SportsDataCacheService.teamFixturesKey(teamId);
    const cached = await this.cacheService.getCached<MatchDto[]>(cacheKey);
    if (cached) return cached;

    const today = new Date().toISOString().slice(0, 10);
    const thirtyDaysAhead = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    const raw = await this.client.get<AfMatch[]>('get_events', {
      team_id: teamId,
      from: today,
      to: thirtyDaysAhead,
    });

    if (!Array.isArray(raw)) return [];

    const fixtures = raw
      .map((m) => this.normalizer.normalizeMatch(m))
      .filter((m) => m.status === 'SCHEDULED')
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    await this.cacheService.setCached(cacheKey, fixtures, TTL_FIXTURES);
    return fixtures;
  }

  async getLeagueResults(leagueId: string): Promise<MatchDto[]> {
    const cacheKey = SportsDataCacheService.leagueResultsKey(leagueId);
    const cached = await this.cacheService.getCached<MatchDto[]>(cacheKey);
    if (cached) return cached;

    const today = new Date().toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    const raw = await this.client.get<AfMatch[]>('get_events', {
      league_id: leagueId,
      from: thirtyDaysAgo,
      to: today,
    });

    if (!Array.isArray(raw)) return [];

    const results = raw
      .map((m) => this.normalizer.normalizeMatch(m))
      .filter((m) => m.status === 'FINISHED')
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    await this.cacheService.setCached(cacheKey, results, TTL_FIXTURES);
    return results;
  }

  async getMatchById(matchId: string): Promise<MatchDto | null> {
    const cacheKey = `sports:match:${matchId}`;
    const cached = await this.cacheService.getCached<MatchDto>(cacheKey);
    if (cached) return cached;

    const raw = await this.client.get<AfMatch[]>('get_events', { match_id: matchId });
    if (!Array.isArray(raw) || raw.length === 0) return null;

    const match = this.normalizer.normalizeMatch(raw[0]);
    const ttl = match.status === 'LIVE' ? 30 : match.status === 'FINISHED' ? 3600 : 300;
    await this.cacheService.setCached(cacheKey, match, ttl);
    return match;
  }

  async getLeagueFixtures(leagueId: string): Promise<MatchDto[]> {
    const cacheKey = SportsDataCacheService.leagueFixturesKey(leagueId);
    const cached = await this.cacheService.getCached<MatchDto[]>(cacheKey);
    if (cached) return cached;

    const today = new Date().toISOString().slice(0, 10);
    const thirtyDaysAhead = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    const raw = await this.client.get<AfMatch[]>('get_events', {
      league_id: leagueId,
      from: today,
      to: thirtyDaysAhead,
    });

    if (!Array.isArray(raw)) return [];

    const fixtures = raw
      .map((m) => this.normalizer.normalizeMatch(m))
      .filter((m) => m.status === 'SCHEDULED')
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    await this.cacheService.setCached(cacheKey, fixtures, TTL_FIXTURES);
    return fixtures;
  }

  @Cron('0 */6 * * *')
  async refreshFixtures(): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    for (const leagueId of LEAGUE_IDS) {
      try {
        this.logger.log(`Refreshing fixtures for league ${leagueId}`);
        await this.cacheService.invalidate(
          SportsDataCacheService.fixturesKey(leagueId, today, nextWeek),
        );
        await this.getFixtures(leagueId, today, nextWeek);
      } catch (err) {
        this.logger.error(
          `Failed to refresh fixtures for league ${leagueId}: ${String(err)}`,
        );
      }
    }
  }
}
