export interface PlayerDtoCompetition {
  name: string;
  code: string;
  type: string;
  emblem: string | null;
}

export class PlayerDto {
  externalId: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
  number: number | null;
  position: string | null;
  age: number | null;
  nationality: string | null;
  teamId: string | null;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  matchesPlayed: number;
  rating: string | null;
  contractStart: string | null;
  contractUntil: string | null;
  teamName: string | null;
  teamShortName: string | null;
  teamTla: string | null;
  teamCrest: string | null;
  teamAddress: string | null;
  teamWebsite: string | null;
  teamVenue: string | null;
  teamFounded: number | null;
  teamColors: string | null;
  teamArea: string | null;
  teamAreaFlag: string | null;
  teamCompetitions: PlayerDtoCompetition[] | null;
}
