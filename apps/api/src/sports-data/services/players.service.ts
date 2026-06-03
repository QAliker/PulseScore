import { Injectable, Logger, HttpException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PlayerDto } from '../dto/player.dto';
import { ApiFootballClient } from '../client/api-football.client';
import { FootballDataOrgClient } from '../client/football-data-org.client';
import { ApiFootballNormalizer } from '../normalizer/api-football.normalizer';
import {
  SportsDataCacheService,
  TTL_TEAMS,
} from '../sports-data-cache.service';
import { PlayerPhotoService } from './player-photo.service';
import { RafPlayerResponse } from '../interfaces/api-football.interfaces';
import type {
  FdoSquadPlayer,
  FdoPersonDetail,
  FdoCompetitionTeamsResponse,
} from '../interfaces/football-data-org.interfaces';
import { LEAGUE_MAP } from '../constants/season.constants';

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
  private readonly logger = new Logger(PlayersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly client: ApiFootballClient,
    private readonly fdoClient: FootballDataOrgClient,
    private readonly normalizer: ApiFootballNormalizer,
    private readonly cacheService: SportsDataCacheService,
    private readonly photoService: PlayerPhotoService,
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

    const ct = person.currentTeam ?? null;

    const dto = new PlayerDto();
    dto.externalId = `fdo:${person.id}`;
    dto.name = person.name;
    dto.firstName = person.firstName ?? null;
    dto.lastName = person.lastName ?? null;
    dto.image = await this.photoService.fetchPhoto(person.name);
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
    dto.nationality = person.nationality ?? null;
    dto.teamId = ct ? `fdo:${ct.id}` : null;
    dto.goals = 0;
    dto.assists = 0;
    dto.yellowCards = 0;
    dto.redCards = 0;
    dto.matchesPlayed = 0;
    dto.rating = null;
    dto.contractStart = ct?.contract?.start ?? null;
    dto.contractUntil = ct?.contract?.until ?? null;
    dto.teamName = ct?.name ?? null;
    dto.teamShortName = ct?.shortName ?? null;
    dto.teamTla = ct?.tla ?? null;
    dto.teamCrest = ct?.crest ?? null;
    dto.teamAddress = ct?.address ?? null;
    dto.teamWebsite = ct?.website ?? null;
    dto.teamVenue = ct?.venue ?? null;
    dto.teamFounded = ct?.founded ?? null;
    dto.teamColors = ct?.clubColors ?? null;
    dto.teamArea = ct?.area?.name ?? null;
    dto.teamAreaFlag = ct?.area?.flag ?? null;
    dto.teamCompetitions =
      ct?.runningCompetitions?.map((c) => ({
        name: c.name,
        code: c.code,
        type: c.type,
        emblem: c.emblem ?? null,
      })) ?? null;

    const result = {
      ...dto,
      teamName: ct?.name ?? null,
      teamLogo: ct?.crest ?? null,
    };
    await this.cacheService.setCached(cacheKey, result, TTL_TEAMS);
    return result;
  }

  async getByTeam(teamExternalId: string): Promise<PlayerDto[]> {
    this.logger.log(`[getByTeam] called with teamExternalId=${teamExternalId}`);
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
    if (!team) {
      this.logger.warn(
        `[getByTeam] team not found for teamExternalId=${teamExternalId}`,
      );
      return [];
    }
    this.logger.log(
      `[getByTeam] team found: id=${team.id} name=${team.name} externalId=${team.externalId} fdoExternalId=${team.fdoExternalId}`,
    );

    if (team.fdoExternalId) {
      return this.getSquadFromFdo(team.fdoExternalId, team.id);
    }

    this.logger.log(
      `[getByTeam] no fdoExternalId → using prisma players for teamId=${team.id}`,
    );
    const players = await this.prisma.player.findMany({
      where: { team: { id: team.id } },
      orderBy: [{ number: 'asc' }, { name: 'asc' }],
    });
    this.logger.log(
      `[getByTeam] prisma returned ${players.length} players for teamId=${team.id}`,
    );
    return players.map((p) => this.toDto(p));
  }

  private async getSquadFromFdo(
    fdoTeamId: string,
    teamId: string,
  ): Promise<PlayerDto[]> {
    const cacheKey = `sports:squad:fdo:${fdoTeamId}`;
    const cached = await this.cacheService.getCached<PlayerDto[]>(cacheKey);
    if (cached) {
      this.logger.log(`[squad] cache hit for fdoTeamId=${fdoTeamId}`);
      return cached;
    }

    const standing = await this.prisma.standing.findFirst({
      where: { teamId },
      include: { league: { select: { fdoExternalId: true, name: true } } },
      orderBy: { season: 'desc' },
    });
    this.logger.log(
      `[squad] fdoTeamId=${fdoTeamId} teamId=${teamId} standing=${JSON.stringify(standing ? { season: standing.season, leagueName: standing.league?.name, fdoCode: standing.league?.fdoExternalId } : null)}`,
    );

    const fdoCodes = standing?.league?.fdoExternalId
      ? [standing.league.fdoExternalId]
      : Object.values(LEAGUE_MAP).map((l) => l.fdoCode);

    if (!standing) {
      this.logger.warn(
        `[squad] no standing for teamId=${teamId} — trying all FDO codes: [${fdoCodes.join(', ')}]`,
      );
    }

    let teamData: FdoCompetitionTeamsResponse['teams'][number] | undefined;
    for (const fdoCode of fdoCodes) {
      const response = await this.fdoClient
        .get<FdoCompetitionTeamsResponse>(`competitions/${fdoCode}/teams`)
        .catch((err: unknown) => {
          if (err instanceof HttpException && err.getStatus() === 429)
            throw err;
          this.logger.error(
            `[squad] FDO competitions/${fdoCode}/teams failed: ${String(err)}`,
          );
          return null;
        });
      if (!response) continue;
      const found = response.teams.find((t) => String(t.id) === fdoTeamId);
      if (found) {
        this.logger.log(
          `[squad] found fdoTeamId=${fdoTeamId} in competition=${fdoCode} squadLen=${found.squad?.length ?? 0}`,
        );
        teamData = found;
        break;
      }
    }

    if (!teamData) {
      this.logger.warn(
        `[squad] fdoTeamId=${fdoTeamId} NOT found in any FDO competition`,
      );
      return [];
    }
    if (!teamData.squad?.length) {
      this.logger.warn(
        `[squad] fdoTeamId=${fdoTeamId} found but squad is EMPTY in FDO response`,
      );
      return [];
    }

    const players = teamData.squad.map((p: FdoSquadPlayer) => {
      const dto = new PlayerDto();
      dto.externalId = `fdo:${p.id}`;
      dto.name = p.name;
      dto.firstName = null;
      dto.lastName = null;
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
      dto.nationality = p.nationality ?? null;
      dto.teamId = null;
      dto.goals = 0;
      dto.assists = 0;
      dto.yellowCards = 0;
      dto.redCards = 0;
      dto.matchesPlayed = 0;
      dto.rating = null;
      dto.contractStart = null;
      dto.contractUntil = null;
      dto.teamName = null;
      dto.teamShortName = null;
      dto.teamTla = null;
      dto.teamCrest = null;
      dto.teamAddress = null;
      dto.teamWebsite = null;
      dto.teamVenue = null;
      dto.teamFounded = null;
      dto.teamColors = null;
      dto.teamArea = null;
      dto.teamAreaFlag = null;
      dto.teamCompetitions = null;
      return dto;
    });

    players.sort((a, b) => {
      const posOrder = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'];
      const ai = posOrder.indexOf(a.position ?? '');
      const bi = posOrder.indexOf(b.position ?? '');
      if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      return (a.number ?? 99) - (b.number ?? 99);
    });

    await Promise.all(
      players.map(async (p) => {
        p.image = await this.photoService.fetchPhoto(p.name);
      }),
    );

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
    dto.firstName = null;
    dto.lastName = null;
    dto.image = p.image;
    dto.number = p.number;
    dto.position = p.position;
    dto.age = p.age;
    dto.nationality = null;
    dto.teamId = p.teamId;
    dto.goals = p.goals;
    dto.assists = p.assists;
    dto.yellowCards = p.yellowCards;
    dto.redCards = p.redCards;
    dto.matchesPlayed = p.matchesPlayed;
    dto.rating = p.rating;
    dto.contractStart = null;
    dto.contractUntil = null;
    dto.teamName = null;
    dto.teamShortName = null;
    dto.teamTla = null;
    dto.teamCrest = null;
    dto.teamAddress = null;
    dto.teamWebsite = null;
    dto.teamVenue = null;
    dto.teamFounded = null;
    dto.teamColors = null;
    dto.teamArea = null;
    dto.teamAreaFlag = null;
    dto.teamCompetitions = null;
    return dto;
  }
}
