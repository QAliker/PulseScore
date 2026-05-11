# Football-Data.org Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add football-data.org as the data source for the current season (2025/26+), keeping API-Football for historical seasons (2022–2024).

**Architecture:** A new `FootballDataOrgClient` + `FootballDataOrgNormalizer` are added alongside the existing API-Football pair. Services route to the correct source via `getCurrentSeason()`. Team and league entities store a `fdoExternalId` column so FDO-sourced match data resolves to internal DB IDs, keeping navigation consistent across seasons.

**Tech Stack:** NestJS, Prisma 7, TypeScript, football-data.org v4 REST API, Redis cache

---

## File Map

| Action | Path |
|--------|------|
| Create | `apps/api/src/sports-data/constants/season.constants.ts` |
| Create | `apps/api/src/sports-data/interfaces/football-data-org.interfaces.ts` |
| Create | `apps/api/src/sports-data/client/football-data-org.client.ts` |
| Create | `apps/api/src/sports-data/normalizer/football-data-org.normalizer.ts` |
| Create | `apps/api/src/sports-data/__tests__/football-data-org.client.spec.ts` |
| Create | `apps/api/src/sports-data/__tests__/football-data-org.normalizer.spec.ts` |
| Modify | `apps/api/prisma/schema.prisma` |
| Modify | `apps/api/src/sports-data/sports-data.module.ts` |
| Modify | `apps/api/src/sports-data/services/standings.service.ts` |
| Modify | `apps/api/src/sports-data/services/fixtures.service.ts` |
| Modify | `apps/api/src/sports-data/services/livescore.service.ts` |
| Modify | `apps/api/src/sports-data/services/teams.service.ts` |
| Modify | `apps/api/src/sports-data/services/warmup.service.ts` |
| Modify | `apps/web/src/lib/leagues.ts` |

---

## Task 1: Season constants + league map

**Files:**
- Create: `apps/api/src/sports-data/constants/season.constants.ts`

- [ ] **Step 1: Create the constants file**

```typescript
// apps/api/src/sports-data/constants/season.constants.ts

export function getCurrentSeason(): number {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = month >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return year;
}

export const HISTORY_SEASON_RAF = 2024;

export const LEAGUE_MAP: Record<string, { fdoCode: string; name: string }> = {
  '39':  { fdoCode: 'PL',  name: 'Premier League' },
  '140': { fdoCode: 'PD',  name: 'La Liga' },
  '78':  { fdoCode: 'BL1', name: 'Bundesliga' },
  '135': { fdoCode: 'SA',  name: 'Serie A' },
  '61':  { fdoCode: 'FL1', name: 'Ligue 1' },
  '40':  { fdoCode: 'ELC', name: 'Championship' },
};
```

- [ ] **Step 2: Write a quick unit test**

```typescript
// apps/api/src/sports-data/__tests__/season.constants.spec.ts
import { getCurrentSeason, LEAGUE_MAP } from '../constants/season.constants';

describe('getCurrentSeason', () => {
  it('returns current year in August', () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-08-15'));
    expect(getCurrentSeason()).toBe(2025);
    jest.useRealTimers();
  });

  it('returns previous year in May', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-11'));
    expect(getCurrentSeason()).toBe(2025);
    jest.useRealTimers();
  });
});

describe('LEAGUE_MAP', () => {
  it('maps Premier League API-Football ID to PL', () => {
    expect(LEAGUE_MAP['39'].fdoCode).toBe('PL');
  });
});
```

- [ ] **Step 3: Run test**

```bash
cd apps/api && npx jest season.constants --no-coverage
```

Expected: PASS (3 tests)

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/sports-data/constants/season.constants.ts \
        apps/api/src/sports-data/__tests__/season.constants.spec.ts
git commit -m "feat(sports-data): add season routing constants and league map"
```

---

## Task 2: Prisma migration — add fdoExternalId

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Add fdoExternalId to League and Team models**

In `apps/api/prisma/schema.prisma`, add one line to each model:

```prisma
model League {
  id            String     @id @default(cuid())
  externalId    String     @unique @map("external_id")
  fdoExternalId String?    @unique @map("fdo_external_id")   // ← add this line
  name          String
  sport         String
  country       String?
  logo          String?
  createdAt     DateTime   @default(now()) @map("created_at")
  updatedAt     DateTime   @updatedAt @map("updated_at")
  matches       Match[]
  standings     Standing[]

  @@map("leagues")
}

model Team {
  id            String     @id @default(cuid())
  externalId    String     @unique @map("external_id")
  fdoExternalId String?    @unique @map("fdo_external_id")   // ← add this line
  name          String
  shortName     String?    @map("short_name")
  logo          String?
  country       String?
  createdAt     DateTime   @default(now()) @map("created_at")
  updatedAt     DateTime   @updatedAt @map("updated_at")
  standings     Standing[]
  players       Player[]

  @@map("teams")
}
```

- [ ] **Step 2: Run migration**

```bash
cd apps/api && npx prisma migrate dev --name add_fdo_external_id
```

Expected: migration created and applied, Prisma client regenerated.

- [ ] **Step 3: Verify schema compiles**

```bash
cd apps/api && npx prisma validate
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/
git commit -m "feat(db): add fdoExternalId to League and Team for football-data.org mapping"
```

---

## Task 3: FDO interfaces

**Files:**
- Create: `apps/api/src/sports-data/interfaces/football-data-org.interfaces.ts`

- [ ] **Step 1: Create the interfaces file**

```typescript
// apps/api/src/sports-data/interfaces/football-data-org.interfaces.ts

export interface FdoTeam {
  id: number;
  name: string;
  shortName?: string;
  crest: string;
}

export interface FdoScore {
  winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null;
  fullTime: { home: number | null; away: number | null };
  halfTime: { home: number | null; away: number | null };
}

