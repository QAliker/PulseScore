import type {
  Match,
  Team,
  LineupPlayer,
  TeamLineup,
  MatchLineups,
  MatchEventEntry,
  MatchEventType,
  H2HMatch,
  H2HStats,
  MatchDetail,
} from './types';

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
      goalscorers: [],
      cards: [],
      substitutions: [],
      updatedAt: now.toISOString(),
    });
  }
  return matches;
}

// ─── Player name pools ────────────────────────────────────────────────────────

const EN_NAMES = {
  gk: ['Jack Walton', 'Joe Wildsmith', 'Karl Darlow', 'Nathan Baxter', 'Alex Palmer', 'Daniel Iversen'],
  def: ['Luke Ayling', 'Liam Cooper', 'Pascal Struijk', 'Ben Davies', 'Ethan Laird', 'Anel Ahmedhodzic', 'Ryan Manning', 'Levi Colwill', 'Joel Ward', 'Max Watters', 'James Chester', 'Zak Swanson', 'Brooke Norton-Cuffy', 'Harry Toffolo'],
  mid: ['Ethan Ampadu', 'Glen Kamara', 'Brenden Aaronson', 'Adam Forshaw', 'Crysencio Summerville', 'Sam Byram', 'Joe Gelhardt', 'Lewis Bate', 'Mateusz Klich', 'Tyler Adams', 'Charlie Cresswell', 'Archie Gray', 'Ian Poveda'],
  fwd: ['Patrick Bamford', 'Joel Piroe', 'Georginio Rutter', 'Wilfried Gnonto', 'Mateo Joseph', 'Dan James', 'Rodrigo Moreno', 'Sonny Perkins', 'Kieffer Moore', 'Sam Greenwood'],
  coach: ['Daniel Farke', 'Simon Parker', 'Paul Ince', 'Wayne Rooney', 'Michael Appleton', 'Lee Bowyer'],
};

const FR_NAMES = {
  gk: ['Paul Bernardoni', 'Rémy Descamps', 'Thomas Callens', 'Gauthier Gallon', 'Benjamin Lecomte', 'Théo Defourny'],
  def: ['Edson Mexer', 'Lamine Gueye', 'Léo Pétrot', 'Mathieu Peybernes', 'Nathan Bitumazala', 'Adama Niane', 'Jules Keita', 'Hamza Sakhi', 'Cheick Minta', 'Julien Faussurier', 'Pierre Sagnes', 'Théo Zidane', 'Quentin Beunardeau'],
  mid: ['Franck Honorat', 'Florian Sotoca', 'Romain Philippoteaux', 'Sylvain Marveaux', 'Maxime Bernauer', 'Mama Baldé', 'Nicolas Janvier', 'Florent Mollet', 'Jimmy Roye', 'Cheick Doucouré', 'Tom Ducrocq'],
  fwd: ['Cheick Diabaté', 'Lenny Pirard', 'Junior Dina Ebimbe', 'Moussa Sidibé', 'Habib Diallo', 'Mathieu Cafaro', 'Loïc Rémy', 'Mostafa Mohamed'],
  coach: ["Olivier Dall'Oglio", 'Pascal Dupraz', 'Patrick Kisnorbo', 'Laurent Battles', 'Frédéric Hantz'],
};

// ─── Match detail generation ──────────────────────────────────────────────────

function stringToSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return h >>> 0;
}

function pickUnique(pool: string[], count: number, used: Set<string>, rand: () => number): string[] {
  const available = pool.filter((n) => !used.has(n));
  const result: string[] = [];
  for (let i = 0; i < count && available.length > 0; i++) {
    const idx = Math.floor(rand() * available.length);
    const [name] = available.splice(idx, 1);
    used.add(name);
    result.push(name);
  }
  return result;
}

function buildTeamLineup(
  names: typeof EN_NAMES,
  used: Set<string>,
  rand: () => number,
): TeamLineup {
  const DEF_LABELS = ['RB', 'CB', 'CB', 'LB'];
  const MID_LABELS = ['RM', 'CM', 'CM', 'LM'];

  const [gkName] = pickUnique(names.gk, 1, used, rand);
  const defNames = pickUnique(names.def, 4, used, rand);
  const midNames = pickUnique(names.mid, 4, used, rand);
  const fwdNames = pickUnique(names.fwd, 2, used, rand);
  const [benchGk] = pickUnique(names.gk, 1, used, rand);
  const benchOut = pickUnique([...names.def, ...names.mid, ...names.fwd], 6, used, rand);
  const coach = names.coach[Math.floor(rand() * names.coach.length)];

  const starting: LineupPlayer[] = [
    { id: 'p1', name: gkName ?? 'Goalkeeper', number: 1, positionRow: 0, positionCol: 0, positionLabel: 'GK' },
    ...defNames.map((name, i): LineupPlayer => ({
      id: `p${2 + i}`, name, number: 2 + i, positionRow: 1, positionCol: i, positionLabel: DEF_LABELS[i],
    })),
    ...midNames.map((name, i): LineupPlayer => ({
      id: `p${6 + i}`, name, number: 6 + i, positionRow: 2, positionCol: i, positionLabel: MID_LABELS[i],
    })),
    ...fwdNames.map((name, i): LineupPlayer => ({
      id: `p${10 + i}`, name, number: 10 + i, positionRow: 3, positionCol: i, positionLabel: 'ST',
    })),
  ];

  const bench: LineupPlayer[] = [
    { id: 'p12', name: benchGk ?? 'Reserve GK', number: 12, positionRow: 0, positionCol: 0, positionLabel: 'GK' },
    ...benchOut.map((name, i): LineupPlayer => ({
      id: `p${13 + i}`, name, number: 13 + i, positionRow: 1, positionCol: 0, positionLabel: 'SUB',
    })),
  ];

  return { formation: '4-4-2', starting, bench, coach };
}

