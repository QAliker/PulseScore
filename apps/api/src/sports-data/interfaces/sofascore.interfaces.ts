// Raw shapes from https://api.sofascore.com/api/v1/sport/football/events/live
// Only the fields we consume are typed; the real payload has many more.

export interface SofascoreScore {
  current?: number;
}

export interface SofascoreStatus {
  code: number;
  description: string; // e.g. "1st half", "Halftime", "Ended"
  type: string; // "inprogress" | "finished" | "notstarted" | "canceled" | "postponed"
}

export interface SofascoreTeam {
  id: number;
  name: string;
  shortName?: string;
}

export interface SofascoreCategory {
  id: number;
  name: string; // country / region, e.g. "England"
  flag?: string;
}

export interface SofascoreTournament {
  id: number;
  name: string; // e.g. "Premier League"
  category?: SofascoreCategory;
}

export interface SofascoreTime {
  initial?: number; // seconds elapsed at start of current period
  currentPeriodStartTimestamp?: number; // unix seconds
}

export interface SofascoreEvent {
  id: number;
  tournament: SofascoreTournament;
  homeTeam: SofascoreTeam;
  awayTeam: SofascoreTeam;
  homeScore?: SofascoreScore;
  awayScore?: SofascoreScore;
  status: SofascoreStatus;
  startTimestamp: number; // unix seconds
  time?: SofascoreTime;
}

export interface SofascoreLiveResponse {
  events: SofascoreEvent[];
}
