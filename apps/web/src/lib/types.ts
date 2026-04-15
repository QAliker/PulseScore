export type MatchStatus = 'scheduled' | 'live' | 'halftime' | 'finished' | 'postponed';

export type Team = {
  id: string;
  name: string;
  shortName: string;
  logo?: string;
  color?: string;
};

export type Odds = {
  home: number;
  draw: number;
  away: number;
};

export type Match = {
  id: string;
  leagueSlug: string;
  kickoff: string; // ISO
  status: MatchStatus;
  minute: number | null; // null when not live
  stoppage: number | null; // e.g. 3 for "90+3'"
  home: Team;
  away: Team;
  homeScore: number;
  awayScore: number;
  odds: Odds | null;
  updatedAt: string; // ISO
};

export type MatchesByLeague = Record<string, Match[]>;

export type SocketStatus = 'connecting' | 'live' | 'reconnecting' | 'offline';

export type ScoreChangeEvent = {
  type: 'score';
  matchId: string;
  homeScore: number;
  awayScore: number;
  scorer: 'home' | 'away';
  minute: number;
  updatedAt: string;
};

export type MinuteTickEvent = {
  type: 'tick';
  matchId: string;
  minute: number;
  stoppage: number | null;
  updatedAt: string;
};

export type StatusChangeEvent = {
  type: 'status';
  matchId: string;
  status: MatchStatus;
  updatedAt: string;
};

export type MatchEvent = ScoreChangeEvent | MinuteTickEvent | StatusChangeEvent;
