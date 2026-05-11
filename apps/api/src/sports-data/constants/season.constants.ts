export function getCurrentSeason(): number {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = month >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return year;
}

export const HISTORY_SEASON_RAF = 2024;

export const LEAGUE_MAP: Record<string, { fdoCode: string; name: string }> = {
  '39': { fdoCode: 'PL', name: 'Premier League' },
  '140': { fdoCode: 'PD', name: 'La Liga' },
  '78': { fdoCode: 'BL1', name: 'Bundesliga' },
  '135': { fdoCode: 'SA', name: 'Serie A' },
  '61': { fdoCode: 'FL1', name: 'Ligue 1' },
  '40': { fdoCode: 'ELC', name: 'Championship' },
};
