export class ScorerDto {
  rank: number;
  playerId: number;
  playerName: string;
  nationality: string | null;
  position: string | null;
  teamId: string | null;
  teamName: string;
  teamCrest: string | null;
  playedMatches: number;
  goals: number;
  assists: number | null;
  penalties: number | null;
}
