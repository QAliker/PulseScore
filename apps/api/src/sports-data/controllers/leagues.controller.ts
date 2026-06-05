import { Controller, Get, Param, Query } from '@nestjs/common';
import { StandingsService } from '../services/standings.service';
import { FixturesService } from '../services/fixtures.service';
import { LeaguesService } from '../services/leagues.service';
import { StandingDto } from '../dto/standing.dto';
import { SeasonDto } from '../dto/season.dto';
import { ScorerDto } from '../dto/scorer.dto';
import { ScorersService } from '../services/scorers.service';
import { MatchDto } from '../dto/match.dto';
import { RafLeagueResponse } from '../interfaces/api-football.interfaces';

@Controller('leagues')
export class LeaguesController {
  constructor(
    private readonly standingsService: StandingsService,
    private readonly fixturesService: FixturesService,
    private readonly leaguesService: LeaguesService,
    private readonly scorersService: ScorersService,
  ) {}

  @Get()
  async getLeagues(
    @Query('id') id?: string,
    @Query('season') season?: string,
    @Query('country') country?: string,
    @Query('type') type?: string,
    @Query('current') current?: string,
    @Query('search') search?: string,
  ): Promise<RafLeagueResponse[]> {
    const params: Record<string, string> = {};
    if (id) params.id = id;
    if (season) params.season = season;
    if (country) params.country = country;
    if (type) params.type = type;
    if (current) params.current = current;
    if (search) params.search = search;
    return this.leaguesService.getLeagues(params);
  }

  @Get('seasons')
  async getSeasons(): Promise<number[]> {
    return this.leaguesService.getSeasons();
  }

  @Get(':leagueId/standings')
  async getStandings(
    @Param('leagueId') leagueId: string,
  ): Promise<StandingDto[]> {
    return this.standingsService.getStandings(leagueId);
  }

  @Get(':leagueId/season')
  async getSeason(
    @Param('leagueId') leagueId: string,
  ): Promise<SeasonDto | null> {
    return this.standingsService.getSeason(leagueId);
  }

  @Get(':leagueId/scorers')
  async getScorers(@Param('leagueId') leagueId: string): Promise<ScorerDto[]> {
    return this.scorersService.getByLeague(leagueId);
  }

  @Get(':leagueId/results')
  async getResults(@Param('leagueId') leagueId: string): Promise<MatchDto[]> {
    return this.fixturesService.getLeagueResults(leagueId);
  }

  @Get(':leagueId/fixtures')
  async getFixtures(@Param('leagueId') leagueId: string): Promise<MatchDto[]> {
    return this.fixturesService.getLeagueFixtures(leagueId);
  }

  @Get(':leagueId/rounds')
  async getRounds(
    @Param('leagueId') leagueId: string,
    @Query('season') season: string,
    @Query('current') current?: string,
  ): Promise<string[]> {
    return this.leaguesService.getRounds(leagueId, season, current);
  }
}

@Controller('timezones')
export class TimezonesController {
  constructor(private readonly leaguesService: LeaguesService) {}

  @Get()
  async getTimezones(): Promise<string[]> {
    return this.leaguesService.getTimezones();
  }
}
