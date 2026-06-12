import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { StandingsService } from './standings.service';
import { FixturesService } from './fixtures.service';
import { FootballDataOrgClient } from '../client/football-data-org.client';
import { PrismaService } from '../../prisma/prisma.service';
import { FdoCompetitionTeamsResponse } from '../interfaces/football-data-org.interfaces';
import { LEAGUE_MAP } from '../constants/season.constants';

// Must cover every league the home page requests, or the missing ones stay
// cold and trip the API-Football per-minute quota on each fresh visit. '1' is
// the FIFA World Cup shown in the web LEAGUES list.
const LEAGUE_IDS = ['39', '140', '78', '135', '61', '1'];

// Cache TTL for fixtures/results/standings is 6h; re-warm well under that so a
// visitor never lands on an expired (cold) cache.
const REWARM_INTERVAL_MS = 4 * 60 * 60 * 1000;

@Injectable()
export class WarmupService implements OnApplicationBootstrap {
  private readonly logger = new Logger(WarmupService.name);

  constructor(
    private readonly standings: StandingsService,
    private readonly fixtures: FixturesService,
    private readonly fdoClient: FootballDataOrgClient,
    private readonly prisma: PrismaService,
  ) {}

  onApplicationBootstrap(): void {
    void this.runWarmup();
  }

  // Keep the cache warm so visitors hit Redis instead of fanning out to
  // API-Football (and tripping the 10 req/min quota) on an expired cache.
  @Interval('cache-rewarm', REWARM_INTERVAL_MS)
  async rewarm(): Promise<void> {
    await this.warmLeagues();
  }

  private async runWarmup(): Promise<void> {
    await this.seedFdoIds();
    await this.warmLeagues();
    void this.fixtures.prewarmTeamFixtures();
  }

  private async warmLeagues(): Promise<void> {
    this.logger.log('Warming up cache for all leagues...');
    for (const leagueId of LEAGUE_IDS) {
      try {
        const standingDtos = await this.standings.getStandings(leagueId);
        await this.standings.persistStandings(leagueId, standingDtos);
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

    for (const [rafId, { fdoCode }] of Object.entries(LEAGUE_MAP)) {
      try {
        await this.prisma.league.updateMany({
          where: { externalId: rafId, fdoExternalId: null },
          data: { fdoExternalId: fdoCode },
        });

        const data = await this.fdoClient.get<FdoCompetitionTeamsResponse>(
          `competitions/${fdoCode}/teams`,
        );

        const unmatchedTeams = await this.prisma.team.findMany({
          where: { fdoExternalId: null },
          select: { id: true, name: true },
        });

        for (const fdoTeam of data.teams) {
          const fdoId = String(fdoTeam.id);
          const stripped = fdoTeam.name
            .replace(/ FC$/i, '')
            .replace(/ CF$/i, '')
            .trim();

          const match = unmatchedTeams.find((t) => {
            const tStripped = t.name
              .replace(/ FC$/i, '')
              .replace(/ CF$/i, '')
              .trim();
            return (
              t.name.includes(stripped) ||
              fdoTeam.name.includes(t.name) ||
              stripped.includes(tStripped) ||
              tStripped.includes(stripped)
            );
          });

          if (match) {
            const updated = await this.prisma.team
              .update({
                where: { id: match.id },
                data: { fdoExternalId: fdoId },
              })
              .catch(() => null);
            if (updated) {
              const idx = unmatchedTeams.findIndex((t) => t.id === match.id);
              if (idx !== -1) unmatchedTeams.splice(idx, 1);
            }
          } else {
            await this.prisma.team.upsert({
              where: { fdoExternalId: fdoId },
              create: {
                externalId: `fdo:${fdoTeam.id}`,
                fdoExternalId: fdoId,
                name: fdoTeam.name,
                logo: fdoTeam.crest || null,
              },
              update: { name: fdoTeam.name, logo: fdoTeam.crest || null },
            });
          }
        }
      } catch (err) {
        this.logger.error(
          `FDO seeding failed for league ${rafId} (${fdoCode}): ${String(err)}`,
        );
      }
    }

    this.logger.log('FDO ID seeding complete.');
  }
}
