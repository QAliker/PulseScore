import { Injectable, Logger } from '@nestjs/common';
import { FootballDataOrgClient } from '../client/football-data-org.client';
import { FootballDataOrgNormalizer } from '../normalizer/football-data-org.normalizer';
import { PrismaService } from '../../prisma/prisma.service';
import { SportsDataCacheService, TTL_H2H } from '../sports-data-cache.service';
import type {
  FdoH2hResponse,
  FdoMatch,
} from '../interfaces/football-data-org.interfaces';
import { H2hDto } from '../dto/h2h.dto';
import { MatchDto } from '../dto/match.dto';

@Injectable()
export class H2hService {
  private readonly logger = new Logger(H2hService.name);

  constructor(
    private readonly fdoClient: FootballDataOrgClient,
    private readonly fdoNormalizer: FootballDataOrgNormalizer,
    private readonly prisma: PrismaService,
    private readonly cacheService: SportsDataCacheService,
  ) {}

  async getH2H(teamId1: string, teamId2: string): Promise<H2hDto> {
    const cacheKey = SportsDataCacheService.h2hKey(teamId1, teamId2);
    const cached = await this.cacheService.getCached<H2hDto>(cacheKey);
    if (cached) return cached;

    const [fdo1, fdo2] = await Promise.all([
      this.resolveFdoId(teamId1),
      this.resolveFdoId(teamId2),
    ]);

    if (!fdo1 || !fdo2) {
      const empty = new H2hDto();
      empty.headToHead = [];
      empty.firstTeamResults = [];
      empty.secondTeamResults = [];
      return empty;
    }

    const data = await this.fdoClient
      .get<FdoH2hResponse>('matches', { headToHead: `${fdo1}_${fdo2}` })
      .catch(() => null);

    if (!data) {
      const empty = new H2hDto();
      empty.headToHead = [];
      empty.firstTeamResults = [];
      empty.secondTeamResults = [];
      return empty;
    }

    const allMatches = await Promise.all(
      data.head2head.matches.map((m) => this.normalizeMatch(m)),
    );

    const dto = new H2hDto();
    dto.headToHead = allMatches;
    dto.firstTeamResults = allMatches
      .filter(
        (m) =>
          m.homeTeam?.externalId === teamId1 ||
          m.awayTeam?.externalId === teamId1,
      )
      .slice(0, 5);
    dto.secondTeamResults = allMatches
      .filter(
        (m) =>
          m.homeTeam?.externalId === teamId2 ||
          m.awayTeam?.externalId === teamId2,
      )
      .slice(0, 5);

    await this.cacheService.setCached(cacheKey, dto, TTL_H2H);
    return dto;
  }

  private async resolveFdoId(teamId: string): Promise<string | null> {
    if (teamId.startsWith('fdo:')) return teamId.slice(4);
    const team = await this.prisma.team.findFirst({
      where: { externalId: teamId },
      select: { fdoExternalId: true },
    });
    return team?.fdoExternalId ?? null;
  }

  private async normalizeMatch(raw: FdoMatch): Promise<MatchDto> {
    const [homeId, awayId, leagueId] = await Promise.all([
      this.resolveTeamExternalId(raw.homeTeam.id),
      this.resolveTeamExternalId(raw.awayTeam.id),
      this.resolveLeagueId(raw.competition.code),
    ]);
    return this.fdoNormalizer.normalizeMatch(raw, homeId, awayId, leagueId);
  }

  private async resolveTeamExternalId(
    fdoTeamId: number,
  ): Promise<string | null> {
    const team = await this.prisma.team.findFirst({
      where: { fdoExternalId: String(fdoTeamId) },
    });
    return team?.externalId ?? `fdo:${fdoTeamId}`;
  }

  private async resolveLeagueId(fdoCode: string): Promise<string | null> {
    const league = await this.prisma.league.findFirst({
      where: { fdoExternalId: fdoCode },
    });
    return league?.externalId ?? null;
  }
}
