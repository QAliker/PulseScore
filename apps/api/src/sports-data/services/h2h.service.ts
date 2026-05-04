import { Injectable, Logger } from '@nestjs/common';
import { ApiFootballClient } from '../client/api-football.client';
import { ApiFootballNormalizer } from '../normalizer/api-football.normalizer';
import { SportsDataCacheService, TTL_H2H } from '../sports-data-cache.service';
import { RafFixture } from '../interfaces/api-football.interfaces';
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

    const raw = await this.client.get<RafFixture>('fixtures/headtohead', {
      h2h: `${teamId1}-${teamId2}`,
    });

    const allMatches = raw.map((m) => this.normalizer.normalizeFixture(m));

    const dto = new H2hDto();
    dto.headToHead = allMatches;
    dto.firstTeamResults = allMatches
      .filter(
        (m) =>
          m.homeTeam.externalId === teamId1 ||
          m.awayTeam.externalId === teamId1,
      )
      .slice(0, 5);
    dto.secondTeamResults = allMatches
      .filter(
        (m) =>
          m.homeTeam.externalId === teamId2 ||
          m.awayTeam.externalId === teamId2,
      )
      .slice(0, 5);

    await this.cacheService.setCached(cacheKey, dto, TTL_H2H);
    return dto;
  }
}
