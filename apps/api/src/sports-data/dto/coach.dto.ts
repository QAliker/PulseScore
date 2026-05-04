export class CoachCareerDto {
  teamId: number;
  teamName: string;
  teamLogo: string;
  start: string;
  end: string | null;
}

export class CoachDto {
  id: number;
  name: string;
  firstname: string;
  lastname: string;
  age: number | null;
  nationality: string | null;
  photo: string;
  teamId: number | null;
  teamName: string | null;
  teamLogo: string | null;
  career: CoachCareerDto[];
}