export interface FdoMatch {
  id: number;
  utcDate: string;
  status: string;
  matchday: number | null;
  homeTeam: FdoTeam;
  awayTeam: FdoTeam;
  score: FdoScore;
  competition: { id: number; name: string; code: string };
}

export interface FdoStanding {
  position: number;
  team: FdoTeam;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  form: string | null;
}

export interface FdoStandingsResponse {
  competition: { id: number; name: string; code: string };
  standings: Array<{ type: string; table: FdoStanding[] }>;
}

export interface FdoMatchesResponse {
  matches: FdoMatch[];
}

export interface FdoCompetitionTeamsResponse {
  competition: { id: number; name: string; code: string };
  teams: FdoTeam[];
}

export interface FdoH2hResponse {
  head2head: {
    numberOfMatches: number;
    matches: FdoMatch[];
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/sports-data/interfaces/football-data-org.interfaces.ts
git commit -m "feat(sports-data): add football-data.org TypeScript interfaces"
```

---

## Task 4: FDO HTTP client

**Files:**
- Create: `apps/api/src/sports-data/client/football-data-org.client.ts`
- Create: `apps/api/src/sports-data/__tests__/football-data-org.client.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/sports-data/__tests__/football-data-org.client.spec.ts
import { FootballDataOrgClient } from '../client/football-data-org.client';
import { ConfigService } from '@nestjs/config';

const mockConfigService = {
  get: jest.fn().mockReturnValue('test-token'),
} as unknown as ConfigService;

describe('FootballDataOrgClient', () => {
  let client: FootballDataOrgClient;

  beforeEach(() => {
    client = new FootballDataOrgClient(mockConfigService);
    global.fetch = jest.fn();
  });

  afterEach(() => jest.resetAllMocks());

  it('calls correct URL with X-Auth-Token header', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ matches: [] }),
    });

