// Raw ESPN soccer scoreboard response shapes (site.api.espn.com).
// Only fields the live normalizer consumes are typed; ESPN returns much more.

export interface EspnLogo {
  href: string;
}

export interface EspnLeague {
  id: string;
  name: string;
  slug: string;
  logos?: EspnLogo[];
}

export interface EspnStatusType {
  state: 'pre' | 'in' | 'post';
  name: string; // e.g. STATUS_FIRST_HALF, STATUS_HALFTIME, STATUS_FULL_TIME, STATUS_POSTPONED
  shortDetail: string; // e.g. "67'", "HT", "FT"
  description?: string;
}

export interface EspnStatus {
  displayClock?: string; // e.g. "67'"
  type: EspnStatusType;
}

export interface EspnCompetitorTeam {
  id: string;
  displayName: string;
  logo?: string;
}

export interface EspnCompetitor {
  homeAway: 'home' | 'away';
  score?: string;
  team: EspnCompetitorTeam;
}

export interface EspnVenue {
  fullName?: string;
}

export interface EspnCompetition {
  competitors: EspnCompetitor[];
  venue?: EspnVenue;
}

export interface EspnEvent {
  id: string;
  date: string; // ISO
  status: EspnStatus;
  competitions: EspnCompetition[];
}

export interface EspnScoreboardResponse {
  leagues?: EspnLeague[];
  events?: EspnEvent[];
}
