import { Injectable, Logger } from '@nestjs/common';
import { ApiFootballClient } from '../client/api-football.client';
import {
  SportsDataCacheService,
  TTL_FIXTURES,
} from '../sports-data-cache.service';
import { RafInjuryResponse } from '../interfaces/api-football.interfaces';
import { InjuryDto } from '../dto/injury.dto';

@Injectable()
export class InjuriesService {
  private readonly logger = new Logger(InjuriesService.name);

  constructor(
    private readonly client: ApiFootballClient,
    private readonly cacheService: SportsDataCacheService,
  ) {}

  async getByFixture(fixtureId: string): Promise<InjuryDto[]> {
    const cacheKey = `sports:injuries:fixture:${fixtureId}`;
    const cached = await this.cacheService.getCached<InjuryDto[]>(cacheKey);
    if (cached) return cached;

    const raw = await this.client.get<RafInjuryResponse>('injuries', {
      fixture: fixtureId,
    });

    const injuries = raw.map((r) => this.toDto(r));
    await this.cacheService.setCached(cacheKey, injuries, TTL_FIXTURES);
    return injuries;
  }

  async getByTeam(teamId: string, season: number): Promise<InjuryDto[]> {
    const cacheKey = `sports:injuries:team:${teamId}:${season}`;
    const cached = await this.cacheService.getCached<InjuryDto[]>(cacheKey);
    if (cached) return cached;

    const raw = await this.client.get<RafInjuryResponse>('injuries', {
      team: teamId,
      season,
    });

    const injuries = raw.map((r) => this.toDto(r));
    await this.cacheService.setCached(cacheKey, injuries, TTL_FIXTURES);
    return injuries;
  }

  private toDto(r: RafInjuryResponse): InjuryDto {
    const dto = new InjuryDto();
    dto.playerId = r.player.id;
    dto.playerName = r.player.name;
    dto.type = r.player.type;
    dto.reason = r.player.reason;
    dto.teamId = r.team.id;
    dto.teamName = r.team.name;
    dto.teamLogo = r.team.logo;
    dto.fixtureId = r.fixture.id;
    dto.fixtureDate = r.fixture.date;
    dto.leagueId = r.league.id;
    dto.leagueName = r.league.name;
    dto.season = r.league.season;
    return dto;
  }
}
