import { Injectable, Logger } from '@nestjs/common';
import { ApiFootballClient } from '../client/api-football.client';
import { SportsDataCacheService, TTL_ODDS } from '../sports-data-cache.service';
import { RafOddsResponse } from '../interfaces/api-football.interfaces';
import { OddsDto } from '../dto/odds.dto';

@Injectable()
export class OddsService {
  private readonly logger = new Logger(OddsService.name);

  constructor(
    private readonly client: ApiFootballClient,
    private readonly cacheService: SportsDataCacheService,
  ) {}

  async getOdds(fixtureId: string): Promise<OddsDto[]> {
    const cacheKey = SportsDataCacheService.oddsKey(fixtureId);
    const cached = await this.cacheService.getCached<OddsDto[]>(cacheKey);
    if (cached) return cached;

    const raw = await this.client.get<RafOddsResponse>('odds', {
      fixture: fixtureId,
    });

    const odds = raw.flatMap((r) =>
      r.bookmakers.map((b) => {
        const matchWinner = b.bets.find((bet) => bet.name === 'Match Winner');
        const home = matchWinner?.values.find((v) => v.value === 'Home');
        const draw = matchWinner?.values.find((v) => v.value === 'Draw');
        const away = matchWinner?.values.find((v) => v.value === 'Away');

        const dto = new OddsDto();
        dto.matchId = fixtureId;
        dto.bookmaker = b.name;
        dto.updatedAt = r.update;
        dto.home = home?.odd ?? null;
        dto.draw = draw?.odd ?? null;
        dto.away = away?.odd ?? null;
        dto.btsYes = null;
        dto.btsNo = null;
        return dto;
      }),
    );

    await this.cacheService.setCached(cacheKey, odds, TTL_ODDS);
    return odds;
  }

  async getLiveOdds(fixtureId: string): Promise<OddsDto[]> {
    const cacheKey = `${SportsDataCacheService.oddsKey(fixtureId)}:live`;
    const cached = await this.cacheService.getCached<OddsDto[]>(cacheKey);
    if (cached) return cached;

    const raw = await this.client.get<RafOddsResponse>('odds/live', {
      fixture: fixtureId,
    });

    const odds = raw.flatMap((r) =>
      r.bookmakers.map((b) => {
        const matchWinner = b.bets.find((bet) => bet.name === 'Match Winner');
        const home = matchWinner?.values.find((v) => v.value === 'Home');
        const draw = matchWinner?.values.find((v) => v.value === 'Draw');
        const away = matchWinner?.values.find((v) => v.value === 'Away');

        const dto = new OddsDto();
        dto.matchId = fixtureId;
        dto.bookmaker = b.name;
        dto.updatedAt = r.update;
        dto.home = home?.odd ?? null;
        dto.draw = draw?.odd ?? null;
        dto.away = away?.odd ?? null;
        dto.btsYes = null;
        dto.btsNo = null;
        return dto;
      }),
    );

    await this.cacheService.setCached(cacheKey, odds, 30);
    return odds;
  }
}