    await client.get<{ matches: unknown[] }>('competitions/PL/matches', { matchday: '5' });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.football-data.org/v4/competitions/PL/matches?matchday=5',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Auth-Token': 'test-token' }),
      }),
    );
  });

  it('throws on non-ok response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    });

    await expect(
      client.get('competitions/PL/matches'),
    ).rejects.toThrow('football-data.org request failed: 429 Too Many Requests');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/api && npx jest football-data-org.client --no-coverage
```

Expected: FAIL — "Cannot find module '../client/football-data-org.client'"

- [ ] **Step 3: Implement the client**

```typescript
// apps/api/src/sports-data/client/football-data-org.client.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FootballDataOrgClient {
  private readonly logger = new Logger(FootballDataOrgClient.name);
  private readonly baseUrl = 'https://api.football-data.org/v4';
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('FOOTBALL_DATA_ORG_KEY') ?? '';
  }

  async get<T>(
    endpoint: string,
    params: Record<string, string | number> = {},
  ): Promise<T> {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      query.set(k, String(v));
    }
    const qs = query.toString();
    const url = `${this.baseUrl}/${endpoint}${qs ? `?${qs}` : ''}`;
    this.logger.debug(`GET ${url}`);

    const response = await fetch(url, {
      headers: {
        'X-Auth-Token': this.apiKey,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `football-data.org request failed: ${response.status} ${response.statusText}`,
      );
    }

    return response.json() as Promise<T>;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/api && npx jest football-data-org.client --no-coverage
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/sports-data/client/football-data-org.client.ts \
        apps/api/src/sports-data/__tests__/football-data-org.client.spec.ts
git commit -m "feat(sports-data): add FootballDataOrgClient HTTP client"
```

---

## Task 5: FDO normalizer

**Files:**
- Create: `apps/api/src/sports-data/normalizer/football-data-org.normalizer.ts`
- Create: `apps/api/src/sports-data/__tests__/football-data-org.normalizer.spec.ts`

The normalizer is **pure** (no DB injection). Services resolve `fdoExternalId → externalId` before calling it, or pass fallback IDs.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/sports-data/__tests__/football-data-org.normalizer.spec.ts
import { FootballDataOrgNormalizer } from '../normalizer/football-data-org.normalizer';
import { FdoMatch, FdoStanding } from '../interfaces/football-data-org.interfaces';

describe('FootballDataOrgNormalizer', () => {
  let normalizer: FootballDataOrgNormalizer;

  beforeEach(() => {
    normalizer = new FootballDataOrgNormalizer();
  });

  const fdoMatch: FdoMatch = {
    id: 496380,
    utcDate: '2025-08-16T14:00:00Z',
    status: 'FINISHED',
    matchday: 1,
    homeTeam: { id: 64, name: 'Liverpool FC', crest: 'https://crests.football-data.org/64.png' },
    awayTeam: { id: 66, name: 'Manchester United FC', crest: 'https://crests.football-data.org/66.png' },
    score: {
      winner: 'HOME_TEAM',
      fullTime: { home: 3, away: 1 },
      halfTime: { home: 1, away: 0 },
    },
    competition: { id: 2021, name: 'Premier League', code: 'PL' },
  };

  describe('normalizeStatus', () => {
    it('maps FINISHED', () => expect(normalizer.normalizeStatus('FINISHED')).toBe('FINISHED'));
    it('maps IN_PLAY to LIVE', () => expect(normalizer.normalizeStatus('IN_PLAY')).toBe('LIVE'));
    it('maps PAUSED to LIVE', () => expect(normalizer.normalizeStatus('PAUSED')).toBe('LIVE'));
    it('maps POSTPONED', () => expect(normalizer.normalizeStatus('POSTPONED')).toBe('POSTPONED'));
    it('maps CANCELLED', () => expect(normalizer.normalizeStatus('CANCELLED')).toBe('CANCELLED'));
    it('maps SCHEDULED', () => expect(normalizer.normalizeStatus('SCHEDULED')).toBe('SCHEDULED'));
  });

  describe('normalizeMatch', () => {
    it('maps FDO match to MatchDto with fdo: prefixed id', () => {
      const dto = normalizer.normalizeMatch(fdoMatch, 'raf-liverpool-id', 'raf-manutd-id', 'raf-pl-id');
      expect(dto.id).toBe('fdo:496380');
      expect(dto.externalId).toBe('fdo:496380');
      expect(dto.status).toBe('FINISHED');
      expect(dto.homeScore).toBe(3);
      expect(dto.awayScore).toBe(1);
      expect(dto.homeTeam.id).toBe('raf-liverpool-id');
      expect(dto.homeTeam.name).toBe('Liverpool FC');
      expect(dto.homeTeam.logo).toBe('https://crests.football-data.org/64.png');
      expect(dto.awayTeam.id).toBe('raf-manutd-id');
      expect(dto.round).toBe(1);
      expect(dto.sport).toBe('Football');
    });

    it('falls back to fdo: prefixed team id when resolvedId is null', () => {
      const dto = normalizer.normalizeMatch(fdoMatch, null, null, null);
      expect(dto.homeTeam.id).toBe('fdo:64');
      expect(dto.awayTeam.id).toBe('fdo:66');
      expect(dto.league.id).toBe('fdo:PL');
    });
  });

  describe('normalizeStanding', () => {
    const fdoStanding: FdoStanding = {
      position: 1,
      team: { id: 64, name: 'Liverpool FC', crest: 'https://...' },
      playedGames: 5,
      won: 4,
      draw: 1,
      lost: 0,
      goalsFor: 12,
      goalsAgainst: 3,
      points: 13,
      form: 'WWWDW',
    };

    it('maps FDO standing to StandingDto', () => {
      const dto = normalizer.normalizeStanding(fdoStanding, 'internal-pl-id', 'Premier League', 'raf-liverpool-id');
      expect(dto.position).toBe(1);
      expect(dto.played).toBe(5);
      expect(dto.won).toBe(4);
      expect(dto.drawn).toBe(1);
      expect(dto.lost).toBe(0);
      expect(dto.goalsFor).toBe(12);
      expect(dto.goalsAgainst).toBe(3);
      expect(dto.points).toBe(13);
      expect(dto.teamId).toBe('raf-liverpool-id');
      expect(dto.leagueId).toBe('internal-pl-id');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/api && npx jest football-data-org.normalizer --no-coverage
```

Expected: FAIL — "Cannot find module '../normalizer/football-data-org.normalizer'"

- [ ] **Step 3: Implement the normalizer**

```typescript
// apps/api/src/sports-data/normalizer/football-data-org.normalizer.ts
import { Injectable } from '@nestjs/common';
import { FdoMatch, FdoStanding } from '../interfaces/football-data-org.interfaces';
import { MatchDto } from '../dto/match.dto';
import { TeamDto } from '../dto/team.dto';
import { LeagueDto } from '../dto/league.dto';
import { StandingDto } from '../dto/standing.dto';

@Injectable()
export class FootballDataOrgNormalizer {
  normalizeStatus(status: string): MatchDto['status'] {
    switch (status) {
      case 'FINISHED': return 'FINISHED';
      case 'IN_PLAY':
      case 'PAUSED':
      case 'LIVE': return 'LIVE';
      case 'POSTPONED': return 'POSTPONED';
      case 'CANCELLED':
      case 'SUSPENDED': return 'CANCELLED';
      default: return 'SCHEDULED';
    }
  }

  normalizeMatch(
    raw: FdoMatch,
    homeTeamResolvedId: string | null,
    awayTeamResolvedId: string | null,
    leagueResolvedId: string | null,
  ): MatchDto {
    const dto = new MatchDto();
    dto.id = `fdo:${raw.id}`;
    dto.externalId = `fdo:${raw.id}`;
    dto.status = this.normalizeStatus(raw.status);
    dto.sport = 'Football';
    dto.startTime = new Date(raw.utcDate);
    dto.round = raw.matchday;
    dto.venue = null;
    dto.progress = null;
    dto.homeScore = raw.score.fullTime.home;
    dto.awayScore = raw.score.fullTime.away;
    dto.goalscorers = [];
    dto.cards = [];
    dto.substitutions = [];
    dto.lineups = null;
    dto.statistics = [];

    const homeTeam = new TeamDto();
    homeTeam.id = homeTeamResolvedId ?? `fdo:${raw.homeTeam.id}`;
    homeTeam.externalId = homeTeamResolvedId ?? `fdo:${raw.homeTeam.id}`;
    homeTeam.name = raw.homeTeam.name;
    homeTeam.logo = raw.homeTeam.crest || null;
    dto.homeTeam = homeTeam;

    const awayTeam = new TeamDto();
    awayTeam.id = awayTeamResolvedId ?? `fdo:${raw.awayTeam.id}`;
    awayTeam.externalId = awayTeamResolvedId ?? `fdo:${raw.awayTeam.id}`;
    awayTeam.name = raw.awayTeam.name;
    awayTeam.logo = raw.awayTeam.crest || null;
    dto.awayTeam = awayTeam;

    const league = new LeagueDto();
    league.id = leagueResolvedId ?? `fdo:${raw.competition.code}`;
    league.externalId = leagueResolvedId ?? `fdo:${raw.competition.code}`;
    league.name = raw.competition.name;
    league.sport = 'Football';
    league.country = null;
    league.logo = null;
    dto.league = league;

    return dto;
  }

  normalizeStanding(
    raw: FdoStanding,
    leagueId: string,
    leagueName: string,
    teamResolvedId: string | null,
  ): StandingDto {
    const dto = new StandingDto();
    dto.leagueId = leagueId;
    dto.leagueName = leagueName;
    dto.teamId = teamResolvedId ?? `fdo:${raw.team.id}`;
    dto.teamName = raw.team.name;
    dto.teamBadge = raw.team.crest || null;
    dto.position = raw.position;
    dto.played = raw.playedGames;
    dto.won = raw.won;
    dto.drawn = raw.draw;
    dto.lost = raw.lost;
    dto.goalsFor = raw.goalsFor;
    dto.goalsAgainst = raw.goalsAgainst;
    dto.points = raw.points;
    dto.promotion = null;
    return dto;
  }
}
```

- [ ] **Step 4: Run tests**

```bash
cd apps/api && npx jest football-data-org.normalizer --no-coverage
```

Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/sports-data/normalizer/football-data-org.normalizer.ts \
        apps/api/src/sports-data/__tests__/football-data-org.normalizer.spec.ts
git commit -m "feat(sports-data): add FootballDataOrgNormalizer"
```

---

## Task 6: Register FDO client + normalizer in SportsDataModule

**Files:**
- Modify: `apps/api/src/sports-data/sports-data.module.ts`

- [ ] **Step 1: Update the module**

Add two imports and two providers:

```typescript
// apps/api/src/sports-data/sports-data.module.ts
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { ApiFootballClient } from './client/api-football.client';
import { FootballDataOrgClient } from './client/football-data-org.client';       // ← add
import { ApiFootballNormalizer } from './normalizer/api-football.normalizer';
import { FootballDataOrgNormalizer } from './normalizer/football-data-org.normalizer'; // ← add
import { SportsDataCacheService } from './sports-data-cache.service';

// ... all existing service imports unchanged ...

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule],
  controllers: [/* unchanged */],
  providers: [
    ApiFootballClient,
    FootballDataOrgClient,       // ← add
    ApiFootballNormalizer,
    FootballDataOrgNormalizer,   // ← add
    SportsDataCacheService,
    // ... all existing services unchanged ...
  ],
  exports: [/* unchanged */],
})
export class SportsDataModule {}
```

- [ ] **Step 2: Verify module compiles**

```bash
cd apps/api && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/sports-data/sports-data.module.ts
git commit -m "feat(sports-data): register FootballDataOrgClient and FootballDataOrgNormalizer in module"
```

---

## Task 7: Update StandingsService — FDO routing

**Files:**
- Modify: `apps/api/src/sports-data/services/standings.service.ts`

For current season, fetch standings from FDO via `/v4/competitions/{fdoCode}/standings`. For historical seasons, keep existing RAF path.

- [ ] **Step 1: Rewrite StandingsService**

```typescript
// apps/api/src/sports-data/services/standings.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ApiFootballClient } from '../client/api-football.client';
import { ApiFootballNormalizer } from '../normalizer/api-football.normalizer';
import { FootballDataOrgClient } from '../client/football-data-org.client';
import { FootballDataOrgNormalizer } from '../normalizer/football-data-org.normalizer';
import { SportsDataCacheService, TTL_STANDINGS } from '../sports-data-cache.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RafStandingResponse } from '../interfaces/api-football.interfaces';
import { FdoStandingsResponse } from '../interfaces/football-data-org.interfaces';
import { StandingDto } from '../dto/standing.dto';
import {
  getCurrentSeason,
  HISTORY_SEASON_RAF,
  LEAGUE_MAP,
} from '../constants/season.constants';

