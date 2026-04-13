export class OddsDto {
  matchId: string;
  bookmaker: string;
  updatedAt: string;
  home: string | null;
  draw: string | null;
  away: string | null;
  btsYes: string | null;
  btsNo: string | null;
}
