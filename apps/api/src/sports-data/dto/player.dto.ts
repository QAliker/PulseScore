export class PlayerDto {
  externalId: string;
  name: string;
  image: string | null;
  number: number | null;
  position: string | null;
  age: number | null;
  teamId: string | null;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  matchesPlayed: number;
  rating: string | null;
}
