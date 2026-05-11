import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ApiFootballClient } from '../client/api-football.client';
import { ApiFootballNormalizer } from '../normalizer/api-football.normalizer';
import { FootballDataOrgClient } from '../client/football-data-org.client';
import { FootballDataOrgNormalizer } from '../normalizer/football-data-org.normalizer';
import { SportsDataCacheService, TTL_STANDINGS } from '../sports-data-cache.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RafStandingResponse } from '../interfaces/api-football.interfaces';
import { FdoStandingsResponse } from '../interfaces/football-data-org.interfaces';
import { StandingDto } from '../dto/standing.dto';
import {
  getCurrentSeason,
  HISTORY_SEASON_RAF,
  LEAGUE_MAP,
} from '../constants/season.constants';

const LEAGUE_IDS = ['39', '140', '78', '135', '61'];

@Injectable()
export class StandingsService {
  private readonly logger = new Logger(StandingsService.name);

  constructor(
    private readonly rafClient: ApiFootballClient,
    private readonly rafNormalizer: ApiFootballNormalizer,
    private readonly fdoClient: FootballDataOrgClient,
    private readonly fdoNormalizer: FootballDataOrgNormalizer,
    private readonly cacheService: SportsDataCacheService,
    private readonly prismaService: PrismaService,
  ) {}

  async getStandings(leagueId: string): Promise<StandingDto[]> {
    const cacheKey = SportsDataCacheService.standingsKey(leagueId);
    const cached = await this.cacheService.getCached<StandingDto[]>(cacheKey);
    if (cached) return cached;

    const season = getCurrentSeason();
    const standings =
      season >= 2025
        ? await this.getStandingsFdo(leagueId)
        : await this.getStandingsRaf(leagueId);

    await this.cacheService.setCached(cacheKey, standings, TTL_STANDINGS);
    return standings;
  }

  private async getStandingsRaf(leagueId: string): Promise<StandingDto[]> {
    const raw = await this.rafClient.get<RafStandingResponse>('standings', {
      league: leagueId,
      season: HISTORY_SEASON_RAF,
    });
    if (!raw.length || !raw[0].league?.standings?.length) return [];
    const leagueName = raw[0].league.name;
    return raw[0].league.standings
      .flat()
      .map((entry) =>
        this.rafNormalizer.normalizeStanding(entry, leagueId, leagueName),
      );
  }

  private async getStandingsFdo(leagueId: string): Promise<StandingDto[]> {
    const mapping = LEAGUE_MAP[leagueId];
    if (!mapping) return [];

    const data = await this.fdoClient.get<FdoStandingsResponse>(
      `competitions/${mapping.fdoCode}/standings`,
    );

    const totalTable = data.standings.find((s) => s.type === 'TOTAL');
    if (!totalTable) return [];

    const league = await this.prismaService.league.findFirst({
      where: { externalId: leagueId },
    });
    const leagueResolvedId = league?.id ?? leagueId;

    return Promise.all(
      totalTable.table.map(async (entry) => {
        const team = await this.prismaService.team.findFirst({
          where: { fdoExternalId: String(entry.team.id) },
        });
        return this.fdoNormalizer.normalizeStanding(
          entry,
          leagueResolvedId,
          data.competition.name,
          team?.externalId ?? null,
        );
      }),
    );
  }

  @Cron('0 */12 * * *')
  async refreshStandings(): Promise<void> {
    for (const leagueId of LEAGUE_IDS) {
      try {
        this.logger.log(`Refreshing standings for league ${leagueId}`);
        await this.cacheService.invalidate(
          SportsDataCacheService.standingsKey(leagueId),
        );
        const standings = await this.getStandings(leagueId);
        await this.persistStandings(leagueId, standings);
      } catch (err) {
        this.logger.error(
          `Failed to refresh standings for league ${leagueId}: ${String(err)}`,
        );
      }
    }
  }

  private async persistStandings(
    leagueId: string,
    standings: StandingDto[],
  ): Promise<void> {
    const league = await this.prismaService.league.findUnique({
      where: { externalId: leagueId },
    });
    if (!league) return;

    const season = String(getCurrentSeason());

    for (const s of standings) {
      const team = await this.prismaService.team.findUnique({
        where: { externalId: s.teamId },
      });
      if (!team) continue;

      await this.prismaService.standing.upsert({
        where: {
          leagueId_teamId_season: {
            leagueId: league.id,
            teamId: team.id,
            season,
          },
        },
        create: {
          leagueId: league.id,
          teamId: team.id,
          position: s.position,
          played: s.played,
          won: s.won,
          drawn: s.drawn,
          lost: s.lost,
          goalsFor: s.goalsFor,
          goalsAgainst: s.goalsAgainst,
          points: s.points,
          season,
        },
        update: {
          position: s.position,
          played: s.played,
          won: s.won,
          drawn: s.drawn,
          lost: s.lost,
          goalsFor: s.goalsFor,
          goalsAgainst: s.goalsAgainst,
          points: s.points,
        },
      });
    }
  }
}
