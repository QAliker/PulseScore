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
  playerOut: string | null;
};

export type ApiLineupPlayer = {
  id: string;
  name: string;
  number: number;
  positionRow: number;
  positionCol: number;
  positionLabel: string;
  photo?: string | null;
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

export type ApiInjury = {
  playerId: number;
  playerName: string;
  type: string;
  reason: string;
  teamId: number;
  teamName: string;
  teamLogo: string;
  fixtureId: number;
  fixtureDate: string;
  leagueId: number;
  leagueName: string;
  season: number;
};

export type ApiPrediction = {
  winnerId: number | null;
  winnerName: string | null;
  winnerComment: string;
  advice: string;
  percentHome: string;
  percentDraw: string;
  percentAway: string;
  underOver: string | null;
  goalHome: string;
  goalAway: string;
};

export type ApiCoachCareer = {
  teamId: number;
  teamName: string;
  teamLogo: string;
  start: string;
  end: string | null;
};

export type ApiCoach = {
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
  career: ApiCoachCareer[];
};

export type ApiTransferEntry = {
  date: string;
  type: string;
  teamInId: number;
  teamInName: string;
  teamInLogo: string;
  teamOutId: number;
  teamOutName: string;
  teamOutLogo: string;
};

export type ApiTransfers = {
  playerId: number;
  playerName: string;
  transfers: ApiTransferEntry[];
};

export type ApiTrophy = {
  league: string;
  country: string;
  season: string;
  place: string;
  description: string;
};

export type ApiSidelined = {
  playerName: string;
  type: string;
  start: string;
  end: string | null;
};

export type ApiVenue = {
  id: number;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  capacity: number | null;
  surface: string | null;
  image: string | null;
};
