import { Injectable, Logger } from '@nestjs/common';
import { ApiFootballClient } from '../client/api-football.client';
import {
  SportsDataCacheService,
  TTL_FIXTURES,
} from '../sports-data-cache.service';
import { RafSidelinedResponse } from '../interfaces/api-football.interfaces';
import { SidelinedDto } from '../dto/sidelined.dto';

@Injectable()
export class SidelinedService {
  private readonly logger = new Logger(SidelinedService.name);

  constructor(
    private readonly client: ApiFootballClient,
    private readonly cacheService: SportsDataCacheService,
  ) {}

  async getByPlayer(playerId: string): Promise<SidelinedDto[]> {
    const cacheKey = `sports:sidelined:player:${playerId}`;
    const cached = await this.cacheService.getCached<SidelinedDto[]>(cacheKey);
    if (cached) return cached;

    const raw = await this.client.get<RafSidelinedResponse>('sidelined', {
      player: playerId,
    });

    const items = raw.map((r) => this.toDto(r));
    await this.cacheService.setCached(cacheKey, items, TTL_FIXTURES);
    return items;
  }

  async getByCoach(coachId: string): Promise<SidelinedDto[]> {
    const cacheKey = `sports:sidelined:coach:${coachId}`;
    const cached = await this.cacheService.getCached<SidelinedDto[]>(cacheKey);
    if (cached) return cached;

    const raw = await this.client.get<RafSidelinedResponse>('sidelined', {
      coach: coachId,
    });

    const items = raw.map((r) => this.toDto(r));
    await this.cacheService.setCached(cacheKey, items, TTL_FIXTURES);
    return items;
  }

  private toDto(r: RafSidelinedResponse): SidelinedDto {
    const dto = new SidelinedDto();
    dto.playerName = r.player.name;
    dto.type = r.player.type;
    dto.start = r.start;
    dto.end = r.end;
    return dto;
  }
}
