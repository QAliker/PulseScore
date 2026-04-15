import { Injectable, Logger } from '@nestjs/common';
import { ApiFootballClient } from '../client/api-football.client';
import { SportsDataCacheService, TTL_ODDS } from '../sports-data-cache.service';
import { AfOdds } from '../interfaces/api-football.interfaces';
import { OddsDto } from '../dto/odds.dto';

@Injectable()
export class OddsService {
  private readonly logger = new Logger(OddsService.name);

  constructor(
    private readonly client: ApiFootballClient,
    private readonly cacheService: SportsDataCacheService,
  ) {}

  async getOdds(matchId: string): Promise<OddsDto[]> {
    const cacheKey = SportsDataCacheService.oddsKey(matchId);
    const cached = await this.cacheService.getCached<OddsDto[]>(cacheKey);
    if (cached) return cached;

    const raw = await this.client.get<AfOdds[]>('get_odds', {
      match_id: matchId,
    });

    if (!Array.isArray(raw)) return [];

    const odds = raw.map((o) => {
      const dto = new OddsDto();
      dto.matchId = o.match_id;
      dto.bookmaker = o.odd_bookmakers;
      dto.updatedAt = o.odd_date;
      dto.home = o.odd_1 || null;
      dto.draw = o.odd_x || null;
      dto.away = o.odd_2 || null;
      dto.btsYes = o.bts_yes || null;
      dto.btsNo = o.bts_no || null;
      return dto;
    });

    await this.cacheService.setCached(cacheKey, odds, TTL_ODDS);
    return odds;
  }
}