const LEAGUE_IDS = ['39', '140', '78', '135', '61'];

@Injectable()
export class StandingsService {
  private readonly logger = new Logger(StandingsService.name);

  constructor(
    private readonly rafClient: ApiFootballClient,
    private readonly rafNormalizer: ApiFootballNormalizer,
    private readonly fdoClient: FootballDataOrgClient,
    private readonly fdoNormalizer: FootballDataOrgNormalizer,
    private readonly cacheService: SportsDataCacheService,
    private readonly prismaService: PrismaService,
  ) {}

  async getStandings(leagueId: string): Promise<StandingDto[]> {
    const cacheKey = SportsDataCacheService.standingsKey(leagueId);
    const cached = await this.cacheService.getCached<StandingDto[]>(cacheKey);
    if (cached) return cached;

    const season = getCurrentSeason();
    const standings =
      season >= 2025
        ? await this.getStandingsFdo(leagueId)
        : await this.getStandingsRaf(leagueId);

    await this.cacheService.setCached(cacheKey, standings, TTL_STANDINGS);
    return standings;
  }

  private async getStandingsRaf(leagueId: string): Promise<StandingDto[]> {
    const raw = await this.rafClient.get<RafStandingResponse>('standings', {
      league: leagueId,
      season: HISTORY_SEASON_RAF,
    });
    if (!raw.length || !raw[0].league?.standings?.length) return [];
    const leagueName = raw[0].league.name;
    return raw[0].league.standings
      .flat()
      .map((entry) =>
        this.rafNormalizer.normalizeStanding(entry, leagueId, leagueName),
      );
  }

  private async getStandingsFdo(leagueId: string): Promise<StandingDto[]> {
    const mapping = LEAGUE_MAP[leagueId];
    if (!mapping) return [];

    const data = await this.fdoClient.get<FdoStandingsResponse>(
      `competitions/${mapping.fdoCode}/standings`,
    );

    const totalTable = data.standings.find((s) => s.type === 'TOTAL');
    if (!totalTable) return [];

    const league = await this.prismaService.league.findFirst({
      where: { externalId: leagueId },
    });
    const leagueResolvedId = league?.id ?? leagueId;

    return Promise.all(
      totalTable.table.map(async (entry) => {
        const team = await this.prismaService.team.findFirst({
          where: { fdoExternalId: String(entry.team.id) },
        });
        return this.fdoNormalizer.normalizeStanding(
          entry,
          leagueResolvedId,
          data.competition.name,
          team?.externalId ?? null,
        );
      }),
    );
  }

