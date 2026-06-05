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
import { PrismaService } from '../../prisma/prisma.service';
import { PlayerDto } from '../dto/player.dto';
import { MatchDto } from '../dto/match.dto';
import { TeamStatisticsDto } from '../dto/team-statistics.dto';
import { getCurrentSeason } from '../constants/season.constants';

@Controller('teams')
export class TeamsController {
  constructor(
    private readonly teamsService: TeamsService,
    private readonly playersService: PlayersService,
    private readonly fixturesService: FixturesService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async search(@Query('search') search?: string) {
    if (!search || search.trim().length < 2) return [];
    return this.teamsService.searchTeams(search.trim());
  }

  @Get(':teamId')
  async getTeam(@Param('teamId') teamId: string) {
    const team = await this.teamsService.getTeamByExternalId(teamId);
    if (!team) throw new NotFoundException(`Team ${teamId} not found`);
    return team;
  }

  @Get(':teamId/standing')
  async getStanding(@Param('teamId') teamId: string) {
    const team = await this.prisma.team.findFirst({
      where: {
        OR: [{ externalId: teamId }, { fdoExternalId: teamId }],
      },
    });
    if (!team) throw new NotFoundException(`Team ${teamId} not found`);

    const season = String(getCurrentSeason());
    const standing = await this.prisma.standing.findFirst({
      where: { teamId: team.id, season },
      include: { league: true },
      orderBy: { updatedAt: 'desc' },
    });

    if (!standing) return null;

    return {
      position: standing.position,
      points: standing.points,
      played: standing.played,
      won: standing.won,
      drawn: standing.drawn,
      lost: standing.lost,
      goalsFor: standing.goalsFor,
      goalsAgainst: standing.goalsAgainst,
      leagueName: standing.league.name,
      leagueId: standing.league.externalId,
    };
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
