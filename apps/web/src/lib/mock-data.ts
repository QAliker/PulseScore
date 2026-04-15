import type { Match, Team } from './types';

const CHAMPIONSHIP_TEAMS: Array<[string, string, string]> = [
  ['lee', 'Leeds United', 'LEE'],
  ['bur', 'Burnley', 'BUR'],
  ['sun', 'Sunderland', 'SUN'],
  ['lei', 'Leicester City', 'LEI'],
  ['sou', 'Southampton', 'SOU'],
  ['wat', 'Watford', 'WAT'],
  ['shu', 'Sheffield United', 'SHU'],
  ['nor', 'Norwich City', 'NOR'],
  ['wba', 'West Brom', 'WBA'],
  ['mid', 'Middlesbrough', 'MID'],
];

const LIGUE2_TEAMS: Array<[string, string, string]> = [
  ['bor', 'Girondins Bordeaux', 'BOR'],
  ['sai', 'Saint-Étienne', 'ASSE'],
  ['laval', 'Laval', 'LAV'],
  ['ajac', 'AC Ajaccio', 'ACA'],
  ['troy', 'Troyes', 'TRO'],
  ['pau', 'Pau FC', 'PAU'],
  ['caen', 'SM Caen', 'CAE'],
  ['gre', 'Grenoble', 'GRE'],
  ['bast', 'SC Bastia', 'SCB'],
  ['amiens', 'Amiens SC', 'AMI'],
];

function team([id, name, short]: [string, string, string]): Team {
  return { id, name, shortName: short };
}

// Stable seedable PRNG for SSR-consistent fixtures.
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildFixtures(
  leagueSlug: string,
  teams: Array<[string, string, string]>,
  seed: number,
  now: Date,
): Match[] {
  const rand = mulberry32(seed);
  const matches: Match[] = [];
  // 5 matches per league: 2 live, 1 halftime, 1 finished, 1 scheduled
  const plan: Array<{ status: Match['status']; offsetMin: number; minute: number | null }> = [
    { status: 'live', offsetMin: -32, minute: 32 },
    { status: 'live', offsetMin: -67, minute: 67 },
    { status: 'halftime', offsetMin: -47, minute: 45 },
    { status: 'finished', offsetMin: -140, minute: null },
    { status: 'scheduled', offsetMin: 120, minute: null },
  ];

  for (let i = 0; i < plan.length; i++) {
    const p = plan[i];
    const h = teams[(i * 2) % teams.length];
    const a = teams[(i * 2 + 1) % teams.length];
    const kickoff = new Date(now.getTime() + p.offsetMin * 60_000);
    const homeScore =
      p.status === 'scheduled' ? 0 : Math.floor(rand() * 4);
    const awayScore =
      p.status === 'scheduled' ? 0 : Math.floor(rand() * 3);

    matches.push({
      id: `${leagueSlug}-${i}`,
      leagueSlug,
      kickoff: kickoff.toISOString(),
      status: p.status,
      minute: p.minute,
      stoppage: null,
      home: team(h),
      away: team(a),
      homeScore,
      awayScore,
      odds: {
        home: +(1.8 + rand() * 2.5).toFixed(2),
        draw: +(2.9 + rand() * 1.4).toFixed(2),
        away: +(1.8 + rand() * 2.5).toFixed(2),
      },
      updatedAt: now.toISOString(),
    });
  }
  return matches;
}

// Deterministic fixture set — seeded by day so SSR + hydration agree within the same minute.
export function getInitialFixtures(now: Date = new Date()): Match[] {
  const daySeed =
    now.getUTCFullYear() * 10000 + (now.getUTCMonth() + 1) * 100 + now.getUTCDate();
  return [
    ...buildFixtures('england-championship', CHAMPIONSHIP_TEAMS, daySeed + 1, now),
    ...buildFixtures('france-ligue-2', LIGUE2_TEAMS, daySeed + 2, now),
  ];
}
