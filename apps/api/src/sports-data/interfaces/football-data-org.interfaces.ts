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

export interface FdoSeason {
  id: number;
  startDate: string;
  endDate: string;
  currentMatchday: number | null;
  winner: FdoTeam | null;
}

export interface FdoStandingsResponse {
  competition: { id: number; name: string; code: string };
  season: FdoSeason;
  standings: Array<{ type: string; table: FdoStanding[] }>;
}

export interface FdoScorer {
  player: {
    id: number;
    name: string;
    firstName: string | null;
    lastName: string | null;
    dateOfBirth: string | null;
    nationality: string | null;
    section: string | null;
    position: string | null;
    shirtNumber: number | null;
  };
  team: FdoTeam;
  playedMatches: number;
  goals: number;
  assists: number | null;
  penalties: number | null;
}

export interface FdoScorersResponse {
  competition: {
    id: number;
    name: string;
    code: string;
    emblem: string | null;
  };
  season: FdoSeason;
  scorers: FdoScorer[];
}

export interface FdoMatchesResponse {
  matches: FdoMatch[];
}

export interface FdoCompetitionTeam extends FdoTeam {
  squad?: FdoSquadPlayer[];
}

export interface FdoCompetitionTeamsResponse {
  competition: { id: number; name: string; code: string };
  teams: FdoCompetitionTeam[];
}

export interface FdoH2hResponse {
  aggregates: {
    numberOfMatches: number;
  };
  matches: FdoMatch[];
}

export interface FdoSquadPlayer {
  id: number;
  name: string;
  position: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  shirtNumber: number | null;
}

export interface FdoCoachDetail {
  id: number;
  firstName: string | null;
  lastName: string | null;
  name: string;
  dateOfBirth: string | null;
  nationality: string | null;
  contract?: { start: string | null; until: string | null } | null;
}

export interface FdoTeamDetail {
  id: number;
  name: string;
  shortName: string | null;
  tla: string | null;
  crest: string;
  venue: string | null;
  founded: number | null;
  clubColors: string | null;
  squad: FdoSquadPlayer[];
  coach: FdoCoachDetail | null;
}

export interface FdoPersonDetail {
  id: number;
  name: string;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  position: string | null;
  shirtNumber: number | null;
  currentTeam?: {
    id: number;
    name: string;
    shortName: string | null;
    tla: string | null;
    crest: string;
    address: string | null;
    website: string | null;
    venue: string | null;
    founded: number | null;
    clubColors: string | null;
    area?: {
      id: number;
      name: string;
      code: string;
      flag: string | null;
    } | null;
    runningCompetitions?: Array<{
      id: number;
      name: string;
      code: string;
      type: string;
      emblem: string | null;
    }> | null;
    contract: { start: string | null; until: string | null } | null;
  } | null;
}
