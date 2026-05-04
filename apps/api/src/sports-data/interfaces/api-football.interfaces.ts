/**
 * Raw API response types from API-Football v3 (RapidAPI).
 * All responses are wrapped in { response: T[] }.
 */

export interface RafFixture {
  fixture: {
    id: number;
    referee: string | null;
    timezone: string;
    date: string;
    timestamp: number;
    periods: { first: number | null; second: number | null };
    venue: { id: number | null; name: string | null; city: string | null };
    status: { long: string; short: string; elapsed: number | null };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string;
    season: number;
    round: string;
  };
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null };
    away: { id: number; name: string; logo: string; winner: boolean | null };
  };
  goals: { home: number | null; away: number | null };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
    extratime: { home: number | null; away: number | null };
    penalty: { home: number | null; away: number | null };
  };
  events: RafFixtureEvent[];
  lineups: RafFixtureLineup[];
  statistics: RafFixtureTeamStatistics[];
  players: unknown[];
}

export interface RafFixtureEvent {
  time: { elapsed: number; extra: number | null };
  team: { id: number; name: string; logo: string };
  player: { id: number | null; name: string | null };
  assist: { id: number | null; name: string | null };
  type: 'Goal' | 'Card' | 'subst' | 'Var';
  detail: string;
  comments: string | null;
}

export interface RafFixtureLineup {
  team: { id: number; name: string; logo: string; colors: unknown };
  coach: { id: number; name: string; photo: string };
  formation: string;
  startXI: Array<{
    player: {
      id: number;
      name: string;
      number: number;
      pos: string;
      grid: string | null;
    };
  }>;
  substitutes: Array<{
    player: {
      id: number;
      name: string;
      number: number;
      pos: string;
      grid: null;
    };
  }>;
}

export interface RafFixtureTeamStatistics {
  team: { id: number; name: string; logo: string };
  statistics: Array<{ type: string; value: string | number | null }>;
}

export interface RafStandingResponse {
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string;
    season: number;
    standings: RafStandingEntry[][];
  };
}

export interface RafStandingEntry {
  rank: number;
  team: { id: number; name: string; logo: string };
  points: number;
  goalsDiff: number;
  group: string;
  form: string | null;
  status: string;
  description: string | null;
  all: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goals: { for: number; against: number };
  };
  home: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goals: { for: number; against: number };
  };
  away: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goals: { for: number; against: number };
  };
  update: string;
}

export interface RafTeamResponse {
  team: {
    id: number;
    name: string;
    code: string | null;
    country: string;
    founded: number | null;
    national: boolean;
    logo: string;
  };
  venue: {
    id: number | null;
    name: string | null;
    address: string | null;
    city: string | null;
    capacity: number | null;
    surface: string | null;
    image: string | null;
  };
}

export interface RafPlayerResponse {
  player: {
    id: number;
    name: string;
    firstname: string;
    lastname: string;
    age: number;
    birth: { date: string; place: string; country: string };
    nationality: string;
    height: string | null;
    weight: string | null;
    injured: boolean;
    photo: string;
  };
  statistics: Array<{
    team: { id: number; name: string; logo: string };
    league: {
      id: number;
      name: string;
      country: string;
      logo: string;
      flag: string;
      season: number;
    };
    games: {
      appearences: number | null;
      lineups: number | null;
      minutes: number | null;
      number: number | null;
      position: string;
      rating: string | null;
      captain: boolean;
    };
    goals: {
      total: number | null;
      conceded: number;
      assists: number | null;
      saves: number | null;
    };
    cards: { yellow: number; yellowred: number; red: number };
  }>;
}

export interface RafLeagueResponse {
  league: { id: number; name: string; type: string; logo: string };
  country: { name: string; code: string | null; flag: string | null };
  seasons: Array<{
    year: number;
    start: string;
    end: string;
    current: boolean;
    coverage: unknown;
  }>;
}

export interface RafOddsResponse {
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string;
    season: number;
  };
  fixture: {
    id: number;
    timezone: string;
    date: string;
    timestamp: number;
  };
  update: string;
  bookmakers: Array<{
    id: number;
    name: string;
    bets: Array<{
      id: number;
      name: string;
      values: Array<{ value: string; odd: string }>;
    }>;
  }>;
}

export interface RafInjuryResponse {
  player: { id: number; name: string; type: string; reason: string };
  team: { id: number; name: string; logo: string };
  fixture: { id: number; timezone: string; date: string; timestamp: number };
  league: {
    id: number;
    season: number;
    name: string;
    country: string;
    logo: string;
    flag: string;
  };
}

export interface RafPredictionResponse {
  predictions: {
    winner: { id: number | null; comment: string; name: string | null };
    win_or_draw: boolean;
    under_over: string | null;
    goals: { home: string; away: string };
    advice: string;
    percent: { home: string; draw: string; away: string };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string;
    season: number;
  };
  teams: {
    home: {
      id: number;
      name: string;
      logo: string;
      last_5: unknown;
      league: unknown;
    };
    away: {
      id: number;
      name: string;
      logo: string;
      last_5: unknown;
      league: unknown;
    };
  };
  comparison: unknown;
  h2h: RafFixture[];
}

export interface RafCoachResponse {
  id: number;
  name: string;
  firstname: string;
  lastname: string;
  age: number | null;
  birth: { date: string | null; place: string | null; country: string | null };
  nationality: string | null;
  height: string | null;
  weight: string | null;
  photo: string;
  team: { id: number; name: string; logo: string } | null;
  career: Array<{
    team: { id: number; name: string; logo: string };
    start: string;
    end: string | null;
  }>;
}

export interface RafTransferResponse {
  player: { id: number; name: string };
  update: string;
  transfers: Array<{
    date: string;
    type: string;
    teams: {
      in: { id: number; name: string; logo: string };
      out: { id: number; name: string; logo: string };
    };
  }>;
}

export interface RafTrophyResponse {
  league: string;
  country: string;
  season: string;
  place: string;
  description: string;
}

export interface RafSidelinedResponse {
  player: { id: number; name: string; type: string };
  start: string;
  end: string | null;
}

export interface RafCountryResponse {
  name: string;
  code: string | null;
  flag: string | null;
}

export interface RafVenueResponse {
  id: number;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  capacity: number | null;
  surface: string | null;
  image: string | null;
}
