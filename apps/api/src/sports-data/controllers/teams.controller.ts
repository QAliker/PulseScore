import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { TeamsService } from '../services/teams.service';
import { PlayersService } from '../services/players.service';
import { FixturesService } from '../services/fixtures.service';
import { PlayerDto } from '../dto/player.dto';
import { MatchDto } from '../dto/match.dto';
import { TeamStatisticsDto } from '../dto/team-statistics.dto';

@Controller('teams')
export class TeamsController {
  constructor(
    private readonly teamsService: TeamsService,
    private readonly playersService: PlayersService,
    private readonly fixturesService: FixturesService,
  ) {}

  @Get(':teamId')
  async getTeam(@Param('teamId') teamId: string) {
    const team = await this.teamsService.getTeamByExternalId(teamId);
    if (!team) throw new NotFoundException(`Team ${teamId} not found`);
    return team;
  }

  @Get(':teamId/players')
  async getPlayers(@Param('teamId') teamId: string): Promise<PlayerDto[]> {
    return this.playersService.getByTeam(teamId);
  }

  @Get(':teamId/results')
  async getResults(
    @Param('teamId') teamId: string,
    @Query('limit') limit = '10',
    @Query('offset') offset = '0',
  ): Promise<MatchDto[]> {
    return this.fixturesService.getTeamResults(
      teamId,
      parseInt(limit, 10),
      parseInt(offset, 10),
    );
  }

  @Get(':teamId/fixtures')
  async getFixtures(@Param('teamId') teamId: string): Promise<MatchDto[]> {
    return this.fixturesService.getTeamFixtures(teamId);
  }

  @Get(':teamId/statistics')
  async getStatistics(
    @Param('teamId') teamId: string,
    @Query('league') league: string,
    @Query('season') season: string,
    @Query('date') date?: string,
  ): Promise<TeamStatisticsDto> {
    const stats = await this.teamsService.getStatistics(
      league,
      season,
      teamId,
      date,
    );
    if (!stats) throw new NotFoundException();
    return stats;
  }
}
