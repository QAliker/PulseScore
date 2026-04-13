import { Injectable, Logger } from '@nestjs/common';
import { ApiFootballClient } from '../client/api-football.client';
import { ApiFootballNormalizer } from '../normalizer/api-football.normalizer';
import { SportsDataCacheService, TTL_H2H } from '../sports-data-cache.service';
import { AfH2H } from '../interfaces/api-football.interfaces';
import { H2hDto } from '../dto/h2h.dto';

@Injectable()
export class H2hService {
  private readonly logger = new Logger(H2hService.name);

  constructor(
    private readonly client: ApiFootballClient,
    private readonly normalizer: ApiFootballNormalizer,
    private readonly cacheService: SportsDataCacheService,
  ) {}

  async getH2H(teamId1: string, teamId2: string): Promise<H2hDto> {
    const cacheKey = SportsDataCacheService.h2hKey(teamId1, teamId2);
    const cached = await this.cacheService.getCached<H2hDto>(cacheKey);
    if (cached) return cached;

    const raw = await this.client.get<AfH2H>('get_H2H', {
      firstTeamId: teamId1,
      secondTeamId: teamId2,
    });

    const dto = new H2hDto();
    dto.headToHead = (raw.firstTeam_VS_secondTeam ?? []).map((m) => this.normalizer.normalizeMatch(m));
    dto.firstTeamResults = (raw.firstTeam_lastResults ?? []).map((m) => this.normalizer.normalizeMatch(m));
    dto.secondTeamResults = (raw.secondTeam_lastResults ?? []).map((m) => this.normalizer.normalizeMatch(m));

    await this.cacheService.setCached(cacheKey, dto, TTL_H2H);
    return dto;
  }
}
