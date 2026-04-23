import { Injectable } from '@nestjs/common';
import {
  AfMatch,
  AfStanding,
  AfPlayer,
} from '../interfaces/api-football.interfaces';
import { MatchDto, GoalscorerDto, CardDto, SubstitutionDto } from '../dto/match.dto';
import { TeamDto } from '../dto/team.dto';
import { LeagueDto } from '../dto/league.dto';
import { StandingDto } from '../dto/standing.dto';
import { PlayerDto } from '../dto/player.dto';

@Injectable()
export class ApiFootballNormalizer {
  normalizeStatus(status: string): MatchDto['status'] {
    if (!status || status.trim() === '') return 'SCHEDULED';

    switch (status) {
      case 'Finished':
      case 'After ET':
      case 'After Pen.':
        return 'FINISHED';
      case 'Half Time':
        return 'LIVE';
      case 'Postponed':
        return 'POSTPONED';
      case 'Cancelled':
      case 'Awarded':
        return 'CANCELLED';
      default:
        if (/^\d+/.test(status)) return 'LIVE';
        return 'SCHEDULED';
    }
  }

  parseScore(score: string): number | null {
    if (!score || score.trim() === '') return null;
    const parsed = parseInt(score, 10);
    return isNaN(parsed) ? null : parsed;
  }

  parseRound(round: string): number | null {
    if (!round) return null;
    const match = round.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  normalizeMatch(raw: AfMatch): MatchDto {
    const dto = new MatchDto();

    dto.id = raw.match_id;
    dto.externalId = raw.match_id;

    const homeTeam = new TeamDto();
    homeTeam.id = raw.match_hometeam_id;
    homeTeam.externalId = raw.match_hometeam_id;
    homeTeam.name = raw.match_hometeam_name;
    homeTeam.logo = raw.team_home_badge || null;
    dto.homeTeam = homeTeam;

    const awayTeam = new TeamDto();
    awayTeam.id = raw.match_awayteam_id;
    awayTeam.externalId = raw.match_awayteam_id;
    awayTeam.name = raw.match_awayteam_name;
    awayTeam.logo = raw.team_away_badge || null;
    dto.awayTeam = awayTeam;

    dto.homeScore = this.parseScore(raw.match_hometeam_score);
    dto.awayScore = this.parseScore(raw.match_awayteam_score);
    dto.status = this.normalizeStatus(raw.match_status);
    dto.sport = 'Football';
    dto.progress = raw.match_status || null;
    dto.venue = raw.match_stadium || null;
    dto.round = this.parseRound(raw.match_round);

    if (raw.league_id) {
      const league = new LeagueDto();
      league.id = raw.league_id;
      league.externalId = raw.league_id;
      league.name = raw.league_name || '';
      league.sport = 'Football';
      league.country = raw.country_name || null;
      league.logo = raw.league_logo || null;
      dto.league = league;
    } else {
      dto.league = null;
    }

    const timeStr = raw.match_time || '00:00';
    dto.startTime = new Date(`${raw.match_date}T${timeStr}:00Z`);
    if (isNaN(dto.startTime.getTime())) {
      dto.startTime = new Date(0);
    }

    dto.goalscorers = (raw.goalscorer ?? []).map((g) => {
      const gs = new GoalscorerDto();
      gs.time = g.time;
      gs.homeScorer = g.home_scorer || null;
      gs.awayScorer = g.away_scorer || null;
      gs.score = g.score;
      gs.info = g.info || null;
      return gs;
    });

    dto.cards = (raw.cards ?? []).map((c) => {
      const card = new CardDto();
      card.time = c.time;
      card.homeFault = c.home_fault || null;
      card.awayFault = c.away_fault || null;
      card.card = c.card;
      card.info = c.info || null;
      return card;
    });

    const subs: SubstitutionDto[] = [];
    for (const s of raw.substitutions?.home ?? []) {
      const sub = new SubstitutionDto();
      sub.time = s.time;
      sub.team = 'home';
      sub.playerIn = s.substitution || null;
      subs.push(sub);
    }
    for (const s of raw.substitutions?.away ?? []) {
      const sub = new SubstitutionDto();
      sub.time = s.time;
      sub.team = 'away';
      sub.playerIn = s.substitution || null;
      subs.push(sub);
    }
    dto.substitutions = subs;

    return dto;
  }

  normalizeStanding(raw: AfStanding): StandingDto {
    const dto = new StandingDto();
    dto.leagueId = raw.league_id;
    dto.leagueName = raw.league_name;
    dto.teamId = raw.team_id;
    dto.teamName = raw.team_name;
    dto.teamBadge = raw.team_badge || null;
    dto.position = parseInt(raw.overall_league_position, 10) || 0;
    dto.played = parseInt(raw.overall_league_payed, 10) || 0;
    dto.won = parseInt(raw.overall_league_W, 10) || 0;
    dto.drawn = parseInt(raw.overall_league_D, 10) || 0;
    dto.lost = parseInt(raw.overall_league_L, 10) || 0;
    dto.goalsFor = parseInt(raw.overall_league_GF, 10) || 0;
    dto.goalsAgainst = parseInt(raw.overall_league_GA, 10) || 0;
    dto.points = parseInt(raw.overall_league_PTS, 10) || 0;
    dto.promotion = raw.overall_promotion || null;
    return dto;
  }

  normalizePlayer(raw: AfPlayer, teamId: string): PlayerDto {
    const dto = new PlayerDto();
    dto.externalId = raw.player_key;
    dto.name = raw.player_name;
    dto.image = raw.player_image || null;
    dto.number = raw.player_number
      ? parseInt(raw.player_number, 10) || null
      : null;
    dto.position = raw.player_type || null;
    dto.age = raw.player_age ? parseInt(raw.player_age, 10) || null : null;
    dto.teamId = teamId;
    dto.goals = parseInt(raw.player_goals, 10) || 0;
    dto.assists = parseInt(raw.player_assists, 10) || 0;
    dto.yellowCards = parseInt(raw.player_yellow_cards, 10) || 0;
    dto.redCards = parseInt(raw.player_red_cards, 10) || 0;
    dto.matchesPlayed = parseInt(raw.player_match_played, 10) || 0;
    dto.rating = raw.player_rating || null;
    return dto;
  }
}