function generateEvents(
  match: Match,
  home: TeamLineup,
  away: TeamLineup,
  rand: () => number,
): MatchEventEntry[] {
  if (match.status === 'scheduled') return [];
  const maxMinute = match.status === 'finished' ? 90 : (match.minute ?? 45);
  if (maxMinute < 1) return [];

  const events: MatchEventEntry[] = [];
  const usedMinutes = new Set<number>();

  function uniqueMin(max: number): number {
    let m = Math.max(1, Math.floor(rand() * max));
    let tries = 0;
    while (usedMinutes.has(m) && tries++ < 30) m = (m % max) + 1;
    usedMinutes.add(m);
    return m;
  }

  const homeScorers = home.starting.filter((p) => p.positionRow >= 2);
  const awayScorers = away.starting.filter((p) => p.positionRow >= 2);

  for (let i = 0; i < match.homeScore; i++) {
    const scorer = homeScorers[Math.floor(rand() * homeScorers.length)];
    const others = homeScorers.filter((p) => p !== scorer);
    const assist = others.length && rand() > 0.42 ? others[Math.floor(rand() * others.length)] : null;
    events.push({
      id: `hg${i}`,
      minute: uniqueMin(maxMinute),
      type: 'goal',
      team: 'home',
      playerName: scorer?.name ?? 'Unknown',
      detail: assist?.name,
    });
  }

  for (let i = 0; i < match.awayScore; i++) {
    const scorer = awayScorers[Math.floor(rand() * awayScorers.length)];
    const others = awayScorers.filter((p) => p !== scorer);
    const assist = others.length && rand() > 0.42 ? others[Math.floor(rand() * others.length)] : null;
    events.push({
      id: `ag${i}`,
      minute: uniqueMin(maxMinute),
      type: 'goal',
      team: 'away',
      playerName: scorer?.name ?? 'Unknown',
      detail: assist?.name,
    });
  }

  const numYellows = Math.floor(rand() * 4);
  for (let i = 0; i < numYellows; i++) {
    const team: 'home' | 'away' = rand() > 0.5 ? 'home' : 'away';
    const players = (team === 'home' ? home : away).starting;
    const player = players[Math.floor(rand() * players.length)];
    events.push({
      id: `yc${i}`,
      minute: uniqueMin(maxMinute),
      type: 'yellow' as MatchEventType,
      team,
      playerName: player?.name ?? 'Unknown',
    });
  }

  if (maxMinute > 55) {
    const numSubs = 1 + Math.floor(rand() * 3);
    for (let i = 0; i < numSubs; i++) {
      const team: 'home' | 'away' = rand() > 0.5 ? 'home' : 'away';
      const lineup = team === 'home' ? home : away;
      const outPlayer = lineup.starting.filter((p) => p.positionRow > 0)[Math.floor(rand() * 10)];
      const inPlayer = lineup.bench[1 + Math.floor(rand() * (lineup.bench.length - 1))];
      if (!outPlayer || !inPlayer) continue;
      const min = 55 + Math.floor(rand() * Math.max(1, maxMinute - 56));
      if (!usedMinutes.has(min)) {
        usedMinutes.add(min);
        events.push({
          id: `sub${i}`,
          minute: min,
          type: 'sub',
          team,
          playerName: inPlayer.name,
          detail: outPlayer.name,
        });
      }
    }
  }

  return events.sort((a, b) => a.minute - b.minute);
}

function generateH2H(match: Match, rand: () => number): H2HStats {
  const base = new Date('2026-04-15').getTime();
  const h2hMatches: H2HMatch[] = [];

  for (let i = 0; i < 5; i++) {
    const daysAgo = 90 + Math.floor(rand() * 480);
    const d = new Date(base - daysAgo * 86_400_000);
    const dateStr = d.toISOString().split('T')[0];
    const homeFirst = rand() > 0.5;
    const hs = Math.floor(rand() * 4);
    const as = Math.floor(rand() * 3);
    h2hMatches.push({
      id: `h2h${i}`,
      date: dateStr,
      homeTeamName: homeFirst ? match.home.name : match.away.name,
      awayTeamName: homeFirst ? match.away.name : match.home.name,
      homeTeamId: homeFirst ? match.home.id : match.away.id,
      awayTeamId: homeFirst ? match.away.id : match.home.id,
      homeScore: hs,
      awayScore: as,
    });
  }

  h2hMatches.sort((a, b) => b.date.localeCompare(a.date));

  let homeWins = 0, draws = 0, awayWins = 0;
  for (const m of h2hMatches) {
    const isHome = m.homeTeamId === match.home.id;
    const homeTeamScore = isHome ? m.homeScore : m.awayScore;
    const awayTeamScore = isHome ? m.awayScore : m.homeScore;
    if (homeTeamScore > awayTeamScore) homeWins++;
    else if (homeTeamScore < awayTeamScore) awayWins++;
    else draws++;
  }

  return { matches: h2hMatches, homeWins, draws, awayWins };
}

export function getMatchDetail(matchId: string, match: Match): MatchDetail {
  const seed = stringToSeed(matchId);
  const rand = mulberry32(seed);
  const isEnglish = match.leagueSlug === 'england-championship';
  const names = isEnglish ? EN_NAMES : FR_NAMES;
  const usedNames = new Set<string>();
  const homeLineup = buildTeamLineup(names, usedNames, rand);
  const awayLineup = buildTeamLineup(names, usedNames, rand);
  return {
    matchId,
    lineups: { home: homeLineup, away: awayLineup },
    events: generateEvents(match, homeLineup, awayLineup, rand),
    h2h: generateH2H(match, rand),
  };
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
