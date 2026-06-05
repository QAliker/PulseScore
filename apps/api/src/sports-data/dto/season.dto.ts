export class SeasonDto {
  leagueId: string;
  startDate: string;
  endDate: string;
  currentMatchday: number | null;
  /** True when the season end date is in the past. */
  finished: boolean;
  winnerName: string | null;
}
