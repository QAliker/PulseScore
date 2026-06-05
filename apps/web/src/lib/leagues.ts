export type League = {
  slug: string;
  name: string;
  country: string;
  countryCode: string;
  logo: string;
  darkInvert?: boolean;
  /** Force the logo to solid white in dark mode (for colored crests like the PL lion). */
  darkWhiten?: boolean;
  apiFootballId: number;
  fdoCode: string;
  season: string;
};

function getCurrentSeasonLabel(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = month >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}/${String(year + 1).slice(2)}`;
}

// API-Football v3 (RapidAPI) league IDs — season year = year season started.
export const LEAGUES: League[] = [
  {
    slug: 'england-premier-league',
    name: 'Premier League',
    country: 'England',
    countryCode: 'GB-ENG',
    logo: 'https://media.api-sports.io/football/leagues/39.png',
    darkWhiten: true,
    apiFootballId: 39,
    fdoCode: 'PL',
    season: getCurrentSeasonLabel(),
  },
  {
    slug: 'spain-la-liga',
    name: 'La Liga',
    country: 'Spain',
    countryCode: 'ES',
    logo: 'https://media.api-sports.io/football/leagues/140.png',
    apiFootballId: 140,
    fdoCode: 'PD',
    season: getCurrentSeasonLabel(),
  },
  {
    slug: 'germany-bundesliga',
    name: 'Bundesliga',
    country: 'Germany',
    countryCode: 'DE',
    logo: 'https://media.api-sports.io/football/leagues/78.png',
    apiFootballId: 78,
    fdoCode: 'BL1',
    season: getCurrentSeasonLabel(),
  },
  {
    slug: 'italy-serie-a',
    name: 'Serie A',
    country: 'Italy',
    countryCode: 'IT',
    logo: 'https://media.api-sports.io/football/leagues/135.png',
    apiFootballId: 135,
    fdoCode: 'SA',
    season: getCurrentSeasonLabel(),
  },
  {
    slug: 'france-ligue-1',
    name: 'Ligue 1',
    country: 'France',
    countryCode: 'FR',
    logo: 'https://media.api-sports.io/football/leagues/61.png',
    darkInvert: true,
    apiFootballId: 61,
    fdoCode: 'FL1',
    season: getCurrentSeasonLabel(),
  },
];

/** Dark-mode filter classes for a league logo. */
export const leagueDarkClass = (
  league: Pick<League, 'darkInvert' | 'darkWhiten'>,
): string =>
  league.darkWhiten ? 'dark:brightness-0 dark:invert' : league.darkInvert ? 'dark:invert' : '';

export const getLeagueBySlug = (slug: string) =>
  LEAGUES.find((l) => l.slug === slug);
