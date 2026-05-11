export type League = {
  slug: string;
  name: string;
  country: string;
  flag: string;
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
    flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    apiFootballId: 39,
    fdoCode: 'PL',
    season: getCurrentSeasonLabel(),
  },
  {
    slug: 'spain-la-liga',
    name: 'La Liga',
    country: 'Spain',
    flag: '🇪🇸',
    apiFootballId: 140,
    fdoCode: 'PD',
    season: getCurrentSeasonLabel(),
  },
  {
    slug: 'germany-bundesliga',
    name: 'Bundesliga',
    country: 'Germany',
    flag: '🇩🇪',
    apiFootballId: 78,
    fdoCode: 'BL1',
    season: getCurrentSeasonLabel(),
  },
  {
    slug: 'italy-serie-a',
    name: 'Serie A',
    country: 'Italy',
    flag: '🇮🇹',
    apiFootballId: 135,
    fdoCode: 'SA',
    season: getCurrentSeasonLabel(),
  },
  {
    slug: 'france-ligue-1',
    name: 'Ligue 1',
    country: 'France',
    flag: '🇫🇷',
    apiFootballId: 61,
    fdoCode: 'FL1',
    season: getCurrentSeasonLabel(),
  },
];

export const getLeagueBySlug = (slug: string) =>
  LEAGUES.find((l) => l.slug === slug);
