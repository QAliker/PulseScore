import { Injectable } from '@nestjs/common';
import {
  EspnEvent,
  EspnLeague,
  EspnScoreboardResponse,
} from '../interfaces/espn-scoreboard.interfaces';
import { MatchDto } from '../dto/match.dto';
import { TeamDto } from '../dto/team.dto';
import { LeagueDto } from '../dto/league.dto';

@Injectable()
export class EspnLiveNormalizer {
  /** Map one league's scoreboard into MatchDtos (all states; caller filters). */
  toMatchDtos(res: EspnScoreboardResponse): MatchDto[] {
    const league = res.leagues?.[0];
    return (res.events ?? []).map((event) => this.toMatchDto(event, league));
  }

  private toMatchDto(event: EspnEvent, league?: EspnLeague): MatchDto {
    const comp = event.competitions[0];
    const home = comp.competitors.find((c) => c.homeAway === 'home');
    const away = comp.competitors.find((c) => c.homeAway === 'away');

    const dto = new MatchDto();
    dto.id = `espn:${event.id}`;
    dto.externalId = `espn:${event.id}`;
    dto.status = this.normalizeStatus(event);
    dto.sport = 'Football';
    dto.startTime = new Date(event.date);
    dto.progress = this.deriveProgress(event);
    dto.homeScore = this.parseScore(home?.score);
    dto.awayScore = this.parseScore(away?.score);
    dto.round = null;
    dto.stage = null;
    dto.group = null;
    dto.winner = null;
    dto.venue = comp.venue?.fullName ?? null;
    dto.goalscorers = [];
    dto.cards = [];
    dto.substitutions = [];
    dto.lineups = null;
    dto.statistics = [];

    dto.homeTeam = this.toTeam(home?.team);
    dto.awayTeam = this.toTeam(away?.team);
    dto.league = this.toLeague(league);

    return dto;
  }

  private toTeam(team?: {
    id: string;
    displayName: string;
    logo?: string;
  }): TeamDto {
    const dto = new TeamDto();
    dto.id = `espn:team:${team?.id ?? 'unknown'}`;
    dto.externalId = `espn:team:${team?.id ?? 'unknown'}`;
    dto.name = team?.displayName ?? 'Unknown';
    dto.logo = team?.logo ?? null;
    return dto;
  }

  private toLeague(league?: EspnLeague): LeagueDto | null {
    if (!league) return null;
    const dto = new LeagueDto();
    dto.id = `espn:league:${league.slug}`;
    dto.externalId = `espn:league:${league.slug}`;
    dto.name = league.name;
    dto.sport = 'Football';
    dto.country = null;
    dto.logo = league.logos?.[0]?.href ?? null;
    return dto;
  }

  private parseScore(score?: string): number | null {
    if (score == null || score === '') return null;
    const n = Number(score);
    return Number.isFinite(n) ? n : null;
  }

  private normalizeStatus(event: EspnEvent): MatchDto['status'] {
    const { state, name } = event.status.type;
    if (/POSTPONED/i.test(name)) return 'POSTPONED';
    if (/CANCELED|CANCELLED|ABANDONED/i.test(name)) return 'CANCELLED';
    switch (state) {
      case 'in':
        return 'LIVE';
      case 'post':
        return 'FINISHED';
      default:
        return 'SCHEDULED';
    }
  }

  private deriveProgress(event: EspnEvent): string | null {
    if (event.status.type.state !== 'in') return null;
    if (/HALFTIME|HALF_TIME/i.test(event.status.type.name)) return 'HT';
    // displayClock like "67'" → strip trailing apostrophe, keep "67" or "45+2".
    const clock = event.status.displayClock?.replace(/'/g, '').trim();
    return clock || event.status.type.shortDetail || null;
  }
}
