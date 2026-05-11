import { Injectable } from '@nestjs/common';
import { FdoMatch, FdoStanding } from '../interfaces/football-data-org.interfaces';
import { MatchDto } from '../dto/match.dto';
import { TeamDto } from '../dto/team.dto';
import { LeagueDto } from '../dto/league.dto';
import { StandingDto } from '../dto/standing.dto';

@Injectable()
export class FootballDataOrgNormalizer {
  normalizeStatus(status: string): MatchDto['status'] {
    switch (status) {
      case 'FINISHED': return 'FINISHED';
      case 'IN_PLAY':
      case 'PAUSED':
      case 'LIVE': return 'LIVE';
      case 'POSTPONED': return 'POSTPONED';
      case 'CANCELLED':
      case 'SUSPENDED': return 'CANCELLED';
      default: return 'SCHEDULED';
    }
  }

  normalizeMatch(
    raw: FdoMatch,
    homeTeamResolvedId: string | null,
    awayTeamResolvedId: string | null,
    leagueResolvedId: string | null,
  ): MatchDto {
    const dto = new MatchDto();
    dto.id = `fdo:${raw.id}`;
    dto.externalId = `fdo:${raw.id}`;
    dto.status = this.normalizeStatus(raw.status);
    dto.sport = 'Football';
    dto.startTime = new Date(raw.utcDate);
    dto.round = raw.matchday;
    dto.venue = null;
    dto.progress = null;
    dto.homeScore = raw.score.fullTime.home;
    dto.awayScore = raw.score.fullTime.away;
    dto.goalscorers = [];
    dto.cards = [];
    dto.substitutions = [];
    dto.lineups = null;
    dto.statistics = [];

    const homeTeam = new TeamDto();
    homeTeam.id = homeTeamResolvedId ?? `fdo:${raw.homeTeam.id}`;
    homeTeam.externalId = homeTeamResolvedId ?? `fdo:${raw.homeTeam.id}`;
    homeTeam.name = raw.homeTeam.name;
    homeTeam.logo = raw.homeTeam.crest || null;
    dto.homeTeam = homeTeam;

    const awayTeam = new TeamDto();
    awayTeam.id = awayTeamResolvedId ?? `fdo:${raw.awayTeam.id}`;
    awayTeam.externalId = awayTeamResolvedId ?? `fdo:${raw.awayTeam.id}`;
    awayTeam.name = raw.awayTeam.name;
    awayTeam.logo = raw.awayTeam.crest || null;
    dto.awayTeam = awayTeam;

    const league = new LeagueDto();
    league.id = leagueResolvedId ?? `fdo:${raw.competition.code}`;
    league.externalId = leagueResolvedId ?? `fdo:${raw.competition.code}`;
    league.name = raw.competition.name;
    league.sport = 'Football';
    league.country = null;
    league.logo = null;
    dto.league = league;

    return dto;
  }

  normalizeStanding(
    raw: FdoStanding,
    leagueId: string,
    leagueName: string,
    teamResolvedId: string | null,
  ): StandingDto {
    const dto = new StandingDto();
    dto.leagueId = leagueId;
    dto.leagueName = leagueName;
    dto.teamId = teamResolvedId ?? `fdo:${raw.team.id}`;
    dto.teamName = raw.team.name;
    dto.teamBadge = raw.team.crest || null;
    dto.position = raw.position;
    dto.played = raw.playedGames;
    dto.won = raw.won;
    dto.drawn = raw.draw;
    dto.lost = raw.lost;
    dto.goalsFor = raw.goalsFor;
    dto.goalsAgainst = raw.goalsAgainst;
    dto.points = raw.points;
    dto.promotion = null;
    return dto;
  }
}
