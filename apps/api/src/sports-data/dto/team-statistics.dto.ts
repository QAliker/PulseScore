export class TeamStatCountsDto {
  home: number;
  away: number;
  total: number;
}

export class TeamStatisticsDto {
  teamId: string;
  teamName: string;
  leagueId: number;
  leagueName: string;
  season: number;
  form: string | null;
  played: TeamStatCountsDto;
  wins: TeamStatCountsDto;
  draws: TeamStatCountsDto;
  losses: TeamStatCountsDto;
  goalsFor: TeamStatCountsDto;
  goalsAgainst: TeamStatCountsDto;
  goalsForAvg: { home: string; away: string; total: string };
  goalsAgainstAvg: { home: string; away: string; total: string };
  cleanSheets: TeamStatCountsDto;
  failedToScore: TeamStatCountsDto;
  penaltiesScored: number;
  penaltiesMissed: number;
}
