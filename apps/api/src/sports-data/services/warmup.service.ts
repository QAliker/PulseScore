import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { StandingsService } from './standings.service';
import { FixturesService } from './fixtures.service';
import { FootballDataOrgClient } from '../client/football-data-org.client';
import { PrismaService } from '../../prisma/prisma.service';
import { FdoCompetitionTeamsResponse } from '../interfaces/football-data-org.interfaces';
import { LEAGUE_MAP } from '../constants/season.constants';

const LEAGUE_IDS = ['39', '140', '78', '135', '61'];

@Injectable()
export class WarmupService implements OnApplicationBootstrap {
  private readonly logger = new Logger(WarmupService.name);

  constructor(
    private readonly standings: StandingsService,
    private readonly fixtures: FixturesService,
    private readonly fdoClient: FootballDataOrgClient,
    private readonly prisma: PrismaService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seedFdoIds();
    this.logger.log('Warming up cache for all leagues...');
    for (const leagueId of LEAGUE_IDS) {
      try {
        await this.standings.getStandings(leagueId);
        await this.fixtures.getLeagueFixtures(leagueId);
        await this.fixtures.getLeagueResults(leagueId);
      } catch (err) {
        this.logger.warn(
          `Warmup failed for league ${leagueId}: ${String(err)}`,
        );
      }
    }
    this.logger.log('Cache warmup complete.');
  }

  async seedFdoIds(): Promise<void> {
    this.logger.log('Seeding FDO external IDs...');

    for (const [rafId, { fdoCode, name }] of Object.entries(LEAGUE_MAP)) {
      try {
        await this.prisma.league.updateMany({
          where: { externalId: rafId, fdoExternalId: null },
          data: { fdoExternalId: fdoCode },
        });

        const data = await this.fdoClient.get<FdoCompetitionTeamsResponse>(
          `competitions/${fdoCode}/teams`,
        );

        for (const fdoTeam of data.teams) {
          const updated = await this.prisma.team.updateMany({
            where: {
              name: { contains: fdoTeam.name.replace(' FC', '').replace(' CF', '').trim() },
              fdoExternalId: null,
            },
            data: { fdoExternalId: String(fdoTeam.id) },
          });
          if (updated.count === 0) {
            this.logger.warn(
              `No DB match for FDO team "${fdoTeam.name}" (id=${fdoTeam.id}) in ${name}`,
            );
          }
        }
      } catch (err) {
        this.logger.error(`FDO seeding failed for league ${rafId} (${fdoCode}): ${String(err)}`);
      }
    }

    this.logger.log('FDO ID seeding complete.');
  }
}
