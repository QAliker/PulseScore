import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ApiFootballClient } from '../client/api-football.client';
import { ApiFootballNormalizer } from '../normalizer/api-football.normalizer';
import {
  SportsDataCacheService,
  TTL_STANDINGS,
} from '../sports-data-cache.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RafStandingResponse } from '../interfaces/api-football.interfaces';
import { StandingDto } from '../dto/standing.dto';

const LEAGUE_IDS = ['40', '61']; // Championship, Ligue 2
const SEASON = 2025;

@Injectable()
export class StandingsService {
  private readonly logger = new Logger(StandingsService.name);

  constructor(
    private readonly client: ApiFootballClient,
    private readonly normalizer: ApiFootballNormalizer,
    private readonly cacheService: SportsDataCacheService,
    private readonly prismaService: PrismaService,
  ) {}

  async getStandings(leagueId: string): Promise<StandingDto[]> {
    const cacheKey = SportsDataCacheService.standingsKey(leagueId);
    const cached = await this.cacheService.getCached<StandingDto[]>(cacheKey);
    if (cached) return cached;

    const raw = await this.client.get<RafStandingResponse>('standings', {
      league: leagueId,
      season: SEASON,
    });

    if (!raw.length || !raw[0].league?.standings?.length) return [];

    const leagueName = raw[0].league.name;
    const standings = raw[0].league.standings
      .flat()
      .map((entry) =>
        this.normalizer.normalizeStanding(entry, leagueId, leagueName),
      );

    await this.cacheService.setCached(cacheKey, standings, TTL_STANDINGS);
    return standings;
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

    const season = String(SEASON);

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
