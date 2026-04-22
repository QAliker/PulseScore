import { Controller, Get, Param } from '@nestjs/common';
import { StandingsService } from '../services/standings.service';
import { FixturesService } from '../services/fixtures.service';
import { StandingDto } from '../dto/standing.dto';
import { MatchDto } from '../dto/match.dto';

@Controller('leagues')
export class LeaguesController {
  constructor(
    private readonly standingsService: StandingsService,
    private readonly fixturesService: FixturesService,
  ) {}

  @Get(':leagueId/standings')
  async getStandings(@Param('leagueId') leagueId: string): Promise<StandingDto[]> {
    return this.standingsService.getStandings(leagueId);
  }

  @Get(':leagueId/results')
  async getResults(@Param('leagueId') leagueId: string): Promise<MatchDto[]> {
    return this.fixturesService.getLeagueResults(leagueId);
  }

  @Get(':leagueId/fixtures')
  async getFixtures(@Param('leagueId') leagueId: string): Promise<MatchDto[]> {
    return this.fixturesService.getLeagueFixtures(leagueId);
  }
}
