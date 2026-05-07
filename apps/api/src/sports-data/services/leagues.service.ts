import { Injectable } from '@nestjs/common';
import { ApiFootballClient } from '../client/api-football.client';
import {
  SportsDataCacheService,
  TTL_TEAMS,
} from '../sports-data-cache.service';
import { RafLeagueResponse } from '../interfaces/api-football.interfaces';

@Injectable()
export class LeaguesService {
  constructor(
    private readonly client: ApiFootballClient,
    private readonly cacheService: SportsDataCacheService,
  ) {}

  async getLeagues(
    params: Record<string, string>,
  ): Promise<RafLeagueResponse[]> {
    const cacheKey = `sports:leagues:${new URLSearchParams(params).toString()}`;
    const cached =
      await this.cacheService.getCached<RafLeagueResponse[]>(cacheKey);
    if (cached) return cached;

    const raw = await this.client.get<RafLeagueResponse>('leagues', params);
    await this.cacheService.setCached(cacheKey, raw, TTL_TEAMS);
    return raw;
  }

  async getSeasons(): Promise<number[]> {
    const cacheKey = 'sports:leagues:seasons';
    const cached = await this.cacheService.getCached<number[]>(cacheKey);
    if (cached) return cached;

    const raw = await this.client.get<number>('leagues/seasons');
    await this.cacheService.setCached(cacheKey, raw, 86400);
    return raw;
  }

  async getTimezones(): Promise<string[]> {
    const cacheKey = 'sports:timezones';
    const cached = await this.cacheService.getCached<string[]>(cacheKey);
    if (cached) return cached;

    const raw = await this.client.get<string>('timezone');
    await this.cacheService.setCached(cacheKey, raw, 86400 * 7);
    return raw;
  }

  async getRounds(
    league: string,
    season: string,
    current?: string,
  ): Promise<string[]> {
    const cacheKey = `sports:rounds:${league}:${season}:${current ?? ''}`;
    const cached = await this.cacheService.getCached<string[]>(cacheKey);
    if (cached) return cached;

    const params: Record<string, string> = { league, season };
    if (current) params.current = current;

    const raw = await this.client.get<string>('fixtures/rounds', params);
    await this.cacheService.setCached(cacheKey, raw, TTL_TEAMS);
    return raw;
  }
}
