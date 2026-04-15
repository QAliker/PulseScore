export type League = {
  slug: string;
  name: string;
  country: string;
  flag: string;
  apiFootballId: number;
  season: string;
};

// Free-tier APIFootball.com leagues for PulseScore MVP.
export const LEAGUES: League[] = [
  {
    slug: 'england-championship',
    name: 'Championship',
    country: 'England',
    flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    apiFootballId: 40,
    season: '2025/26',
  },
  {
    slug: 'france-ligue-2',
    name: 'Ligue 2',
    country: 'France',
    flag: '🇫🇷',
    apiFootballId: 62,
    season: '2025/26',
  },
];

export const getLeagueBySlug = (slug: string) =>
  LEAGUES.find((l) => l.slug === slug);
