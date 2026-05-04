export class PredictionDto {
  winnerId: number | null;
  winnerName: string | null;
  winnerComment: string;
  advice: string;
  percentHome: string;
  percentDraw: string;
  percentAway: string;
  underOver: string | null;
  goalHome: string;
  goalAway: string;
}
