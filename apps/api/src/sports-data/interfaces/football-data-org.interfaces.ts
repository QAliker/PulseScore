/**
 * Raw API response types from football-data.org v4.
 * Responses are returned directly (no envelope wrapper).
 */

export interface FdoTeam {
  id: number;
  name: string;
  shortName?: string;
  crest: string;
}

export interface FdoScore {
  winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null;
  fullTime: { home: number | null; away: number | null };
  halfTime: { home: number | null; away: number | null };
}

export interface FdoMatch {
  id: number;
  utcDate: string;
  status: string;
  matchday: number | null;
  homeTeam: FdoTeam;
  awayTeam: FdoTeam;
  score: FdoScore;
  competition: { id: number; name: string; code: string };
}

export interface FdoStanding {
  position: number;
  team: FdoTeam;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  form: string | null;
}

export interface FdoStandingsResponse {
  competition: { id: number; name: string; code: string };
  standings: Array<{ type: string; table: FdoStanding[] }>;
}

export interface FdoMatchesResponse {
  matches: FdoMatch[];
}

export interface FdoCompetitionTeamsResponse {
  competition: { id: number; name: string; code: string };
  teams: FdoTeam[];
}

export interface FdoH2hResponse {
  head2head: {
    numberOfMatches: number;
    matches: FdoMatch[];
  };
}
