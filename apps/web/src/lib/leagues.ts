export type League = {
  slug: string;
  name: string;
  country: string;
  flag: string;
  apiFootballId: number;
  season: string;
};

// API-Football v3 (RapidAPI) league IDs — season year = year season started.
export const LEAGUES: League[] = [
  {
    slug: 'england-premier-league',
    name: 'Premier League',
    country: 'England',
    flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    apiFootballId: 39,
    season: '2024/25',
  },
  {
    slug: 'spain-la-liga',
    name: 'La Liga',
    country: 'Spain',
    flag: '🇪🇸',
    apiFootballId: 140,
    season: '2024/25',
  },
  {
    slug: 'germany-bundesliga',
    name: 'Bundesliga',
    country: 'Germany',
    flag: '🇩🇪',
    apiFootballId: 78,
    season: '2024/25',
  },
  {
    slug: 'italy-serie-a',
    name: 'Serie A',
    country: 'Italy',
    flag: '🇮🇹',
    apiFootballId: 135,
    season: '2024/25',
  },
  {
    slug: 'france-ligue-1',
    name: 'Ligue 1',
    country: 'France',
    flag: '🇫🇷',
    apiFootballId: 61,
    season: '2024/25',
  },
];

export const getLeagueBySlug = (slug: string) =>
  LEAGUES.find((l) => l.slug === slug);
