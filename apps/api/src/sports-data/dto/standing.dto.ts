export class StandingDto {
  leagueId: string;
  leagueName: string;
  teamId: string;
  teamName: string;
  teamBadge: string | null;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  promotion: string | null;
}