  @Cron('0 */12 * * *')
  async refreshStandings(): Promise<void> {
    for (const leagueId of LEAGUE_IDS) {
      try {
        this.logger.log(`Refreshing standings for league ${leagueId}`);
        await this.cacheService.invalidate(
          SportsDataCacheService.standingsKey(leagueId),
        );
        const standings = await this.getStandings(leagueId);
        await this.persistStandings(leagueId, standings);
      } catch (err) {
        this.logger.error(
          `Failed to refresh standings for league ${leagueId}: ${String(err)}`,
        );
      }
    }
  }

  private async persistStandings(
    leagueId: string,
    standings: StandingDto[],
  ): Promise<void> {
    const league = await this.prismaService.league.findUnique({
      where: { externalId: leagueId },
    });
    if (!league) return;

    const season = String(getCurrentSeason());

    for (const s of standings) {
      const team = await this.prismaService.team.findUnique({
        where: { externalId: s.teamId },
      });
      if (!team) continue;

      await this.prismaService.standing.upsert({
        where: { leagueId_teamId_season: { leagueId: league.id, teamId: team.id, season } },
        create: {
          leagueId: league.id,
          teamId: team.id,
          position: s.position,
          played: s.played,
          won: s.won,
          drawn: s.drawn,
          lost: s.lost,
          goalsFor: s.goalsFor,
          goalsAgainst: s.goalsAgainst,
          points: s.points,
          season,
        },
        update: {
          position: s.position,
          played: s.played,
          won: s.won,
          drawn: s.drawn,
          lost: s.lost,
          goalsFor: s.goalsFor,
          goalsAgainst: s.goalsAgainst,
          points: s.points,
        },
      });
    }
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/api && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/sports-data/services/standings.service.ts
git commit -m "feat(sports-data): route StandingsService to FDO for current season"
```

---

## Task 8: Update FixturesService — FDO routing

**Files:**
- Modify: `apps/api/src/sports-data/services/fixtures.service.ts`

Helper used in all FDO match normalization — resolve team DB externalIds from their FDO ids:

```typescript
private async resolveTeamId(fdoTeamId: number): Promise<string | null> {
  const team = await this.prisma.team.findFirst({
    where: { fdoExternalId: String(fdoTeamId) },
  });
  return team?.externalId ?? null;
}

private async resolveLeagueId(fdoCompetitionCode: string): Promise<string | null> {
  const league = await this.prisma.league.findFirst({
    where: { fdoExternalId: fdoCompetitionCode },
  });
  return league?.externalId ?? null;
}

private async normalizeFdoMatch(raw: FdoMatch): Promise<MatchDto> {
  const [homeId, awayId, leagueId] = await Promise.all([
    this.resolveTeamId(raw.homeTeam.id),
    this.resolveTeamId(raw.awayTeam.id),
    this.resolveLeagueId(raw.competition.code),
  ]);
  return this.fdoNormalizer.normalizeMatch(raw, homeId, awayId, leagueId);
}
```

- [ ] **Step 1: Rewrite FixturesService**

```typescript
// apps/api/src/sports-data/services/fixtures.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ApiFootballClient } from '../client/api-football.client';
import { ApiFootballNormalizer } from '../normalizer/api-football.normalizer';
import { FootballDataOrgClient } from '../client/football-data-org.client';
import { FootballDataOrgNormalizer } from '../normalizer/football-data-org.normalizer';
import { SportsDataCacheService, TTL_FIXTURES } from '../sports-data-cache.service';
import { RafFixture } from '../interfaces/api-football.interfaces';
import { FdoMatch, FdoMatchesResponse } from '../interfaces/football-data-org.interfaces';
import { MatchDto } from '../dto/match.dto';
import { PrismaService } from '../../prisma/prisma.service';
import {
  getCurrentSeason,
  HISTORY_SEASON_RAF,
  LEAGUE_MAP,
} from '../constants/season.constants';

const LEAGUE_IDS = ['39', '140', '78', '135', '61'];

@Injectable()
export class FixturesService {
  private readonly logger = new Logger(FixturesService.name);

  constructor(
    private readonly rafClient: ApiFootballClient,
    private readonly rafNormalizer: ApiFootballNormalizer,
    private readonly fdoClient: FootballDataOrgClient,
    private readonly fdoNormalizer: FootballDataOrgNormalizer,
    private readonly cacheService: SportsDataCacheService,
    private readonly prisma: PrismaService,
  ) {}

  // ── ID resolution helpers ──────────────────────────────────────────────────

  private async resolveTeamId(fdoTeamId: number): Promise<string | null> {
    const team = await this.prisma.team.findFirst({
      where: { fdoExternalId: String(fdoTeamId) },
    });
    return team?.externalId ?? null;
  }

  private async resolveLeagueId(fdoCode: string): Promise<string | null> {
    const league = await this.prisma.league.findFirst({
      where: { fdoExternalId: fdoCode },
    });
    return league?.externalId ?? null;
  }

  private async normalizeFdoMatch(raw: FdoMatch): Promise<MatchDto> {
    const [homeId, awayId, leagueId] = await Promise.all([
      this.resolveTeamId(raw.homeTeam.id),
      this.resolveTeamId(raw.awayTeam.id),
      this.resolveLeagueId(raw.competition.code),
    ]);
    return this.fdoNormalizer.normalizeMatch(raw, homeId, awayId, leagueId);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  async getFixtures(leagueId: string, from: string, to: string): Promise<MatchDto[]> {
    const cacheKey = SportsDataCacheService.fixturesKey(leagueId, from, to);
    const cached = await this.cacheService.getCached<MatchDto[]>(cacheKey);
    if (cached) return cached;

    const season = getCurrentSeason();
    let fixtures: MatchDto[];

    if (season >= 2025) {
      const mapping = LEAGUE_MAP[leagueId];
      if (!mapping) return [];
      const data = await this.fdoClient.get<FdoMatchesResponse>(
        `competitions/${mapping.fdoCode}/matches`,
        { dateFrom: from, dateTo: to },
      );
      fixtures = await Promise.all(data.matches.map((m) => this.normalizeFdoMatch(m)));
    } else {
      const raw = await this.rafClient.get<RafFixture>('fixtures', {
        league: leagueId,
        season: HISTORY_SEASON_RAF,
        from,
        to,
      });
      fixtures = raw.map((m) => this.rafNormalizer.normalizeFixture(m));
    }

    await this.cacheService.setCached(cacheKey, fixtures, TTL_FIXTURES);
    return fixtures;
  }

  async getMatchById(matchId: string): Promise<MatchDto | null> {
    const cacheKey = `sports:match:${matchId}`;
    const cached = await this.cacheService.getCached<MatchDto>(cacheKey);
    if (cached) return cached;

    let match: MatchDto | null;

    if (matchId.startsWith('fdo:')) {
      const fdoId = matchId.slice(4);
      const raw = await this.fdoClient.get<FdoMatch>(`matches/${fdoId}`);
      match = await this.normalizeFdoMatch(raw);
    } else {
      const raw = await this.rafClient.get<RafFixture>('fixtures', { id: matchId });
      if (!raw.length) return null;
      match = this.rafNormalizer.normalizeFixture(raw[0]);
      await this.enrichLineupPhotos(match);
    }

    const ttl =
      match.status === 'LIVE' ? 30 : match.status === 'FINISHED' ? 3600 : 300;
    await this.cacheService.setCached(cacheKey, match, ttl);
    return match;
  }

  async getTeamFixtures(teamId: string): Promise<MatchDto[]> {
    const cacheKey = SportsDataCacheService.teamFixturesKey(teamId);
    const cached = await this.cacheService.getCached<MatchDto[]>(cacheKey);
    if (cached) return cached;

    const season = getCurrentSeason();
    let fixtures: MatchDto[];

    if (season >= 2025) {
      const team = await this.prisma.team.findFirst({ where: { externalId: teamId } });
      if (!team?.fdoExternalId) return [];
      const today = new Date().toISOString().slice(0, 10);
      const thirtyDaysAhead = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
      const data = await this.fdoClient.get<FdoMatchesResponse>(
        `teams/${team.fdoExternalId}/matches`,
        { dateFrom: today, dateTo: thirtyDaysAhead, status: 'SCHEDULED' },
      );
      fixtures = (await Promise.all(data.matches.map((m) => this.normalizeFdoMatch(m))))
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    } else {
      const today = new Date().toISOString().slice(0, 10);
      const thirtyDaysAhead = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
      const raw = await this.rafClient.get<RafFixture>('fixtures', {
        team: teamId,
        season: HISTORY_SEASON_RAF,
        from: today,
        to: thirtyDaysAhead,
      });
      fixtures = raw
        .map((m) => this.rafNormalizer.normalizeFixture(m))
        .filter((m) => m.status === 'SCHEDULED')
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    }

    await this.cacheService.setCached(cacheKey, fixtures, TTL_FIXTURES);
    return fixtures;
  }

  async getTeamResults(teamId: string, limit = 10, offset = 0): Promise<MatchDto[]> {
    const cacheKey = SportsDataCacheService.teamResultsKey(teamId);
    const cached = await this.cacheService.getCached<MatchDto[]>(cacheKey);
    if (cached) return cached.slice(offset, offset + limit);

    const season = getCurrentSeason();
    let results: MatchDto[];

    if (season >= 2025) {
      const team = await this.prisma.team.findFirst({ where: { externalId: teamId } });
      if (!team?.fdoExternalId) return [];
      const today = new Date().toISOString().slice(0, 10);
      const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
      const data = await this.fdoClient.get<FdoMatchesResponse>(
        `teams/${team.fdoExternalId}/matches`,
        { dateFrom: ninetyDaysAgo, dateTo: today, status: 'FINISHED' },
      );
      results = (await Promise.all(data.matches.map((m) => this.normalizeFdoMatch(m))))
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    } else {
      const today = new Date().toISOString().slice(0, 10);
      const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
      const raw = await this.rafClient.get<RafFixture>('fixtures', {
        team: teamId,
        season: HISTORY_SEASON_RAF,
        from: ninetyDaysAgo,
        to: today,
      });
      results = raw
        .map((m) => this.rafNormalizer.normalizeFixture(m))
        .filter((m) => m.status === 'FINISHED')
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    }

    await this.cacheService.setCached(cacheKey, results, TTL_FIXTURES);
    return results.slice(offset, offset + limit);
  }

  async getLeagueFixtures(leagueId: string): Promise<MatchDto[]> {
    const cacheKey = SportsDataCacheService.leagueFixturesKey(leagueId);
    const cached = await this.cacheService.getCached<MatchDto[]>(cacheKey);
    if (cached) return cached;

    const season = getCurrentSeason();
    let fixtures: MatchDto[];

    if (season >= 2025) {
      const mapping = LEAGUE_MAP[leagueId];
      if (!mapping) return [];
      const today = new Date().toISOString().slice(0, 10);
      const thirtyDaysAhead = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
      const data = await this.fdoClient.get<FdoMatchesResponse>(
        `competitions/${mapping.fdoCode}/matches`,
        { dateFrom: today, dateTo: thirtyDaysAhead, status: 'SCHEDULED' },
      );
      fixtures = (await Promise.all(data.matches.map((m) => this.normalizeFdoMatch(m))))
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    } else {
      const today = new Date().toISOString().slice(0, 10);
      const thirtyDaysAhead = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
      const raw = await this.rafClient.get<RafFixture>('fixtures', {
        league: leagueId,
        season: HISTORY_SEASON_RAF,
        from: today,
        to: thirtyDaysAhead,
      });
      fixtures = raw
        .map((m) => this.rafNormalizer.normalizeFixture(m))
        .filter((m) => m.status === 'SCHEDULED')
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    }

    await this.cacheService.setCached(cacheKey, fixtures, TTL_FIXTURES);
    return fixtures;
  }

  async getLeagueResults(leagueId: string): Promise<MatchDto[]> {
    const cacheKey = SportsDataCacheService.leagueResultsKey(leagueId);
    const cached = await this.cacheService.getCached<MatchDto[]>(cacheKey);
    if (cached) return cached;

    const season = getCurrentSeason();
    let results: MatchDto[];

    if (season >= 2025) {
      const mapping = LEAGUE_MAP[leagueId];
      if (!mapping) return [];
      const today = new Date().toISOString().slice(0, 10);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const data = await this.fdoClient.get<FdoMatchesResponse>(
        `competitions/${mapping.fdoCode}/matches`,
        { dateFrom: thirtyDaysAgo, dateTo: today, status: 'FINISHED' },
      );
      results = (await Promise.all(data.matches.map((m) => this.normalizeFdoMatch(m))))
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    } else {
      const today = new Date().toISOString().slice(0, 10);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const raw = await this.rafClient.get<RafFixture>('fixtures', {
        league: leagueId,
        season: HISTORY_SEASON_RAF,
        from: thirtyDaysAgo,
        to: today,
      });
      results = raw
        .map((m) => this.rafNormalizer.normalizeFixture(m))
        .filter((m) => m.status === 'FINISHED')
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    }

    await this.cacheService.setCached(cacheKey, results, TTL_FIXTURES);
    return results;
  }

  private async enrichLineupPhotos(match: MatchDto): Promise<void> {
    if (!match.lineups) return;
    const allPlayers = [
      ...match.lineups.home.starting,
      ...match.lineups.home.bench,
      ...match.lineups.away.starting,
      ...match.lineups.away.bench,
    ];
    const ids = allPlayers.map((p) => p.id).filter(Boolean);
    if (ids.length === 0) return;
    const rows = await this.prisma.player.findMany({
      where: { externalId: { in: ids } },
      select: { externalId: true, image: true },
    });
    const photoMap = new Map(rows.map((r) => [r.externalId, r.image]));
    for (const p of allPlayers) {
      p.photo = photoMap.get(p.id) ?? null;
    }
  }

  @Cron('0 */12 * * *')
  async refreshFixtures(): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    for (const leagueId of LEAGUE_IDS) {
      try {
        this.logger.log(`Refreshing fixtures for league ${leagueId}`);
        await this.cacheService.invalidate(
          SportsDataCacheService.fixturesKey(leagueId, today, nextWeek),
        );
        await this.getFixtures(leagueId, today, nextWeek);
      } catch (err) {
        this.logger.error(
          `Failed to refresh fixtures for league ${leagueId}: ${String(err)}`,
        );
      }
    }
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/api && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/sports-data/services/fixtures.service.ts
git commit -m "feat(sports-data): route FixturesService to FDO for current season"
```

---

## Task 9: Update LivescoreService — FDO live matches

**Files:**
- Modify: `apps/api/src/sports-data/services/livescore.service.ts`

LivescoreService is currently a stub. Wire it up to fetch today's live/scheduled FDO matches.

- [ ] **Step 1: Rewrite LivescoreService**

```typescript
// apps/api/src/sports-data/services/livescore.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { FootballDataOrgClient } from '../client/football-data-org.client';
import { FootballDataOrgNormalizer } from '../normalizer/football-data-org.normalizer';
import { SportsDataCacheService, TTL_LIVE } from '../sports-data-cache.service';
import { PrismaService } from '../../prisma/prisma.service';
import { FdoMatch, FdoMatchesResponse } from '../interfaces/football-data-org.interfaces';
import { MatchDto } from '../dto/match.dto';
import { LEAGUE_MAP } from '../constants/season.constants';

const TRACKED_FDO_CODES = Object.values(LEAGUE_MAP).map((v) => v.fdoCode);

@Injectable()
export class LivescoreService {
  private readonly logger = new Logger(LivescoreService.name);

  constructor(
    private readonly fdoClient: FootballDataOrgClient,
    private readonly fdoNormalizer: FootballDataOrgNormalizer,
    private readonly cacheService: SportsDataCacheService,
    private readonly prisma: PrismaService,
  ) {}

  async getCurrent(): Promise<MatchDto[]> {
    const cacheKey = SportsDataCacheService.livescoresKey();
    const cached = await this.cacheService.getCached<MatchDto[]>(cacheKey);
    if (cached) return cached;

    const today = new Date().toISOString().slice(0, 10);
    const allMatches: MatchDto[] = [];

    for (const fdoCode of TRACKED_FDO_CODES) {
      try {
        const data = await this.fdoClient.get<FdoMatchesResponse>(
          `competitions/${fdoCode}/matches`,
          { dateFrom: today, dateTo: today },
        );
        const normalized = await Promise.all(
          data.matches.map((m) => this.normalizeFdoMatch(m)),
        );
        allMatches.push(...normalized);
      } catch (err) {
        this.logger.warn(`Livescore fetch failed for ${fdoCode}: ${String(err)}`);
      }
    }

    const sorted = allMatches.sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
    await this.cacheService.setCached(cacheKey, sorted, TTL_LIVE);
    return sorted;
  }

  private async normalizeFdoMatch(raw: FdoMatch): Promise<MatchDto> {
    const [homeTeam, awayTeam, league] = await Promise.all([
      this.prisma.team.findFirst({ where: { fdoExternalId: String(raw.homeTeam.id) } }),
      this.prisma.team.findFirst({ where: { fdoExternalId: String(raw.awayTeam.id) } }),
      this.prisma.league.findFirst({ where: { fdoExternalId: raw.competition.code } }),
    ]);
    return this.fdoNormalizer.normalizeMatch(
      raw,
      homeTeam?.externalId ?? null,
      awayTeam?.externalId ?? null,
      league?.externalId ?? null,
    );
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/api && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/sports-data/services/livescore.service.ts
git commit -m "feat(sports-data): wire LivescoreService to FDO for today's matches"
```

---

## Task 10: Update TeamsService — fallback lookup by fdoExternalId

**Files:**
- Modify: `apps/api/src/sports-data/services/teams.service.ts`

When FDO match data provides `homeTeam.id = "fdo:64"` (fallback when seeding hasn't run), the team detail controller calls `getTeamByExternalId("fdo:64")` which fails. Fix by also checking `fdoExternalId`.

- [ ] **Step 1: Update getTeamByExternalId**

Replace the existing method:

```typescript
async getTeamByExternalId(teamId: string): Promise<{
  id: string;
  externalId: string;
  name: string;
  logo: string | null;
  shortName: string | null;
  country: string | null;
} | null> {
  const rawFdoId = teamId.startsWith('fdo:') ? teamId.slice(4) : null;
  return this.prismaService.team.findFirst({
    where: rawFdoId
      ? { fdoExternalId: rawFdoId }
      : { OR: [{ externalId: teamId }, { fdoExternalId: teamId }] },
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/api && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/sports-data/services/teams.service.ts
git commit -m "feat(sports-data): TeamsService lookup by fdoExternalId as fallback"
```

---

## Task 11: WarmupService — FDO seeding

**Files:**
- Modify: `apps/api/src/sports-data/services/warmup.service.ts`

At startup, seed `fdoExternalId` on all League and Team records. Only runs for rows where `fdoExternalId IS NULL`.

- [ ] **Step 1: Rewrite WarmupService**

```typescript
// apps/api/src/sports-data/services/warmup.service.ts
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { StandingsService } from './standings.service';
import { FixturesService } from './fixtures.service';
import { FootballDataOrgClient } from '../client/football-data-org.client';
import { PrismaService } from '../../prisma/prisma.service';
import { FdoCompetitionTeamsResponse } from '../interfaces/football-data-org.interfaces';
import { LEAGUE_MAP } from '../constants/season.constants';

const LEAGUE_IDS = ['39', '140', '78', '135', '61'];

@Injectable()
export class WarmupService implements OnApplicationBootstrap {
  private readonly logger = new Logger(WarmupService.name);

  constructor(
    private readonly standings: StandingsService,
    private readonly fixtures: FixturesService,
    private readonly fdoClient: FootballDataOrgClient,
    private readonly prisma: PrismaService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seedFdoIds();
    this.logger.log('Warming up cache for all leagues...');
    for (const leagueId of LEAGUE_IDS) {
      try {
        await this.standings.getStandings(leagueId);
        await this.fixtures.getLeagueFixtures(leagueId);
        await this.fixtures.getLeagueResults(leagueId);
      } catch (err) {
        this.logger.warn(`Warmup failed for league ${leagueId}: ${String(err)}`);
      }
    }
    this.logger.log('Cache warmup complete.');
  }

  async seedFdoIds(): Promise<void> {
    this.logger.log('Seeding FDO external IDs...');

    for (const [rafId, { fdoCode, name }] of Object.entries(LEAGUE_MAP)) {
      try {
        // Seed league fdoExternalId
        await this.prisma.league.updateMany({
          where: { externalId: rafId, fdoExternalId: null },
          data: { fdoExternalId: fdoCode },
        });

        // Seed team fdoExternalIds for this league
        const data = await this.fdoClient.get<FdoCompetitionTeamsResponse>(
          `competitions/${fdoCode}/teams`,
        );

        for (const fdoTeam of data.teams) {
          const updated = await this.prisma.team.updateMany({
            where: {
              name: { contains: fdoTeam.name.replace(' FC', '').replace(' CF', '').trim() },
              fdoExternalId: null,
            },
            data: { fdoExternalId: String(fdoTeam.id) },
          });
          if (updated.count === 0) {
            this.logger.warn(
              `No DB match for FDO team "${fdoTeam.name}" (id=${fdoTeam.id}) in ${name}`,
            );
          }
        }
      } catch (err) {
        this.logger.error(`FDO seeding failed for league ${rafId} (${fdoCode}): ${String(err)}`);
      }
    }

    this.logger.log('FDO ID seeding complete.');
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/api && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/sports-data/services/warmup.service.ts
git commit -m "feat(sports-data): seed fdoExternalId on League and Team at startup"
```

---

## Task 12: Web — update leagues.ts

**Files:**
- Modify: `apps/web/src/lib/leagues.ts`

- [ ] **Step 1: Update leagues.ts**

```typescript
// apps/web/src/lib/leagues.ts

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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no errors (or only pre-existing errors unrelated to this change).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/leagues.ts
git commit -m "feat(web): add fdoCode to leagues and make season label dynamic"
```

---

## Task 13: End-to-end smoke test

- [ ] **Step 1: Start the API in dev mode**

```bash
cd apps/api && npm run start:dev
```

Watch logs for:
- `Seeding FDO external IDs...`
- `FDO ID seeding complete.`
- `Warming up cache for all leagues...`
- `Cache warmup complete.`

Any `No DB match for FDO team` warnings are expected for teams not yet in DB — not blocking.

- [ ] **Step 2: Test standings endpoint**

```bash
curl -s http://localhost:3001/leagues/39/standings | jq '.[0] | {position, teamId, teamName, points}'
```

Expected: returns current season (2025/26) standings data sourced from football-data.org.

- [ ] **Step 3: Test league fixtures**

```bash
curl -s "http://localhost:3001/matches?league=39" | jq '.[0] | {id, status, homeTeam: .homeTeam.name, awayTeam: .awayTeam.name}'
```

Expected: match IDs start with `fdo:` for current season.

- [ ] **Step 4: Test livescore**

```bash
curl -s http://localhost:3001/livescore | jq 'length'
```

Expected: returns an array (may be empty if no matches today).

- [ ] **Step 5: Commit smoke test notes (optional)**

If you noted any seeding mismatches from step 1, create a follow-up task to manually fix those team name mappings.
