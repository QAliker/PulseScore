export type ApiTeam = {
  id: string;
  externalId: string;
  name: string;
  logo: string | null;
  shortName: string | null;
  country: string | null;
};

export type ApiPlayer = {
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
};

export type ApiPlayerDetail = ApiPlayer & {
  teamName: string | null;
  teamLogo: string | null;
};

export type ApiStanding = {
  leagueId: string;
  leagueName: string;
  teamId: string;
  teamName: string;
  teamBadge: string | null;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  promotion: string | null;
};

export type ApiLeague = {
  id: string;
  externalId: string;
  name: string;
  sport: string;
  country: string | null;
  logo: string | null;
};

export type ApiGoalscorer = {
  time: string;
  homeScorer: string | null;
  awayScorer: string | null;
  score: string;
  info: string | null;
};

export type ApiCard = {
  time: string;
  homeFault: string | null;
  awayFault: string | null;
  card: string;
  info: string | null;
};

export type ApiSubstitution = {
  time: string;
  team: 'home' | 'away';
  playerIn: string | null;
};

export type ApiLineupPlayer = {
  id: string;
  name: string;
  number: number;
  positionRow: number;
  positionCol: number;
  positionLabel: string;
};

export type ApiTeamLineup = {
  formation: string;
  starting: ApiLineupPlayer[];
  bench: ApiLineupPlayer[];
  coach: string;
};

export type ApiMatchLineups = {
  home: ApiTeamLineup;
  away: ApiTeamLineup;
};

export type ApiStatistic = {
  type: string;
  home: string;
  away: string;
};

export type ApiMatch = {
  id: string;
  externalId: string;
  homeTeam: ApiTeam;
  awayTeam: ApiTeam;
  homeScore: number | null;
  awayScore: number | null;
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'CANCELLED' | 'POSTPONED';
  sport: string;
  league: ApiLeague | null;
  startTime: string;
  progress: string | null;
  venue: string | null;
  round: number | null;
  goalscorers: ApiGoalscorer[];
  cards: ApiCard[];
  substitutions: ApiSubstitution[];
  lineups: ApiMatchLineups | null;
  statistics: ApiStatistic[];
};

export type ApiH2h = {
  headToHead: ApiMatch[];
  firstTeamResults: ApiMatch[];
  secondTeamResults: ApiMatch[];
};
