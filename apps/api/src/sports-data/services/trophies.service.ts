import { Injectable, Logger } from '@nestjs/common';
import { ApiFootballClient } from '../client/api-football.client';
import {
  SportsDataCacheService,
  TTL_TEAMS,
} from '../sports-data-cache.service';
import { RafTrophyResponse } from '../interfaces/api-football.interfaces';
import { TrophyDto } from '../dto/trophy.dto';

@Injectable()
export class TrophiesService {
  private readonly logger = new Logger(TrophiesService.name);

  constructor(
    private readonly client: ApiFootballClient,
    private readonly cacheService: SportsDataCacheService,
  ) {}

  async getByPlayer(playerId: string): Promise<TrophyDto[]> {
    const cacheKey = `sports:trophies:player:${playerId}`;
    const cached = await this.cacheService.getCached<TrophyDto[]>(cacheKey);
    if (cached) return cached;

    const raw = await this.client.get<RafTrophyResponse>('trophies', {
      player: playerId,
    });

    const trophies = raw.map((r) => this.toDto(r));
    await this.cacheService.setCached(cacheKey, trophies, TTL_TEAMS);
    return trophies;
  }

  async getByCoach(coachId: string): Promise<TrophyDto[]> {
    const cacheKey = `sports:trophies:coach:${coachId}`;
    const cached = await this.cacheService.getCached<TrophyDto[]>(cacheKey);
    if (cached) return cached;

    const raw = await this.client.get<RafTrophyResponse>('trophies', {
      coach: coachId,
    });

    const trophies = raw.map((r) => this.toDto(r));
    await this.cacheService.setCached(cacheKey, trophies, TTL_TEAMS);
    return trophies;
  }

  private toDto(r: RafTrophyResponse): TrophyDto {
    const dto = new TrophyDto();
    dto.league = r.league;
    dto.country = r.country;
    dto.season = r.season;
    dto.place = r.place;
    dto.description = r.description;
    return dto;
  }
}
