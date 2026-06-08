import { Injectable } from '@nestjs/common';
import {
  SofascoreEvent,
  SofascoreLiveResponse,
} from '../interfaces/sofascore.interfaces';
import { MatchDto } from '../dto/match.dto';
import { TeamDto } from '../dto/team.dto';
import { LeagueDto } from '../dto/league.dto';

@Injectable()
export class SofascoreNormalizer {
  toMatchDtos(res: SofascoreLiveResponse): MatchDto[] {
    return (res.events ?? []).map((event) => this.toMatchDto(event));
  }

  private toMatchDto(event: SofascoreEvent): MatchDto {
    const dto = new MatchDto();
    dto.id = `sofa:${event.id}`;
    dto.externalId = `sofa:${event.id}`;
    dto.status = this.normalizeStatus(event.status.type);
    dto.sport = 'Football';
    dto.startTime = new Date(event.startTimestamp * 1000);
    dto.progress = this.deriveProgress(event);
    dto.homeScore = event.homeScore?.current ?? null;
    dto.awayScore = event.awayScore?.current ?? null;
    dto.round = null;
    dto.stage = null;
    dto.group = null;
    dto.winner = null;
    dto.venue = null;
    dto.goalscorers = [];
    dto.cards = [];
    dto.substitutions = [];
    dto.lineups = null;
    dto.statistics = [];

    const homeTeam = new TeamDto();
    homeTeam.id = `sofa:team:${event.homeTeam.id}`;
    homeTeam.externalId = `sofa:team:${event.homeTeam.id}`;
    homeTeam.name = event.homeTeam.name;
    homeTeam.logo = null;
    dto.homeTeam = homeTeam;

    const awayTeam = new TeamDto();
    awayTeam.id = `sofa:team:${event.awayTeam.id}`;
    awayTeam.externalId = `sofa:team:${event.awayTeam.id}`;
    awayTeam.name = event.awayTeam.name;
    awayTeam.logo = null;
    dto.awayTeam = awayTeam;

    const league = new LeagueDto();
    league.id = `sofa:tournament:${event.tournament.id}`;
    league.externalId = `sofa:tournament:${event.tournament.id}`;
    league.name = event.tournament.name;
    league.sport = 'Football';
    league.country = event.tournament.category?.name ?? null;
    league.logo = null;
    dto.league = league;

    return dto;
  }

  private normalizeStatus(type: string): MatchDto['status'] {
    switch (type) {
      case 'inprogress':
        return 'LIVE';
      case 'finished':
        return 'FINISHED';
      case 'canceled':
        return 'CANCELLED';
      case 'postponed':
        return 'POSTPONED';
      default:
        return 'SCHEDULED';
    }
  }

  private deriveProgress(event: SofascoreEvent): string | null {
    if (event.status.type !== 'inprogress') return null;
    if (/halftime|half[- ]?time/i.test(event.status.description)) return 'HT';

    const time = event.time;
    if (time?.currentPeriodStartTimestamp != null) {
      const nowSec = Math.floor(Date.now() / 1000);
      const elapsedMin = Math.floor(
        (nowSec - time.currentPeriodStartTimestamp) / 60,
      );
      const baseMin = Math.round((time.initial ?? 0) / 60);
      const minute = baseMin + Math.max(0, elapsedMin) + 1;
      return String(minute);
    }

    return event.status.description || null;
  }
}
