export class TransferEntryDto {
  date: string;
  type: string;
  teamInId: number;
  teamInName: string;
  teamInLogo: string;
  teamOutId: number;
  teamOutName: string;
  teamOutLogo: string;
}

export class TransferDto {
  playerId: number;
  playerName: string;
  transfers: TransferEntryDto[];
}
