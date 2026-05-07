import { Injectable, Logger } from '@nestjs/common';
import { ApiFootballClient } from '../client/api-football.client';
import { SportsDataCacheService, TTL_ODDS } from '../sports-data-cache.service';
import {
  RafOddsResponse,
  RafOddsBookmakerResponse,
  RafOddsBetResponse,
  RafOddsMappingResponse,
} from '../interfaces/api-football.interfaces';
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

  async getBookmakers(): Promise<RafOddsBookmakerResponse[]> {
    const cacheKey = 'sports:odds:bookmakers';
    const cached =
      await this.cacheService.getCached<RafOddsBookmakerResponse[]>(cacheKey);
    if (cached) return cached;

    const raw =
      await this.client.get<RafOddsBookmakerResponse>('odds/bookmakers');
    await this.cacheService.setCached(cacheKey, raw, 86400);
    return raw;
  }

  async getBets(): Promise<RafOddsBetResponse[]> {
    const cacheKey = 'sports:odds:bets';
    const cached =
      await this.cacheService.getCached<RafOddsBetResponse[]>(cacheKey);
    if (cached) return cached;

    const raw = await this.client.get<RafOddsBetResponse>('odds/bets');
    await this.cacheService.setCached(cacheKey, raw, 86400);
    return raw;
  }

  async getLiveBets(): Promise<RafOddsBetResponse[]> {
    const cacheKey = 'sports:odds:live:bets';
    const cached =
      await this.cacheService.getCached<RafOddsBetResponse[]>(cacheKey);
    if (cached) return cached;

    const raw = await this.client.get<RafOddsBetResponse>('odds/live/bets');
    await this.cacheService.setCached(cacheKey, raw, 86400);
    return raw;
  }

  async getMapping(params: {
    fixtureId?: string;
    league?: string;
    date?: string;
    page?: string;
  }): Promise<{ data: RafOddsMappingResponse[]; totalPages: number }> {
    const cacheKey = `sports:odds:mapping:${JSON.stringify(params)}`;
    const cached = await this.cacheService.getCached<{
      data: RafOddsMappingResponse[];
      totalPages: number;
    }>(cacheKey);
    if (cached) return cached;

    const queryParams: Record<string, string | number> = {};
    if (params.fixtureId) queryParams.fixture = params.fixtureId;
    if (params.league) queryParams.league = params.league;
    if (params.date) queryParams.date = params.date;
    if (params.page) queryParams.page = params.page;

    const result = await this.client.getPage<RafOddsMappingResponse>(
      'odds/mapping',
      queryParams,
    );
    await this.cacheService.setCached(cacheKey, result, TTL_ODDS);
    return result;
  }
}
