import { TeamDto } from './team.dto';
import { LeagueDto } from './league.dto';

export class MatchDto {
  id: string;
  externalId: string;
  homeTeam: TeamDto;
  awayTeam: TeamDto;
  homeScore: number | null;
  awayScore: number | null;
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'CANCELLED' | 'POSTPONED';
  sport: string;
  league: LeagueDto | null;
  startTime: Date;
  progress: string | null;
  venue: string | null;
  round: number | null;
  goalscorers: GoalscorerDto[];
  cards: CardDto[];
}

export class GoalscorerDto {
  time: string;
  homeScorer: string | null;
  awayScorer: string | null;
  score: string;
  info: string | null;
}

export class CardDto {
  time: string;
  homeFault: string | null;
  awayFault: string | null;
  card: string;
  info: string | null;
}
