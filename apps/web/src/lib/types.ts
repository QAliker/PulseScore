export type MatchStatus = 'scheduled' | 'live' | 'halftime' | 'finished' | 'postponed';

export type Goalscorer = {
  time: string;
  homeScorer: string | null;
  awayScorer: string | null;
  score: string;
  info: string | null;
};

export type MatchCardEvent = {
  time: string;
  homeFault: string | null;
  awayFault: string | null;
  card: string;
  info: string | null;
};

export type Substitution = {
  time: string;
  team: 'home' | 'away';
  playerIn: string | null;
  playerOut: string | null;
};

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
  leagueLogo?: string;
  leagueName?: string;
  leagueCountry?: string;
  venue?: string;
  round?: number | null;
  kickoff: string; // ISO
  status: MatchStatus;
  minute: number | null; // null when not live
  stoppage: number | null; // e.g. 3 for "90+3'"
  home: Team;
  away: Team;
  homeScore: number;
  awayScore: number;
  odds: Odds | null;
  goalscorers: Goalscorer[];
  cards: MatchCardEvent[];
  substitutions: Substitution[];
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

// ─── Match Detail ─────────────────────────────────────────────────────────────

export type LineupPlayer = {
  id: string;
  name: string;
  number: number;
  positionRow: number; // 0=GK 1=DEF 2=MID 3=FWD
  positionCol: number; // 0-based column within row
  positionLabel: string; // "GK" | "RB" | "CB" | "LB" | "CM" | "RM" | "LM" | "ST"
  photo?: string | null;
};

export type TeamLineup = {
  formation: string; // "4-4-2"
  starting: LineupPlayer[];
  bench: LineupPlayer[];
  coach: string;
};

export type MatchLineups = {
  home: TeamLineup;
  away: TeamLineup;
};

export type MatchEventType = 'goal' | 'owngoal' | 'yellow' | 'red' | 'yellowred' | 'sub';

export type MatchEventEntry = {
  id: string;
  minute: number;
  stoppage?: number;
  type: MatchEventType;
  team: 'home' | 'away';
  playerName: string;
  detail?: string; // assist name for goal; player-out name for sub
  playerPhoto?: string | null;
};

export type H2HMatch = {
  id: string;
  date: string; // "YYYY-MM-DD"
  homeTeamName: string;
  awayTeamName: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
};

export type H2HStats = {
  matches: H2HMatch[];
  homeWins: number;
  draws: number;
  awayWins: number;
};

export type MatchDetail = {
  matchId: string;
  lineups: MatchLineups;
  events: MatchEventEntry[];
  h2h: H2HStats;
};

// ─── New socket event types ───────────────────────────────────────────────────

export type CardEvent = {
  type: 'card';
  matchId: string;
  team: 'home' | 'away';
  playerName: string;
  cardType: 'yellow' | 'red';
  minute: number;
  updatedAt: string;
};

export type SubstitutionEvent = {
  type: 'sub';
  matchId: string;
  team: 'home' | 'away';
  playerInName: string;
  playerOutName: string;
  minute: number;
  updatedAt: string;
};

export type MatchEvent =
  | ScoreChangeEvent
  | MinuteTickEvent
  | StatusChangeEvent
  | CardEvent
  | SubstitutionEvent;
