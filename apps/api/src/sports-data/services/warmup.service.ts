import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { StandingsService } from './standings.service';
import { FixturesService } from './fixtures.service';

const LEAGUE_IDS = ['39', '140', '78', '135', '61'];

@Injectable()
export class WarmupService implements OnApplicationBootstrap {
  private readonly logger = new Logger(WarmupService.name);

  constructor(
    private readonly standings: StandingsService,
    private readonly fixtures: FixturesService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
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
}
