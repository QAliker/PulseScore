import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TeamsService } from './teams.service';
import { PlayerDto } from '../dto/player.dto';
import { ApiFootballClient } from '../client/api-football.client';
import { FootballDataOrgClient } from '../client/football-data-org.client';
import { ApiFootballNormalizer } from '../normalizer/api-football.normalizer';
import {
  SportsDataCacheService,
  TTL_TEAMS,
} from '../sports-data-cache.service';
import { RafPlayerResponse } from '../interfaces/api-football.interfaces';
import type {
  FdoTeamDetail,
  FdoSquadPlayer,
  FdoPersonDetail,
} from '../interfaces/football-data-org.interfaces';

const FDO_POSITION_MAP: Record<string, string> = {
  Goalkeeper: 'Goalkeeper',
  Defence: 'Defender',
  Midfield: 'Midfielder',
  Offence: 'Forward',
  Attacker: 'Forward',
  Defender: 'Defender',
  Midfielder: 'Midfielder',
  Forward: 'Forward',
};

type PrismaPlayer = {
  externalId: string;
  name: string;
  image: string | null;
  number: number | null;
  position: string | null;
  age: number | null;
  teamId: string | null;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  matchesPlayed: number;
  rating: string | null;
};

@Injectable()
export class PlayersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamsService: TeamsService,
    private readonly client: ApiFootballClient,
    private readonly fdoClient: FootballDataOrgClient,
    private readonly normalizer: ApiFootballNormalizer,
    private readonly cacheService: SportsDataCacheService,
  ) {}

  async getByExternalId(
    externalId: string,
  ): Promise<
    (PlayerDto & { teamName: string | null; teamLogo: string | null }) | null
  > {
    if (externalId.startsWith('fdo:')) {
      return this.getByFdoPersonId(externalId.slice(4));
    }
    const p = await this.prisma.player.findUnique({
      where: { externalId },
      include: { team: true },
    });
    if (!p) return null;
    return {
      ...this.toDto(p),
      teamName: p.team?.name ?? null,
      teamLogo: p.team?.logo ?? null,
    };
  }

  private async getByFdoPersonId(
    fdoId: string,
  ): Promise<
    (PlayerDto & { teamName: string | null; teamLogo: string | null }) | null
  > {
    const cacheKey = `sports:player:fdo:${fdoId}`;
    const cached = await this.cacheService.getCached<
      PlayerDto & { teamName: string | null; teamLogo: string | null }
    >(cacheKey);
    if (cached) return cached;

    const person = await this.fdoClient
      .get<FdoPersonDetail>(`persons/${fdoId}`)
      .catch(() => null);
    if (!person) return null;

    const dto = new PlayerDto();
    dto.externalId = `fdo:${person.id}`;
    dto.name = person.name;
    dto.image = null;
    dto.number = person.shirtNumber ?? null;
    dto.position = person.position
      ? (FDO_POSITION_MAP[person.position] ?? person.position)
      : null;
    dto.age = person.dateOfBirth
      ? Math.floor(
          (Date.now() - new Date(person.dateOfBirth).getTime()) /
            (1000 * 60 * 60 * 24 * 365.25),
        )
      : null;
    dto.teamId = person.currentTeam
      ? `fdo:${person.currentTeam.id}`
      : null;
    dto.goals = 0;
    dto.assists = 0;
    dto.yellowCards = 0;
    dto.redCards = 0;
    dto.matchesPlayed = 0;
    dto.rating = null;

    const result = {
      ...dto,
      teamName: person.currentTeam?.name ?? null,
      teamLogo: person.currentTeam?.crest ?? null,
    };
    await this.cacheService.setCached(cacheKey, result, TTL_TEAMS);
    return result;
  }

  async getByTeam(teamExternalId: string): Promise<PlayerDto[]> {
    const rawFdoId = teamExternalId.startsWith('fdo:')
      ? teamExternalId.slice(4)
      : null;
    const team = await this.prisma.team.findFirst({
      where: rawFdoId
        ? { fdoExternalId: rawFdoId }
        : {
            OR: [
              { externalId: teamExternalId },
              { fdoExternalId: teamExternalId },
            ],
          },
    });
    if (!team) return [];

    if (team.fdoExternalId) {
      return this.getSquadFromFdo(team.fdoExternalId);
    }

    const players = await this.prisma.player.findMany({
      where: { team: { id: team.id } },
      orderBy: [{ number: 'asc' }, { name: 'asc' }],
    });
    if (players.length === 0) {
      await this.teamsService.fetchPlayersForTeam(team.externalId);
      const fresh = await this.prisma.player.findMany({
        where: { team: { id: team.id } },
        orderBy: [{ number: 'asc' }, { name: 'asc' }],
      });
      return fresh.map((p) => this.toDto(p));
    }
    return players.map((p) => this.toDto(p));
  }

  private async getSquadFromFdo(fdoTeamId: string): Promise<PlayerDto[]> {
    const cacheKey = `sports:squad:fdo:${fdoTeamId}`;
    const cached = await this.cacheService.getCached<PlayerDto[]>(cacheKey);
    if (cached) return cached;

    const detail = await this.fdoClient
      .get<FdoTeamDetail>(`teams/${fdoTeamId}`)
      .catch(() => null);
    if (!detail) return [];

    const players = (detail.squad ?? []).map((p: FdoSquadPlayer) => {
      const dto = new PlayerDto();
      dto.externalId = `fdo:${p.id}`;
      dto.name = p.name;
      dto.image = null;
      dto.number = p.shirtNumber ?? null;
      dto.position = p.position
        ? (FDO_POSITION_MAP[p.position] ?? p.position)
        : null;
      dto.age = p.dateOfBirth
        ? Math.floor(
            (Date.now() - new Date(p.dateOfBirth).getTime()) /
              (1000 * 60 * 60 * 24 * 365.25),
          )
        : null;
      dto.teamId = null;
      dto.goals = 0;
      dto.assists = 0;
      dto.yellowCards = 0;
      dto.redCards = 0;
      dto.matchesPlayed = 0;
      dto.rating = null;
      return dto;
    });

    players.sort((a, b) => {
      const posOrder = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'];
      const ai = posOrder.indexOf(a.position ?? '');
      const bi = posOrder.indexOf(b.position ?? '');
      if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      return (a.number ?? 99) - (b.number ?? 99);
    });

    await this.cacheService.setCached(cacheKey, players, TTL_TEAMS);
    return players;
  }

  async getTopscorers(league: string, season: string): Promise<PlayerDto[]> {
    const cacheKey = `sports:topscorers:${league}:${season}`;
    const cached = await this.cacheService.getCached<PlayerDto[]>(cacheKey);
    if (cached) return cached;

    const raw = await this.client.get<RafPlayerResponse>('players/topscorers', {
      league,
      season,
    });

    const players = raw.map((r) => this.normalizer.normalizePlayer(r));
    await this.cacheService.setCached(cacheKey, players, TTL_TEAMS);
    return players;
  }

  async getProfiles(params: {
    league?: string;
    season?: string;
    page?: string;
  }): Promise<{ data: PlayerDto[]; totalPages: number }> {
    const cacheKey = `sports:player:profiles:${JSON.stringify(params)}`;
    const cached = await this.cacheService.getCached<{
      data: PlayerDto[];
      totalPages: number;
    }>(cacheKey);
    if (cached) return cached;

    const queryParams: Record<string, string | number> = {};
    if (params.league) queryParams.league = params.league;
    if (params.season) queryParams.season = params.season;
    if (params.page) queryParams.page = params.page;

    const { data: raw, totalPages } =
      await this.client.getPage<RafPlayerResponse>(
        'players/profiles',
        queryParams,
      );

    const result = {
      data: raw.map((r) => this.normalizer.normalizePlayer(r)),
      totalPages,
    };
    await this.cacheService.setCached(cacheKey, result, TTL_TEAMS);
    return result;
  }

  private toDto(p: PrismaPlayer): PlayerDto {
    const dto = new PlayerDto();
    dto.externalId = p.externalId;
    dto.name = p.name;
    dto.image = p.image;
    dto.number = p.number;
    dto.position = p.position;
    dto.age = p.age;
    dto.teamId = p.teamId;
    dto.goals = p.goals;
    dto.assists = p.assists;
    dto.yellowCards = p.yellowCards;
    dto.redCards = p.redCards;
    dto.matchesPlayed = p.matchesPlayed;
    dto.rating = p.rating;
    return dto;
  }
}
