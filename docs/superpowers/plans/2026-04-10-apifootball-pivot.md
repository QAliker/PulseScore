# APIFootball.com v3 Pivot — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace TheSportsDB with APIFootball.com v3 as the data source for PulseScore's sports-data module, adding WebSocket livescore, standings, players, odds, and H2H support.

**Architecture:** Low-level `ApiFootballClient` handles HTTP (rate-limited at 180 req/h) and WebSocket (`wss://wss.apifootball.com/livescore`) infra. Six domain services sit on top: Livescore (WebSocket), Fixtures, Standings, Teams, Odds, H2H. Hybrid storage: Prisma for Match/League/Team/Standing/Player/MatchEvent, Redis cache for Odds/H2H/Lineups/Statistics.

**Tech Stack:** NestJS 11, Prisma 7 (PostgreSQL), ioredis, native `fetch`, native `WebSocket` (Node 22), Jest 30

**Spec:** `docs/superpowers/specs/2026-04-10-apifootball-pivot-design.md`

---

## Task 1: Prisma Schema — Add Standing and Player Models

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Modify: `apps/api/src/prisma/prisma.service.ts`

- [ ] **Step 1: Add Standing model to schema.prisma**

Add after the `Team` model:

```prisma
model Standing {
  id           String   @id @default(cuid())
  leagueId     String   @map("league_id")
  league       League   @relation(fields: [leagueId], references: [id])
  teamId       String   @map("team_id")
  team         Team     @relation(fields: [teamId], references: [id])
  position     Int
  played       Int      @default(0)
  won          Int      @default(0)
  drawn        Int      @default(0)
  lost         Int      @default(0)
  goalsFor     Int      @default(0) @map("goals_for")
  goalsAgainst Int      @default(0) @map("goals_against")
  points       Int      @default(0)
  season       String
  updatedAt    DateTime @updatedAt @map("updated_at")

  @@unique([leagueId, teamId, season])
  @@map("standings")
}
```

- [ ] **Step 2: Add Player model to schema.prisma**

Add after `Standing`:

```prisma
model Player {
  id            String   @id @default(cuid())
  externalId    String   @unique @map("external_id")
  name          String
  image         String?
  number        Int?
  position      String?
  age           Int?
  teamId        String?  @map("team_id")
  team          Team?    @relation(fields: [teamId], references: [id])
  goals         Int      @default(0)
  assists       Int      @default(0)
  yellowCards   Int      @default(0) @map("yellow_cards")
  redCards      Int      @default(0) @map("red_cards")
  matchesPlayed Int      @default(0) @map("matches_played")
  rating        String?
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@map("players")
}
```

- [ ] **Step 3: Add relations to League and Team models**

In the `League` model, add after the `matches` field:

```prisma
  standings  Standing[]
```

In the `Team` model, add after `updatedAt`:

```prisma
  standings Standing[]
  players   Player[]
```

- [ ] **Step 4: Update PrismaService with new model accessors**

In `apps/api/src/prisma/prisma.service.ts`, add after the `matchEvent` getter:

```typescript
  get standing() {
    return this._client.standing;
  }

  get player() {
    return this._client.player;
  }
```

- [ ] **Step 5: Generate migration and Prisma client**

Run:
```bash
cd apps/api && npx prisma migrate dev --name add_standing_player_models
```

Expected: Migration created, Prisma client regenerated with `Standing` and `Player` types.

- [ ] **Step 6: Commit**

```bash
git add apps/api/prisma/ apps/api/src/prisma/prisma.service.ts
git commit -m "feat(prisma): add Standing and Player models for APIFootball pivot"
```

---

## Task 2: APIFootball Interfaces and DTOs

**Files:**
- Create: `apps/api/src/sports-data/interfaces/api-football.interfaces.ts`
- Create: `apps/api/src/sports-data/dto/standing.dto.ts`
- Create: `apps/api/src/sports-data/dto/player.dto.ts`
- Create: `apps/api/src/sports-data/dto/odds.dto.ts`
- Create: `apps/api/src/sports-data/dto/h2h.dto.ts`
- Modify: `apps/api/src/sports-data/dto/match.dto.ts`

- [ ] **Step 1: Create api-football.interfaces.ts**

```typescript
/**
 * Raw API response types from APIFootball.com v3.
 * All fields are strings as returned by the API.
 */

export interface AfMatch {
  match_id: string;
  country_id: string;
  country_name: string;
  league_id: string;
  league_name: string;
  match_date: string;
  match_status: string;
  match_time: string;
  match_hometeam_id: string;
  match_hometeam_name: string;
  match_hometeam_score: string;
  match_awayteam_id: string;
  match_awayteam_name: string;
  match_awayteam_score: string;
  match_hometeam_halftime_score: string;
  match_awayteam_halftime_score: string;
  match_hometeam_extra_score: string;
  match_awayteam_extra_score: string;
  match_hometeam_penalty_score: string;
  match_awayteam_penalty_score: string;
  match_hometeam_ft_score: string;
  match_awayteam_ft_score: string;
  match_hometeam_system: string;
  match_awayteam_system: string;
  match_live: string;
  match_round: string;
  match_stadium: string;
  match_referee: string;
  team_home_badge: string;
  team_away_badge: string;
  league_logo: string;
  country_logo: string;
  league_year: string;
  fk_stage_key: string;
  stage_name: string;
  goalscorer: AfGoalscorer[];
  cards: AfCard[];
  substitutions: { home: AfSubstitution[]; away: AfSubstitution[] };
  lineup: { home: AfLineup; away: AfLineup };
  statistics: AfStatistic[];
  statistics_1half: AfStatistic[];
}

export interface AfGoalscorer {
  time: string;
  home_scorer: string;
  home_scorer_id: string;
  home_assist: string;
  home_assist_id: string;
  score: string;
  away_scorer: string;
  away_scorer_id: string;
  away_assist: string;
  away_assist_id: string;
  info: string;
  score_info_time: string;
}

export interface AfCard {
  time: string;
  home_fault: string;
  card: string;
  away_fault: string;
  info: string;
  home_player_id: string;
  away_player_id: string;
  score_info_time: string;
}

export interface AfSubstitution {
  time: string;
  substitution: string;
  substitution_player_id: string;
}

export interface AfLineup {
  starting_lineups: AfLineupPlayer[];
  substitutes: AfLineupPlayer[];
  coach: AfCoach[];
  missing_players: AfLineupPlayer[];
}

export interface AfLineupPlayer {
  lineup_player: string;
  lineup_number: string;
  lineup_position: string;
  player_key: string;
}

export interface AfCoach {
  lineup_player: string;
  lineup_number: string;
  lineup_position: string;
  player_key: string;
}

export interface AfStatistic {
  type: string;
  home: string;
  away: string;
}

export interface AfStanding {
  country_name: string;
  league_id: string;
  league_name: string;
  team_id: string;
  team_name: string;
  overall_promotion: string;
  overall_league_position: string;
  overall_league_payed: string;
  overall_league_W: string;
  overall_league_D: string;
  overall_league_L: string;
  overall_league_GF: string;
  overall_league_GA: string;
  overall_league_PTS: string;
  home_league_position: string;
  away_league_position: string;
  league_round: string;
  team_badge: string;
  fk_stage_key: string;
  stage_name: string;
}

export interface AfTeam {
  team_key: string;
  team_name: string;
  team_country: string;
  team_founded: string;
  team_badge: string;
  venue: {
    venue_name: string;
    venue_address: string;
    venue_city: string;
    venue_capacity: string;
    venue_surface: string;
  };
  players: AfPlayer[];
  coaches: AfCoachInfo[];
}

export interface AfPlayer {
  player_key: string;
  player_id: string;
  player_image: string;
  player_name: string;
  player_number: string;
  player_country: string;
  player_type: string;
  player_age: string;
  player_match_played: string;
  player_goals: string;
  player_yellow_cards: string;
  player_red_cards: string;
  player_injured: string;
  player_substitute_out: string;
  player_substitutes_on_bench: string;
  player_assists: string;
  player_birthdate: string;
  player_is_captain: string;
  player_shots_total: string;
  player_goals_conceded: string;
  player_fouls_committed: string;
  player_tackles: string;
  player_blocks: string;
  player_crosses_total: string;
  player_interceptions: string;
  player_clearances: string;
  player_dispossesed: string;
  player_saves: string;
  player_inside_box_saves: string;
  player_duels_total: string;
  player_duels_won: string;
  player_dribble_attempts: string;
  player_dribble_succ: string;
  player_pen_comm: string;
  player_pen_won: string;
  player_pen_scored: string;
  player_pen_missed: string;
  player_passes: string;
  player_passes_accuracy: string;
  player_key_passes: string;
  player_woordworks: string;
  player_rating: string;
}

export interface AfCoachInfo {
  coach_name: string;
  coach_country: string;
  coach_age: string;
}

export interface AfOdds {
  match_id: string;
  odd_bookmakers: string;
  odd_date: string;
  odd_1: string;
  odd_x: string;
  odd_2: string;
  bts_yes: string;
  bts_no: string;
  [key: string]: string; // Over/under, asian handicap fields
}

export interface AfH2H {
  firstTeam_VS_secondTeam: AfMatch[];
  firstTeam_lastResults: AfMatch[];
  secondTeam_lastResults: AfMatch[];
}

export interface AfLeague {
  country_id: string;
  country_name: string;
  league_id: string;
  league_name: string;
  league_season: string;
  league_logo: string;
  country_logo: string;
}

/** Error response from API when key is invalid or quota exceeded */
export interface AfErrorResponse {
  error: number;
  message: string;
}
```

- [ ] **Step 2: Create standing.dto.ts**

```typescript
export class StandingDto {
  leagueId: string;
  leagueName: string;
  teamId: string;
  teamName: string;
  teamBadge: string | null;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  promotion: string | null;
}
```

- [ ] **Step 3: Create player.dto.ts**

```typescript
export class PlayerDto {
  externalId: string;
  name: string;
  image: string | null;
  number: number | null;
  position: string | null;
  age: number | null;
  teamId: string | null;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  matchesPlayed: number;
  rating: string | null;
}
```

- [ ] **Step 4: Create odds.dto.ts**

```typescript
export class OddsDto {
  matchId: string;
  bookmaker: string;
  updatedAt: string;
  home: string | null;
  draw: string | null;
  away: string | null;
  btsYes: string | null;
  btsNo: string | null;
}
```

- [ ] **Step 5: Create h2h.dto.ts**

```typescript
import { MatchDto } from './match.dto';

export class H2hDto {
  headToHead: MatchDto[];
  firstTeamResults: MatchDto[];
  secondTeamResults: MatchDto[];
}
```

- [ ] **Step 6: Update match.dto.ts — add goalscorer/card/substitution nested types**

Replace the contents of `apps/api/src/sports-data/dto/match.dto.ts` with:

```typescript
import { TeamDto } from './team.dto';
import { LeagueDto } from './league.dto';

export class MatchDto {
  id: string;
  externalId: string;
  homeTeam: TeamDto;
  awayTeam: TeamDto;
  homeScore: number | null;
  awayScore: number | null;
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'CANCELLED' | 'POSTPONED';
  sport: string;
  league: LeagueDto | null;
  startTime: Date;
  progress: string | null;
  venue: string | null;
  round: number | null;
  goalscorers: GoalscorerDto[];
  cards: CardDto[];
}

export class GoalscorerDto {
  time: string;
  homeScorer: string | null;
  awayScorer: string | null;
  score: string;
  info: string | null;
}

export class CardDto {
  time: string;
  homeFault: string | null;
  awayFault: string | null;
  card: string;
  info: string | null;
}
```

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/sports-data/interfaces/ apps/api/src/sports-data/dto/
git commit -m "feat(sports-data): add APIFootball interfaces and new DTOs"
```

---

## Task 3: ApiFootballClient — HTTP Layer

**Files:**
- Create: `apps/api/src/sports-data/client/api-football.client.ts`
- Create: `apps/api/src/sports-data/__tests__/api-football.client.spec.ts`

- [ ] **Step 1: Write failing test for HTTP get method**

Create `apps/api/src/sports-data/__tests__/api-football.client.spec.ts`:

```typescript
import { ApiFootballClient } from '../client/api-football.client';
import { ConfigService } from '@nestjs/config';

describe('ApiFootballClient', () => {
  let client: ApiFootballClient;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'APIFOOTBALL_API_KEY') return 'test-api-key';
        if (key === 'APIFOOTBALL_TIMEZONE') return 'Europe/Paris';
        return undefined;
      }),
    };
    client = new ApiFootballClient(mockConfigService as ConfigService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('get', () => {
    it('should call fetch with correct URL and API key', async () => {
      const mockResponse = [{ match_id: '1' }];
      jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await client.get('get_events', { from: '2026-04-10', to: '2026-04-10' });

      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      const calledUrl = (globalThis.fetch as jest.Mock).mock.calls[0][0];
      expect(calledUrl).toContain('https://apiv3.apifootball.com/?action=get_events');
      expect(calledUrl).toContain('APIkey=test-api-key');
      expect(calledUrl).toContain('from=2026-04-10');
      expect(calledUrl).toContain('to=2026-04-10');
      expect(result).toEqual(mockResponse);
    });

    it('should throw on non-ok response', async () => {
      jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      } as Response);

      await expect(client.get('get_events', {})).rejects.toThrow('APIFootball request failed: 403 Forbidden');
    });

    it('should throw on API error response', async () => {
      jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: 404, message: 'No events found' }),
      } as Response);

      const result = await client.get('get_events', {});
      // API returns error object as data — caller handles this
      expect(result).toEqual({ error: 404, message: 'No events found' });
    });

    it('should include timezone parameter', async () => {
      jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response);

      await client.get('get_standings', { league_id: '152' });

      const calledUrl = (globalThis.fetch as jest.Mock).mock.calls[0][0];
      expect(calledUrl).toContain('timezone=Europe%2FParis');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && npx jest --testPathPattern="__tests__/api-football.client" --no-coverage`
Expected: FAIL — cannot find `../client/api-football.client`

- [ ] **Step 3: Implement ApiFootballClient**

Create `apps/api/src/sports-data/client/api-football.client.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiFootballClient {
  private readonly logger = new Logger(ApiFootballClient.name);
  private readonly baseUrl = 'https://apiv3.apifootball.com/';
  private readonly apiKey: string;
  private readonly timezone: string;
  private lastRequestAt = 0;
  private readonly minIntervalMs = 20_000; // 180 req/h ≈ 1 req per 20s

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('APIFOOTBALL_API_KEY') ?? '';
    this.timezone = this.configService.get<string>('APIFOOTBALL_TIMEZONE') ?? 'Europe/Paris';
  }

  private async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestAt;
    if (elapsed < this.minIntervalMs) {
      const wait = this.minIntervalMs - elapsed;
      await new Promise<void>((resolve) => setTimeout(resolve, wait));
    }
    this.lastRequestAt = Date.now();
  }

  async get<T = unknown>(action: string, params: Record<string, string>): Promise<T> {
    await this.throttle();

    const query = new URLSearchParams({
      action,
      APIkey: this.apiKey,
      timezone: this.timezone,
      ...params,
    });

    const url = `${this.baseUrl}?${query.toString()}`;
    this.logger.debug(`GET ${url}`);

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`APIFootball request failed: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && npx jest --testPathPattern="__tests__/api-football.client" --no-coverage`
Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/sports-data/client/ apps/api/src/sports-data/__tests__/api-football.client.spec.ts
git commit -m "feat(sports-data): add ApiFootballClient HTTP layer with throttling"
```

---

## Task 4: ApiFootballClient — WebSocket Layer

**Files:**
- Modify: `apps/api/src/sports-data/client/api-football.client.ts`
- Create: `apps/api/src/sports-data/__tests__/api-football.client.ws.spec.ts`

- [ ] **Step 1: Write failing test for WebSocket connection**

Create `apps/api/src/sports-data/__tests__/api-football.client.ws.spec.ts`:

```typescript
import { ApiFootballClient } from '../client/api-football.client';
import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'events';

// Mock WebSocket
class MockWebSocket extends EventEmitter {
  static OPEN = 1;
  readyState = MockWebSocket.OPEN;
  close = jest.fn();
  ping = jest.fn();

  constructor(public url: string) {
    super();
  }

  // Simulate receiving a message
  simulateMessage(data: string) {
    this.emit('message', { data });
  }

  simulateError(error: Error) {
    this.emit('error', error);
  }

  simulateClose() {
    this.readyState = 3; // CLOSED
    this.emit('close');
  }
}

jest.mock('ws', () => ({
  __esModule: true,
  default: MockWebSocket,
  WebSocket: MockWebSocket,
}));

describe('ApiFootballClient — WebSocket', () => {
  let client: ApiFootballClient;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(() => {
    jest.useFakeTimers();
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'APIFOOTBALL_API_KEY') return 'test-api-key';
        if (key === 'APIFOOTBALL_TIMEZONE') return 'Europe/Paris';
        return undefined;
      }),
    };
    client = new ApiFootballClient(mockConfigService as ConfigService);
  });

  afterEach(() => {
    client.disconnectWebSocket();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should emit livescore events when WebSocket receives data', (done) => {
    const mockData = JSON.stringify([
      { match_id: '1', match_status: '45', match_hometeam_score: '1', match_awayteam_score: '0' },
    ]);

    client.onLivescoreMessage((data) => {
      expect(data).toHaveLength(1);
      expect(data[0].match_id).toBe('1');
      done();
    });

    client.connectWebSocket();

    // Get the created WebSocket instance and simulate a message
    const ws = (client as any).ws as MockWebSocket;
    ws.emit('open');
    ws.simulateMessage(mockData);
  });

  it('should reconnect with exponential backoff on close', () => {
    client.connectWebSocket();
    const ws = (client as any).ws as MockWebSocket;
    ws.emit('open');

    // Simulate unexpected close
    ws.simulateClose();

    // Should schedule reconnect after 1s (first backoff)
    expect((client as any).reconnectAttempts).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && npx jest --testPathPattern="api-football.client.ws" --no-coverage`
Expected: FAIL — `connectWebSocket` is not a function

- [ ] **Step 3: Install ws package and add WebSocket to client**

Run:
```bash
cd /home/quentin/pulseScore && npm install -w apps/api ws && npm install -w apps/api -D @types/ws
```

Then add WebSocket methods to `apps/api/src/sports-data/client/api-football.client.ts`:

Replace the entire file with:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import WebSocket from 'ws';
import { AfMatch } from '../interfaces/api-football.interfaces';

@Injectable()
export class ApiFootballClient {
  private readonly logger = new Logger(ApiFootballClient.name);
  private readonly baseUrl = 'https://apiv3.apifootball.com/';
  private readonly wsUrl = 'wss://wss.apifootball.com/livescore';
  private readonly apiKey: string;
  private readonly timezone: string;
  private lastRequestAt = 0;
  private readonly minIntervalMs = 20_000; // 180 req/h ≈ 1 req per 20s

  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectDelay = 60_000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private livescoreCallback: ((data: AfMatch[]) => void) | null = null;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('APIFOOTBALL_API_KEY') ?? '';
    this.timezone = this.configService.get<string>('APIFOOTBALL_TIMEZONE') ?? 'Europe/Paris';
  }

  // ── HTTP ────────────────────────────────────────────────────────────────────

  private async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestAt;
    if (elapsed < this.minIntervalMs) {
      const wait = this.minIntervalMs - elapsed;
      await new Promise<void>((resolve) => setTimeout(resolve, wait));
    }
    this.lastRequestAt = Date.now();
  }

  async get<T = unknown>(action: string, params: Record<string, string>): Promise<T> {
    await this.throttle();

    const query = new URLSearchParams({
      action,
      APIkey: this.apiKey,
      timezone: this.timezone,
      ...params,
    });

    const url = `${this.baseUrl}?${query.toString()}`;
    this.logger.debug(`GET ${url}`);

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`APIFootball request failed: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  // ── WebSocket ───────────────────────────────────────────────────────────────

  onLivescoreMessage(callback: (data: AfMatch[]) => void): void {
    this.livescoreCallback = callback;
  }

  connectWebSocket(): void {
    const url = `${this.wsUrl}?APIkey=${this.apiKey}&timezone=${this.timezone}`;
    this.logger.log(`Connecting WebSocket to ${this.wsUrl}`);

    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      this.logger.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.startHeartbeat();
    });

    this.ws.on('message', (raw: WebSocket.Data) => {
      try {
        const data = JSON.parse(raw.toString()) as AfMatch[];
        this.livescoreCallback?.(data);
      } catch (err) {
        this.logger.warn(`Failed to parse WebSocket message: ${String(err)}`);
      }
    });

    this.ws.on('error', (err: Error) => {
      this.logger.error(`WebSocket error: ${err.message}`);
    });

    this.ws.on('close', () => {
      this.logger.warn('WebSocket closed');
      this.stopHeartbeat();
      this.scheduleReconnect();
    });
  }

  disconnectWebSocket(): void {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
    this.reconnectAttempts = 0;
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay,
    );
    this.logger.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.connectWebSocket();
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30_000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && npx jest --testPathPattern="api-football.client.ws" --no-coverage`
Expected: 2 tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/sports-data/client/ apps/api/src/sports-data/__tests__/api-football.client.ws.spec.ts apps/api/package.json
git commit -m "feat(sports-data): add WebSocket livescore to ApiFootballClient"
```

---

## Task 5: APIFootball Normalizer

**Files:**
- Create: `apps/api/src/sports-data/normalizer/api-football.normalizer.ts`
- Create: `apps/api/src/sports-data/__tests__/api-football.normalizer.spec.ts`

- [ ] **Step 1: Write failing tests for normalizer**

Create `apps/api/src/sports-data/__tests__/api-football.normalizer.spec.ts`:

```typescript
import { ApiFootballNormalizer } from '../normalizer/api-football.normalizer';
import { AfMatch, AfStanding, AfPlayer } from '../interfaces/api-football.interfaces';

describe('ApiFootballNormalizer', () => {
  let normalizer: ApiFootballNormalizer;

  beforeEach(() => {
    normalizer = new ApiFootballNormalizer();
  });

  // ── normalizeStatus ────────────────────────────────────────────────────────

  describe('normalizeStatus', () => {
    it('should return LIVE for a minute string like "45"', () => {
      expect(normalizer.normalizeStatus('45')).toBe('LIVE');
    });

    it('should return LIVE for "Half Time"', () => {
      expect(normalizer.normalizeStatus('Half Time')).toBe('LIVE');
    });

    it('should return FINISHED for "Finished"', () => {
      expect(normalizer.normalizeStatus('Finished')).toBe('FINISHED');
    });

    it('should return FINISHED for "After ET"', () => {
      expect(normalizer.normalizeStatus('After ET')).toBe('FINISHED');
    });

    it('should return FINISHED for "After Pen."', () => {
      expect(normalizer.normalizeStatus('After Pen.')).toBe('FINISHED');
    });

    it('should return POSTPONED for "Postponed"', () => {
      expect(normalizer.normalizeStatus('Postponed')).toBe('POSTPONED');
    });

    it('should return CANCELLED for "Cancelled"', () => {
      expect(normalizer.normalizeStatus('Cancelled')).toBe('CANCELLED');
    });

    it('should return CANCELLED for "Awarded"', () => {
      expect(normalizer.normalizeStatus('Awarded')).toBe('CANCELLED');
    });

    it('should return SCHEDULED for empty string', () => {
      expect(normalizer.normalizeStatus('')).toBe('SCHEDULED');
    });

    it('should return SCHEDULED for unknown status', () => {
      expect(normalizer.normalizeStatus('???')).toBe('SCHEDULED');
    });
  });

  // ── normalizeMatch ─────────────────────────────────────────────────────────

  describe('normalizeMatch', () => {
    const mockMatch: AfMatch = {
      match_id: '292061',
      country_id: '44',
      country_name: 'England',
      league_id: '152',
      league_name: 'Championship',
      match_date: '2026-04-10',
      match_status: 'Finished',
      match_time: '20:45',
      match_hometeam_id: '2627',
      match_hometeam_name: 'Leeds United',
      match_hometeam_score: '2',
      match_awayteam_id: '2637',
      match_awayteam_name: 'Sheffield Wednesday',
      match_awayteam_score: '1',
      match_hometeam_halftime_score: '1',
      match_awayteam_halftime_score: '0',
      match_hometeam_extra_score: '',
      match_awayteam_extra_score: '',
      match_hometeam_penalty_score: '',
      match_awayteam_penalty_score: '',
      match_hometeam_ft_score: '2',
      match_awayteam_ft_score: '1',
      match_hometeam_system: '4-3-3',
      match_awayteam_system: '4-4-2',
      match_live: '0',
      match_round: 'Round 38',
      match_stadium: 'Elland Road',
      match_referee: 'M. Oliver',
      team_home_badge: 'https://apiv3.apifootball.com/badges/2627.png',
      team_away_badge: 'https://apiv3.apifootball.com/badges/2637.png',
      league_logo: 'https://apiv3.apifootball.com/badges/logo_leagues/152.png',
      country_logo: 'https://apiv3.apifootball.com/badges/logo_country/44.png',
      league_year: '2025/2026',
      fk_stage_key: '1',
      stage_name: 'Current',
      goalscorer: [
        {
          time: '23',
          home_scorer: 'P. Bamford',
          home_scorer_id: '1234',
          home_assist: 'R. James',
          home_assist_id: '1235',
          score: '1 - 0',
          away_scorer: '',
          away_scorer_id: '',
          away_assist: '',
          away_assist_id: '',
          info: '',
          score_info_time: '1H',
        },
      ],
      cards: [
        {
          time: '55',
          home_fault: 'K. Phillips',
          card: 'yellow card',
          away_fault: '',
          info: '',
          home_player_id: '1236',
          away_player_id: '',
          score_info_time: '2H',
        },
      ],
      substitutions: { home: [], away: [] },
      lineup: { home: { starting_lineups: [], substitutes: [], coach: [], missing_players: [] }, away: { starting_lineups: [], substitutes: [], coach: [], missing_players: [] } },
      statistics: [],
      statistics_1half: [],
    };

    it('should map externalId from match_id', () => {
      const dto = normalizer.normalizeMatch(mockMatch);
      expect(dto.externalId).toBe('292061');
    });

    it('should set home team name and badge', () => {
      const dto = normalizer.normalizeMatch(mockMatch);
      expect(dto.homeTeam.name).toBe('Leeds United');
      expect(dto.homeTeam.logo).toBe('https://apiv3.apifootball.com/badges/2627.png');
    });

    it('should set away team name and badge', () => {
      const dto = normalizer.normalizeMatch(mockMatch);
      expect(dto.awayTeam.name).toBe('Sheffield Wednesday');
      expect(dto.awayTeam.logo).toBe('https://apiv3.apifootball.com/badges/2637.png');
    });

    it('should parse scores as numbers', () => {
      const dto = normalizer.normalizeMatch(mockMatch);
      expect(dto.homeScore).toBe(2);
      expect(dto.awayScore).toBe(1);
    });

    it('should return null score for empty string', () => {
      const noScore = { ...mockMatch, match_hometeam_score: '', match_awayteam_score: '' };
      const dto = normalizer.normalizeMatch(noScore);
      expect(dto.homeScore).toBeNull();
      expect(dto.awayScore).toBeNull();
    });

    it('should set status to FINISHED', () => {
      const dto = normalizer.normalizeMatch(mockMatch);
      expect(dto.status).toBe('FINISHED');
    });

    it('should parse startTime from match_date and match_time', () => {
      const dto = normalizer.normalizeMatch(mockMatch);
      expect(dto.startTime).toEqual(new Date('2026-04-10T20:45:00Z'));
    });

    it('should set venue from match_stadium', () => {
      const dto = normalizer.normalizeMatch(mockMatch);
      expect(dto.venue).toBe('Elland Road');
    });

    it('should extract round number from "Round 38"', () => {
      const dto = normalizer.normalizeMatch(mockMatch);
      expect(dto.round).toBe(38);
    });

    it('should set league info', () => {
      const dto = normalizer.normalizeMatch(mockMatch);
      expect(dto.league?.externalId).toBe('152');
      expect(dto.league?.name).toBe('Championship');
      expect(dto.league?.country).toBe('England');
    });

    it('should normalize goalscorers', () => {
      const dto = normalizer.normalizeMatch(mockMatch);
      expect(dto.goalscorers).toHaveLength(1);
      expect(dto.goalscorers[0].time).toBe('23');
      expect(dto.goalscorers[0].homeScorer).toBe('P. Bamford');
    });

    it('should normalize cards', () => {
      const dto = normalizer.normalizeMatch(mockMatch);
      expect(dto.cards).toHaveLength(1);
      expect(dto.cards[0].card).toBe('yellow card');
      expect(dto.cards[0].homeFault).toBe('K. Phillips');
    });

    it('should set sport to Football', () => {
      const dto = normalizer.normalizeMatch(mockMatch);
      expect(dto.sport).toBe('Football');
    });
  });

  // ── normalizeStanding ──────────────────────────────────────────────────────

  describe('normalizeStanding', () => {
    const mockStanding: AfStanding = {
      country_name: 'England',
      league_id: '152',
      league_name: 'Championship',
      team_id: '2627',
      team_name: 'Leeds United',
      overall_promotion: 'Promotion - Premier League',
      overall_league_position: '1',
      overall_league_payed: '38',
      overall_league_W: '25',
      overall_league_D: '8',
      overall_league_L: '5',
      overall_league_GF: '70',
      overall_league_GA: '30',
      overall_league_PTS: '83',
      home_league_position: '1',
      away_league_position: '2',
      league_round: '',
      team_badge: 'https://apiv3.apifootball.com/badges/2627.png',
      fk_stage_key: '1',
      stage_name: 'Current',
    };

    it('should map position from overall_league_position', () => {
      const dto = normalizer.normalizeStanding(mockStanding);
      expect(dto.position).toBe(1);
    });

    it('should parse all stats as numbers', () => {
      const dto = normalizer.normalizeStanding(mockStanding);
      expect(dto.played).toBe(38);
      expect(dto.won).toBe(25);
      expect(dto.drawn).toBe(8);
      expect(dto.lost).toBe(5);
      expect(dto.goalsFor).toBe(70);
      expect(dto.goalsAgainst).toBe(30);
      expect(dto.points).toBe(83);
    });

    it('should set team badge', () => {
      const dto = normalizer.normalizeStanding(mockStanding);
      expect(dto.teamBadge).toBe('https://apiv3.apifootball.com/badges/2627.png');
    });

    it('should set promotion info', () => {
      const dto = normalizer.normalizeStanding(mockStanding);
      expect(dto.promotion).toBe('Promotion - Premier League');
    });
  });

  // ── normalizePlayer ────────────────────────────────────────────────────────

  describe('normalizePlayer', () => {
    const mockPlayer: AfPlayer = {
      player_key: '777',
      player_id: '777',
      player_image: 'https://apiv3.apifootball.com/players/777.png',
      player_name: 'P. Bamford',
      player_number: '9',
      player_country: 'England',
      player_type: 'Forwards',
      player_age: '32',
      player_match_played: '35',
      player_goals: '15',
      player_yellow_cards: '3',
      player_red_cards: '0',
      player_injured: '',
      player_substitute_out: '5',
      player_substitutes_on_bench: '3',
      player_assists: '7',
      player_birthdate: '1993-09-05',
      player_is_captain: '',
      player_shots_total: '80',
      player_goals_conceded: '0',
      player_fouls_committed: '20',
      player_tackles: '5',
      player_blocks: '2',
      player_crosses_total: '10',
      player_interceptions: '3',
      player_clearances: '1',
      player_dispossesed: '15',
      player_saves: '0',
      player_inside_box_saves: '0',
      player_duels_total: '120',
      player_duels_won: '60',
      player_dribble_attempts: '40',
      player_dribble_succ: '25',
      player_pen_comm: '0',
      player_pen_won: '2',
      player_pen_scored: '2',
      player_pen_missed: '0',
      player_passes: '500',
      player_passes_accuracy: '78',
      player_key_passes: '30',
      player_woordworks: '3',
      player_rating: '7.2',
    };

    it('should map externalId from player_key', () => {
      const dto = normalizer.normalizePlayer(mockPlayer, '2627');
      expect(dto.externalId).toBe('777');
    });

    it('should parse numeric fields', () => {
      const dto = normalizer.normalizePlayer(mockPlayer, '2627');
      expect(dto.goals).toBe(15);
      expect(dto.assists).toBe(7);
      expect(dto.yellowCards).toBe(3);
      expect(dto.redCards).toBe(0);
      expect(dto.matchesPlayed).toBe(35);
    });

    it('should set position from player_type', () => {
      const dto = normalizer.normalizePlayer(mockPlayer, '2627');
      expect(dto.position).toBe('Forwards');
    });

    it('should set rating', () => {
      const dto = normalizer.normalizePlayer(mockPlayer, '2627');
      expect(dto.rating).toBe('7.2');
    });

    it('should set teamId', () => {
      const dto = normalizer.normalizePlayer(mockPlayer, '2627');
      expect(dto.teamId).toBe('2627');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && npx jest --testPathPattern="api-football.normalizer" --no-coverage`
Expected: FAIL — cannot find `../normalizer/api-football.normalizer`

- [ ] **Step 3: Implement normalizer**

Create `apps/api/src/sports-data/normalizer/api-football.normalizer.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { AfMatch, AfStanding, AfPlayer } from '../interfaces/api-football.interfaces';
import { MatchDto, GoalscorerDto, CardDto } from '../dto/match.dto';
import { TeamDto } from '../dto/team.dto';
import { LeagueDto } from '../dto/league.dto';
import { StandingDto } from '../dto/standing.dto';
import { PlayerDto } from '../dto/player.dto';

@Injectable()
export class ApiFootballNormalizer {
  normalizeStatus(status: string): MatchDto['status'] {
    if (!status || status.trim() === '') return 'SCHEDULED';

    switch (status) {
      case 'Finished':
      case 'After ET':
      case 'After Pen.':
        return 'FINISHED';
      case 'Half Time':
        return 'LIVE';
      case 'Postponed':
        return 'POSTPONED';
      case 'Cancelled':
      case 'Awarded':
        return 'CANCELLED';
      default:
        // If it's a number (match minute), it's live
        if (/^\d+/.test(status)) return 'LIVE';
        return 'SCHEDULED';
    }
  }

  parseScore(score: string): number | null {
    if (!score || score.trim() === '') return null;
    const parsed = parseInt(score, 10);
    return isNaN(parsed) ? null : parsed;
  }

  parseRound(round: string): number | null {
    if (!round) return null;
    const match = round.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  normalizeMatch(raw: AfMatch): MatchDto {
    const dto = new MatchDto();

    dto.id = raw.match_id;
    dto.externalId = raw.match_id;

    const homeTeam = new TeamDto();
    homeTeam.id = raw.match_hometeam_id;
    homeTeam.externalId = raw.match_hometeam_id;
    homeTeam.name = raw.match_hometeam_name;
    homeTeam.logo = raw.team_home_badge || null;
    dto.homeTeam = homeTeam;

    const awayTeam = new TeamDto();
    awayTeam.id = raw.match_awayteam_id;
    awayTeam.externalId = raw.match_awayteam_id;
    awayTeam.name = raw.match_awayteam_name;
    awayTeam.logo = raw.team_away_badge || null;
    dto.awayTeam = awayTeam;

    dto.homeScore = this.parseScore(raw.match_hometeam_score);
    dto.awayScore = this.parseScore(raw.match_awayteam_score);
    dto.status = this.normalizeStatus(raw.match_status);
    dto.sport = 'Football';
    dto.progress = raw.match_status || null;
    dto.venue = raw.match_stadium || null;
    dto.round = this.parseRound(raw.match_round);

    // League
    if (raw.league_id) {
      const league = new LeagueDto();
      league.id = raw.league_id;
      league.externalId = raw.league_id;
      league.name = raw.league_name || '';
      league.sport = 'Football';
      league.country = raw.country_name || null;
      league.logo = raw.league_logo || null;
      dto.league = league;
    } else {
      dto.league = null;
    }

    // Start time
    const timeStr = raw.match_time || '00:00';
    dto.startTime = new Date(`${raw.match_date}T${timeStr}:00Z`);
    if (isNaN(dto.startTime.getTime())) {
      dto.startTime = new Date(0);
    }

    // Goalscorers
    dto.goalscorers = (raw.goalscorer ?? []).map((g) => {
      const gs = new GoalscorerDto();
      gs.time = g.time;
      gs.homeScorer = g.home_scorer || null;
      gs.awayScorer = g.away_scorer || null;
      gs.score = g.score;
      gs.info = g.info || null;
      return gs;
    });

    // Cards
    dto.cards = (raw.cards ?? []).map((c) => {
      const card = new CardDto();
      card.time = c.time;
      card.homeFault = c.home_fault || null;
      card.awayFault = c.away_fault || null;
      card.card = c.card;
      card.info = c.info || null;
      return card;
    });

    return dto;
  }

  normalizeStanding(raw: AfStanding): StandingDto {
    const dto = new StandingDto();
    dto.leagueId = raw.league_id;
    dto.leagueName = raw.league_name;
    dto.teamId = raw.team_id;
    dto.teamName = raw.team_name;
    dto.teamBadge = raw.team_badge || null;
    dto.position = parseInt(raw.overall_league_position, 10) || 0;
    dto.played = parseInt(raw.overall_league_payed, 10) || 0;
    dto.won = parseInt(raw.overall_league_W, 10) || 0;
    dto.drawn = parseInt(raw.overall_league_D, 10) || 0;
    dto.lost = parseInt(raw.overall_league_L, 10) || 0;
    dto.goalsFor = parseInt(raw.overall_league_GF, 10) || 0;
    dto.goalsAgainst = parseInt(raw.overall_league_GA, 10) || 0;
    dto.points = parseInt(raw.overall_league_PTS, 10) || 0;
    dto.promotion = raw.overall_promotion || null;
    return dto;
  }

  normalizePlayer(raw: AfPlayer, teamId: string): PlayerDto {
    const dto = new PlayerDto();
    dto.externalId = raw.player_key;
    dto.name = raw.player_name;
    dto.image = raw.player_image || null;
    dto.number = raw.player_number ? parseInt(raw.player_number, 10) || null : null;
    dto.position = raw.player_type || null;
    dto.age = raw.player_age ? parseInt(raw.player_age, 10) || null : null;
    dto.teamId = teamId;
    dto.goals = parseInt(raw.player_goals, 10) || 0;
    dto.assists = parseInt(raw.player_assists, 10) || 0;
    dto.yellowCards = parseInt(raw.player_yellow_cards, 10) || 0;
    dto.redCards = parseInt(raw.player_red_cards, 10) || 0;
    dto.matchesPlayed = parseInt(raw.player_match_played, 10) || 0;
    dto.rating = raw.player_rating || null;
    return dto;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && npx jest --testPathPattern="api-football.normalizer" --no-coverage`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/sports-data/normalizer/ apps/api/src/sports-data/__tests__/api-football.normalizer.spec.ts
git commit -m "feat(sports-data): add APIFootball normalizer with match/standing/player mapping"
```

---

## Task 6: Update Cache Service

**Files:**
- Modify: `apps/api/src/sports-data/sports-data-cache.service.ts`

- [ ] **Step 1: Update cache service with new TTLs and keys**

Replace the contents of `apps/api/src/sports-data/sports-data-cache.service.ts` with:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

export const TTL_LIVE = 30;             // 30 seconds (WebSocket updates frequently)
export const TTL_ODDS = 5 * 60;         // 5 minutes
export const TTL_H2H = 60 * 60;         // 1 hour
export const TTL_LINEUPS = 3 * 60 * 60; // 3 hours (match duration)
export const TTL_STATISTICS = 3 * 60 * 60;
export const TTL_STANDINGS = 6 * 60 * 60; // 6 hours
export const TTL_FIXTURES = 6 * 60 * 60;
export const TTL_TEAMS = 24 * 60 * 60;  // 24 hours

@Injectable()
export class SportsDataCacheService {
  private readonly logger = new Logger(SportsDataCacheService.name);

  constructor(private readonly redisService: RedisService) {}

  async getCached<T>(key: string): Promise<T | null> {
    const client = this.redisService.getClient();
    const raw = await client.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.warn(`Failed to parse cached value for key "${key}": ${String(err)}`);
      return null;
    }
  }

  async setCached<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
    const client = this.redisService.getClient();
    await client.set(key, JSON.stringify(data), 'EX', ttlSeconds);
  }

  async invalidate(key: string): Promise<void> {
    const client = this.redisService.getClient();
    await client.del(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const client = this.redisService.getClient();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
      this.logger.log(`Invalidated ${keys.length} key(s) matching pattern "${pattern}"`);
    }
  }

  // ── Key generators ──────────────────────────────────────────────────────────

  static livescoresKey(): string {
    return 'sports:live';
  }

  static fixturesKey(leagueId: string, from: string, to: string): string {
    return `sports:fixtures:${leagueId}:${from}:${to}`;
  }

  static standingsKey(leagueId: string): string {
    return `sports:standings:${leagueId}`;
  }

  static teamsKey(leagueId: string): string {
    return `sports:teams:${leagueId}`;
  }

  static oddsKey(matchId: string): string {
    return `sports:odds:${matchId}`;
  }

  static h2hKey(teamId1: string, teamId2: string): string {
    // Sort IDs so key is consistent regardless of order
    const sorted = [teamId1, teamId2].sort();
    return `sports:h2h:${sorted[0]}:${sorted[1]}`;
  }

  static lineupsKey(matchId: string): string {
    return `sports:lineups:${matchId}`;
  }

  static statisticsKey(matchId: string): string {
    return `sports:statistics:${matchId}`;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/sports-data/sports-data-cache.service.ts
git commit -m "feat(sports-data): update cache service with new TTLs and key patterns for APIFootball"
```

---

## Task 7: Livescore Service (WebSocket)

**Files:**
- Create: `apps/api/src/sports-data/services/livescore.service.ts`
- Create: `apps/api/src/sports-data/__tests__/livescore.service.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/api/src/sports-data/__tests__/livescore.service.spec.ts`:

```typescript
import { LivescoreService, ScoreChangeEvent } from '../services/livescore.service';
import { MatchDto, GoalscorerDto, CardDto } from '../dto/match.dto';
import { TeamDto } from '../dto/team.dto';

function makeMatchDto(overrides: Partial<MatchDto> & { externalId: string }): MatchDto {
  const dto = new MatchDto();
  const home = new TeamDto();
  home.id = 'home1';
  home.externalId = 'home1';
  home.name = overrides.homeTeam?.name ?? 'Home FC';
  home.logo = null;

  const away = new TeamDto();
  away.id = 'away1';
  away.externalId = 'away1';
  away.name = overrides.awayTeam?.name ?? 'Away FC';
  away.logo = null;

  dto.id = overrides.externalId;
  dto.externalId = overrides.externalId;
  dto.homeTeam = home;
  dto.awayTeam = away;
  dto.homeScore = overrides.homeScore ?? 0;
  dto.awayScore = overrides.awayScore ?? 0;
  dto.status = overrides.status ?? 'LIVE';
  dto.sport = 'Football';
  dto.league = null;
  dto.startTime = new Date('2026-04-10T20:45:00Z');
  dto.progress = null;
  dto.venue = null;
  dto.round = null;
  dto.goalscorers = [];
  dto.cards = [];

  return dto;
}

describe('LivescoreService — detectChanges', () => {
  let service: LivescoreService;

  beforeEach(() => {
    service = new LivescoreService(
      null as never,
      null as never,
      null as never,
      null as never,
    );
  });

  it('should return no changes when previous is empty', () => {
    const current = [makeMatchDto({ externalId: 'evt1', homeScore: 1, awayScore: 0 })];
    const changes = service.detectChanges(current, []);
    expect(changes).toHaveLength(0);
  });

  it('should return no changes when scores are unchanged', () => {
    const current = [makeMatchDto({ externalId: 'evt1', homeScore: 2, awayScore: 1 })];
    const previous = [makeMatchDto({ externalId: 'evt1', homeScore: 2, awayScore: 1 })];
    const changes = service.detectChanges(current, previous);
    expect(changes).toHaveLength(0);
  });

  it('should detect a home score change', () => {
    const current = [makeMatchDto({ externalId: 'evt1', homeScore: 2, awayScore: 1 })];
    const previous = [makeMatchDto({ externalId: 'evt1', homeScore: 1, awayScore: 1 })];
    const changes = service.detectChanges(current, previous);
    expect(changes).toHaveLength(1);
    expect(changes[0].newScore).toEqual({ home: 2, away: 1 });
  });

  it('should detect an away score change', () => {
    const current = [makeMatchDto({ externalId: 'evt1', homeScore: 0, awayScore: 1 })];
    const previous = [makeMatchDto({ externalId: 'evt1', homeScore: 0, awayScore: 0 })];
    const changes = service.detectChanges(current, previous);
    expect(changes).toHaveLength(1);
  });

  it('should detect status change to FINISHED', () => {
    const current = [makeMatchDto({ externalId: 'evt1', homeScore: 2, awayScore: 1, status: 'FINISHED' })];
    const previous = [makeMatchDto({ externalId: 'evt1', homeScore: 2, awayScore: 1, status: 'LIVE' })];
    const changes = service.detectChanges(current, previous);
    expect(changes).toHaveLength(1);
    expect(changes[0].statusChanged).toBe(true);
  });

  it('should not report new matches as changes', () => {
    const current = [
      makeMatchDto({ externalId: 'evt1', homeScore: 1, awayScore: 0 }),
      makeMatchDto({ externalId: 'evt2', homeScore: 0, awayScore: 0 }),
    ];
    const previous = [makeMatchDto({ externalId: 'evt1', homeScore: 1, awayScore: 0 })];
    const changes = service.detectChanges(current, previous);
    expect(changes).toHaveLength(0);
  });

  it('should detect multiple changes', () => {
    const current = [
      makeMatchDto({ externalId: 'evt1', homeScore: 2, awayScore: 0 }),
      makeMatchDto({ externalId: 'evt2', homeScore: 1, awayScore: 3 }),
    ];
    const previous = [
      makeMatchDto({ externalId: 'evt1', homeScore: 1, awayScore: 0 }),
      makeMatchDto({ externalId: 'evt2', homeScore: 1, awayScore: 2 }),
    ];
    const changes = service.detectChanges(current, previous);
    expect(changes).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && npx jest --testPathPattern="__tests__/livescore.service" --no-coverage`
Expected: FAIL — cannot find `../services/livescore.service`

- [ ] **Step 3: Implement LivescoreService**

Create `apps/api/src/sports-data/services/livescore.service.ts`:

```typescript
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ApiFootballClient } from '../client/api-football.client';
import { ApiFootballNormalizer } from '../normalizer/api-football.normalizer';
import { SportsDataCacheService, TTL_LIVE } from '../sports-data-cache.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MatchDto } from '../dto/match.dto';
import { AfMatch } from '../interfaces/api-football.interfaces';

export interface ScoreChangeEvent {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  previousScore: { home: number | null; away: number | null };
  newScore: { home: number | null; away: number | null };
  statusChanged: boolean;
  changedAt: Date;
}

@Injectable()
export class LivescoreService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LivescoreService.name);
  private previousMatches: MatchDto[] = [];

  constructor(
    private readonly client: ApiFootballClient,
    private readonly normalizer: ApiFootballNormalizer,
    private readonly cacheService: SportsDataCacheService,
    private readonly prismaService: PrismaService,
  ) {}

  onModuleInit(): void {
    this.logger.log('LivescoreService initialized — connecting WebSocket');
    this.client.onLivescoreMessage((data) => this.handleLivescoreData(data));
    this.client.connectWebSocket();
  }

  onModuleDestroy(): void {
    this.client.disconnectWebSocket();
  }

  private async handleLivescoreData(rawMatches: AfMatch[]): Promise<void> {
    try {
      const freshMatches = rawMatches.map((m) => this.normalizer.normalizeMatch(m));

      // Cache for other services to read
      await this.cacheService.setCached(
        SportsDataCacheService.livescoresKey(),
        freshMatches,
        TTL_LIVE,
      );

      // Detect changes
      const changes = this.detectChanges(freshMatches, this.previousMatches);

      if (changes.length > 0) {
        this.logger.log(`Detected ${changes.length} change(s)`);
        for (const change of changes) {
          this.logger.log(
            `${change.homeTeam} vs ${change.awayTeam}: ` +
            `${change.previousScore.home ?? '?'}-${change.previousScore.away ?? '?'} → ` +
            `${change.newScore.home ?? '?'}-${change.newScore.away ?? '?'}` +
            (change.statusChanged ? ` [status changed]` : ''),
          );
        }

        // Upsert changed matches to DB
        const changedMatches = freshMatches.filter((m) =>
          changes.some((c) => c.matchId === m.externalId),
        );
        await this.upsertMatches(changedMatches);

        // Upsert match events (goals, cards)
        for (const match of changedMatches) {
          await this.upsertMatchEvents(match);
        }

        // TODO Feature 3: emit WebSocket events to frontend
      }

      this.previousMatches = freshMatches;
    } catch (err) {
      this.logger.error('Error handling livescore data', String(err));
    }
  }

  detectChanges(current: MatchDto[], previous: MatchDto[]): ScoreChangeEvent[] {
    const previousMap = new Map(previous.map((m) => [m.externalId, m]));
    const changes: ScoreChangeEvent[] = [];

    for (const match of current) {
      const prev = previousMap.get(match.externalId);
      if (!prev) continue;

      const scoreChanged = match.homeScore !== prev.homeScore || match.awayScore !== prev.awayScore;
      const statusChanged = match.status !== prev.status;

      if (scoreChanged || statusChanged) {
        changes.push({
          matchId: match.externalId,
          homeTeam: match.homeTeam.name,
          awayTeam: match.awayTeam.name,
          previousScore: { home: prev.homeScore, away: prev.awayScore },
          newScore: { home: match.homeScore, away: match.awayScore },
          statusChanged,
          changedAt: new Date(),
        });
      }
    }

    return changes;
  }

  private async upsertMatches(matches: MatchDto[]): Promise<void> {
    for (const match of matches) {
      try {
        await this.prismaService.match.upsert({
          where: { externalId: match.externalId },
          create: {
            externalId: match.externalId,
            homeTeam: match.homeTeam.name,
            awayTeam: match.awayTeam.name,
            homeScore: match.homeScore ?? 0,
            awayScore: match.awayScore ?? 0,
            status: match.status,
            sport: match.sport,
            league: match.league?.name ?? null,
            startTime: match.startTime,
          },
          update: {
            homeScore: match.homeScore ?? 0,
            awayScore: match.awayScore ?? 0,
            status: match.status,
          },
        });
      } catch (err) {
        this.logger.error(`Failed to upsert match ${match.externalId}: ${String(err)}`);
      }
    }
  }

  private async upsertMatchEvents(match: MatchDto): Promise<void> {
    try {
      // Delete existing events and re-insert (simpler than diffing)
      await this.prismaService.matchEvent.deleteMany({
        where: {
          match: { externalId: match.externalId },
        },
      });

      const dbMatch = await this.prismaService.match.findUnique({
        where: { externalId: match.externalId },
      });
      if (!dbMatch) return;

      const events = [];

      for (const g of match.goalscorers) {
        const isHome = !!g.homeScorer;
        events.push({
          matchId: dbMatch.id,
          type: g.info?.toLowerCase().includes('own goal') ? 'OWN_GOAL' as const
            : g.info?.toLowerCase().includes('penalty') ? 'PENALTY_GOAL' as const
            : 'GOAL' as const,
          minute: parseInt(g.time, 10) || null,
          player: isHome ? g.homeScorer : g.awayScorer,
          team: isHome ? match.homeTeam.name : match.awayTeam.name,
          detail: g.score,
        });
      }

      for (const c of match.cards) {
        const isHome = !!c.homeFault;
        events.push({
          matchId: dbMatch.id,
          type: c.card.toLowerCase().includes('red') ? 'RED_CARD' as const : 'YELLOW_CARD' as const,
          minute: parseInt(c.time, 10) || null,
          player: isHome ? c.homeFault : c.awayFault,
          team: isHome ? match.homeTeam.name : match.awayTeam.name,
          detail: c.card,
        });
      }

      if (events.length > 0) {
        await this.prismaService.matchEvent.createMany({ data: events });
      }
    } catch (err) {
      this.logger.error(`Failed to upsert events for match ${match.externalId}: ${String(err)}`);
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && npx jest --testPathPattern="__tests__/livescore.service" --no-coverage`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/sports-data/services/livescore.service.ts apps/api/src/sports-data/__tests__/livescore.service.spec.ts
git commit -m "feat(sports-data): add LivescoreService with WebSocket + change detection"
```

---

## Task 8: Fixtures Service

**Files:**
- Create: `apps/api/src/sports-data/services/fixtures.service.ts`
- Create: `apps/api/src/sports-data/__tests__/fixtures.service.spec.ts`

- [ ] **Step 1: Write failing test**

Create `apps/api/src/sports-data/__tests__/fixtures.service.spec.ts`:

```typescript
import { FixturesService } from '../services/fixtures.service';

describe('FixturesService', () => {
  let service: FixturesService;
  let mockClient: any;
  let mockNormalizer: any;
  let mockCache: any;

  beforeEach(() => {
    mockClient = {
      get: jest.fn(),
    };
    mockNormalizer = {
      normalizeMatch: jest.fn((m: any) => ({
        externalId: m.match_id,
        homeTeam: { name: m.match_hometeam_name },
        awayTeam: { name: m.match_awayteam_name },
        homeScore: parseInt(m.match_hometeam_score) || null,
        awayScore: parseInt(m.match_awayteam_score) || null,
        status: 'FINISHED',
        sport: 'Football',
      })),
    };
    mockCache = {
      getCached: jest.fn().mockResolvedValue(null),
      setCached: jest.fn().mockResolvedValue(undefined),
    };

    service = new FixturesService(mockClient, mockNormalizer, mockCache);
  });

  it('should fetch events from API when cache is empty', async () => {
    const mockResponse = [
      { match_id: '1', match_hometeam_name: 'Leeds', match_awayteam_name: 'Sheffield', match_hometeam_score: '2', match_awayteam_score: '1' },
    ];
    mockClient.get.mockResolvedValue(mockResponse);

    const result = await service.getFixtures('152', '2026-04-10', '2026-04-10');

    expect(mockClient.get).toHaveBeenCalledWith('get_events', {
      league_id: '152',
      from: '2026-04-10',
      to: '2026-04-10',
    });
    expect(result).toHaveLength(1);
    expect(result[0].externalId).toBe('1');
  });

  it('should return cached data when available', async () => {
    const cached = [{ externalId: '1', homeTeam: { name: 'Leeds' } }];
    mockCache.getCached.mockResolvedValue(cached);

    const result = await service.getFixtures('152', '2026-04-10', '2026-04-10');

    expect(mockClient.get).not.toHaveBeenCalled();
    expect(result).toEqual(cached);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && npx jest --testPathPattern="__tests__/fixtures.service" --no-coverage`
Expected: FAIL — cannot find `../services/fixtures.service`

- [ ] **Step 3: Implement FixturesService**

Create `apps/api/src/sports-data/services/fixtures.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ApiFootballClient } from '../client/api-football.client';
import { ApiFootballNormalizer } from '../normalizer/api-football.normalizer';
import { SportsDataCacheService, TTL_FIXTURES } from '../sports-data-cache.service';
import { AfMatch } from '../interfaces/api-football.interfaces';
import { MatchDto } from '../dto/match.dto';

// Free tier league IDs
const LEAGUE_IDS = ['152', '168']; // Championship, Ligue 2

@Injectable()
export class FixturesService {
  private readonly logger = new Logger(FixturesService.name);

  constructor(
    private readonly client: ApiFootballClient,
    private readonly normalizer: ApiFootballNormalizer,
    private readonly cacheService: SportsDataCacheService,
  ) {}

  async getFixtures(leagueId: string, from: string, to: string): Promise<MatchDto[]> {
    const cacheKey = SportsDataCacheService.fixturesKey(leagueId, from, to);
    const cached = await this.cacheService.getCached<MatchDto[]>(cacheKey);
    if (cached) return cached;

    const raw = await this.client.get<AfMatch[]>('get_events', {
      league_id: leagueId,
      from,
      to,
    });

    if (!Array.isArray(raw)) return [];

    const fixtures = raw.map((m) => this.normalizer.normalizeMatch(m));
    await this.cacheService.setCached(cacheKey, fixtures, TTL_FIXTURES);
    return fixtures;
  }

  @Cron('0 */6 * * *') // Every 6 hours
  async refreshFixtures(): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    for (const leagueId of LEAGUE_IDS) {
      try {
        this.logger.log(`Refreshing fixtures for league ${leagueId}`);
        await this.cacheService.invalidate(
          SportsDataCacheService.fixturesKey(leagueId, today, nextWeek),
        );
        await this.getFixtures(leagueId, today, nextWeek);
      } catch (err) {
        this.logger.error(`Failed to refresh fixtures for league ${leagueId}: ${String(err)}`);
      }
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && npx jest --testPathPattern="__tests__/fixtures.service" --no-coverage`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/sports-data/services/fixtures.service.ts apps/api/src/sports-data/__tests__/fixtures.service.spec.ts
git commit -m "feat(sports-data): add FixturesService with cache and CRON refresh"
```

---

## Task 9: Standings Service

**Files:**
- Create: `apps/api/src/sports-data/services/standings.service.ts`
- Create: `apps/api/src/sports-data/__tests__/standings.service.spec.ts`

- [ ] **Step 1: Write failing test**

Create `apps/api/src/sports-data/__tests__/standings.service.spec.ts`:

```typescript
import { StandingsService } from '../services/standings.service';

describe('StandingsService', () => {
  let service: StandingsService;
  let mockClient: any;
  let mockNormalizer: any;
  let mockCache: any;
  let mockPrisma: any;

  beforeEach(() => {
    mockClient = { get: jest.fn() };
    mockNormalizer = {
      normalizeStanding: jest.fn((s: any) => ({
        leagueId: s.league_id,
        teamId: s.team_id,
        teamName: s.team_name,
        position: parseInt(s.overall_league_position),
        points: parseInt(s.overall_league_PTS),
      })),
    };
    mockCache = {
      getCached: jest.fn().mockResolvedValue(null),
      setCached: jest.fn().mockResolvedValue(undefined),
    };
    mockPrisma = {
      league: { findUnique: jest.fn().mockResolvedValue({ id: 'db-league-1' }) },
      team: { findUnique: jest.fn().mockResolvedValue({ id: 'db-team-1' }) },
      standing: { upsert: jest.fn().mockResolvedValue({}) },
    };

    service = new StandingsService(mockClient, mockNormalizer, mockCache, mockPrisma);
  });

  it('should fetch standings from API when cache is empty', async () => {
    const mockResponse = [
      { league_id: '152', team_id: '2627', team_name: 'Leeds', overall_league_position: '1', overall_league_PTS: '83' },
    ];
    mockClient.get.mockResolvedValue(mockResponse);

    const result = await service.getStandings('152');

    expect(mockClient.get).toHaveBeenCalledWith('get_standings', { league_id: '152' });
    expect(result).toHaveLength(1);
    expect(result[0].position).toBe(1);
  });

  it('should return cached standings when available', async () => {
    const cached = [{ position: 1, teamName: 'Leeds' }];
    mockCache.getCached.mockResolvedValue(cached);

    const result = await service.getStandings('152');

    expect(mockClient.get).not.toHaveBeenCalled();
    expect(result).toEqual(cached);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && npx jest --testPathPattern="__tests__/standings.service" --no-coverage`
Expected: FAIL

- [ ] **Step 3: Implement StandingsService**

Create `apps/api/src/sports-data/services/standings.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ApiFootballClient } from '../client/api-football.client';
import { ApiFootballNormalizer } from '../normalizer/api-football.normalizer';
import { SportsDataCacheService, TTL_STANDINGS } from '../sports-data-cache.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AfStanding } from '../interfaces/api-football.interfaces';
import { StandingDto } from '../dto/standing.dto';

const LEAGUE_IDS = ['152', '168']; // Championship, Ligue 2

@Injectable()
export class StandingsService {
  private readonly logger = new Logger(StandingsService.name);

  constructor(
    private readonly client: ApiFootballClient,
    private readonly normalizer: ApiFootballNormalizer,
    private readonly cacheService: SportsDataCacheService,
    private readonly prismaService: PrismaService,
  ) {}

  async getStandings(leagueId: string): Promise<StandingDto[]> {
    const cacheKey = SportsDataCacheService.standingsKey(leagueId);
    const cached = await this.cacheService.getCached<StandingDto[]>(cacheKey);
    if (cached) return cached;

    const raw = await this.client.get<AfStanding[]>('get_standings', { league_id: leagueId });

    if (!Array.isArray(raw)) return [];

    const standings = raw.map((s) => this.normalizer.normalizeStanding(s));
    await this.cacheService.setCached(cacheKey, standings, TTL_STANDINGS);
    return standings;
  }

  @Cron('0 */6 * * *') // Every 6 hours
  async refreshStandings(): Promise<void> {
    for (const leagueId of LEAGUE_IDS) {
      try {
        this.logger.log(`Refreshing standings for league ${leagueId}`);
        await this.cacheService.invalidate(SportsDataCacheService.standingsKey(leagueId));
        const standings = await this.getStandings(leagueId);
        await this.persistStandings(leagueId, standings);
      } catch (err) {
        this.logger.error(`Failed to refresh standings for league ${leagueId}: ${String(err)}`);
      }
    }
  }

  private async persistStandings(leagueId: string, standings: StandingDto[]): Promise<void> {
    const league = await this.prismaService.league.findUnique({
      where: { externalId: leagueId },
    });
    if (!league) return;

    const season = new Date().getFullYear().toString();

    for (const s of standings) {
      const team = await this.prismaService.team.findUnique({
        where: { externalId: s.teamId },
      });
      if (!team) continue;

      await this.prismaService.standing.upsert({
        where: {
          leagueId_teamId_season: {
            leagueId: league.id,
            teamId: team.id,
            season,
          },
        },
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

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && npx jest --testPathPattern="__tests__/standings.service" --no-coverage`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/sports-data/services/standings.service.ts apps/api/src/sports-data/__tests__/standings.service.spec.ts
git commit -m "feat(sports-data): add StandingsService with cache, CRON, and DB persistence"
```

---

## Task 10: Teams Service

**Files:**
- Create: `apps/api/src/sports-data/services/teams.service.ts`
- Create: `apps/api/src/sports-data/__tests__/teams.service.spec.ts`

- [ ] **Step 1: Write failing test**

Create `apps/api/src/sports-data/__tests__/teams.service.spec.ts`:

```typescript
import { TeamsService } from '../services/teams.service';

describe('TeamsService', () => {
  let service: TeamsService;
  let mockClient: any;
  let mockNormalizer: any;
  let mockCache: any;
  let mockPrisma: any;

  beforeEach(() => {
    mockClient = { get: jest.fn() };
    mockNormalizer = {
      normalizePlayer: jest.fn((p: any, teamId: string) => ({
        externalId: p.player_key,
        name: p.player_name,
        teamId,
        goals: parseInt(p.player_goals) || 0,
      })),
    };
    mockCache = {
      getCached: jest.fn().mockResolvedValue(null),
      setCached: jest.fn().mockResolvedValue(undefined),
    };
    mockPrisma = {
      team: { upsert: jest.fn().mockResolvedValue({ id: 'db-team-1' }) },
      player: { upsert: jest.fn().mockResolvedValue({}) },
    };

    service = new TeamsService(mockClient, mockNormalizer, mockCache, mockPrisma);
  });

  it('should fetch teams from API when cache is empty', async () => {
    const mockResponse = [
      {
        team_key: '2627',
        team_name: 'Leeds United',
        team_country: 'England',
        team_founded: '1919',
        team_badge: 'https://example.com/leeds.png',
        venue: { venue_name: 'Elland Road', venue_address: '', venue_city: 'Leeds', venue_capacity: '37890', venue_surface: 'grass' },
        players: [{ player_key: '777', player_name: 'P. Bamford', player_goals: '15' }],
        coaches: [],
      },
    ];
    mockClient.get.mockResolvedValue(mockResponse);

    const result = await service.getTeams('152');

    expect(mockClient.get).toHaveBeenCalledWith('get_teams', { league_id: '152' });
    expect(result).toHaveLength(1);
    expect(result[0].team_name).toBe('Leeds United');
  });

  it('should return cached teams', async () => {
    const cached = [{ team_key: '2627', team_name: 'Leeds' }];
    mockCache.getCached.mockResolvedValue(cached);

    const result = await service.getTeams('152');

    expect(mockClient.get).not.toHaveBeenCalled();
    expect(result).toEqual(cached);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && npx jest --testPathPattern="__tests__/teams.service" --no-coverage`
Expected: FAIL

- [ ] **Step 3: Implement TeamsService**

Create `apps/api/src/sports-data/services/teams.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ApiFootballClient } from '../client/api-football.client';
import { ApiFootballNormalizer } from '../normalizer/api-football.normalizer';
import { SportsDataCacheService, TTL_TEAMS } from '../sports-data-cache.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AfTeam } from '../interfaces/api-football.interfaces';

const LEAGUE_IDS = ['152', '168']; // Championship, Ligue 2

@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);

  constructor(
    private readonly client: ApiFootballClient,
    private readonly normalizer: ApiFootballNormalizer,
    private readonly cacheService: SportsDataCacheService,
    private readonly prismaService: PrismaService,
  ) {}

  async getTeams(leagueId: string): Promise<AfTeam[]> {
    const cacheKey = SportsDataCacheService.teamsKey(leagueId);
    const cached = await this.cacheService.getCached<AfTeam[]>(cacheKey);
    if (cached) return cached;

    const raw = await this.client.get<AfTeam[]>('get_teams', { league_id: leagueId });

    if (!Array.isArray(raw)) return [];

    await this.cacheService.setCached(cacheKey, raw, TTL_TEAMS);
    return raw;
  }

  @Cron('0 3 * * *') // Once per day at 3 AM
  async refreshTeamsAndPlayers(): Promise<void> {
    for (const leagueId of LEAGUE_IDS) {
      try {
        this.logger.log(`Refreshing teams for league ${leagueId}`);
        await this.cacheService.invalidate(SportsDataCacheService.teamsKey(leagueId));
        const teams = await this.getTeams(leagueId);
        await this.persistTeams(teams);
      } catch (err) {
        this.logger.error(`Failed to refresh teams for league ${leagueId}: ${String(err)}`);
      }
    }
  }

  private async persistTeams(teams: AfTeam[]): Promise<void> {
    for (const raw of teams) {
      try {
        const team = await this.prismaService.team.upsert({
          where: { externalId: raw.team_key },
          create: {
            externalId: raw.team_key,
            name: raw.team_name,
            logo: raw.team_badge || null,
            country: raw.team_country || null,
          },
          update: {
            name: raw.team_name,
            logo: raw.team_badge || null,
            country: raw.team_country || null,
          },
        });

        // Persist players
        for (const p of raw.players ?? []) {
          const playerDto = this.normalizer.normalizePlayer(p, raw.team_key);
          await this.prismaService.player.upsert({
            where: { externalId: playerDto.externalId },
            create: {
              externalId: playerDto.externalId,
              name: playerDto.name,
              image: playerDto.image,
              number: playerDto.number,
              position: playerDto.position,
              age: playerDto.age,
              teamId: team.id,
              goals: playerDto.goals,
              assists: playerDto.assists,
              yellowCards: playerDto.yellowCards,
              redCards: playerDto.redCards,
              matchesPlayed: playerDto.matchesPlayed,
              rating: playerDto.rating,
            },
            update: {
              name: playerDto.name,
              image: playerDto.image,
              number: playerDto.number,
              position: playerDto.position,
              age: playerDto.age,
              teamId: team.id,
              goals: playerDto.goals,
              assists: playerDto.assists,
              yellowCards: playerDto.yellowCards,
              redCards: playerDto.redCards,
              matchesPlayed: playerDto.matchesPlayed,
              rating: playerDto.rating,
            },
          });
        }
      } catch (err) {
        this.logger.error(`Failed to persist team ${raw.team_key}: ${String(err)}`);
      }
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && npx jest --testPathPattern="__tests__/teams.service" --no-coverage`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/sports-data/services/teams.service.ts apps/api/src/sports-data/__tests__/teams.service.spec.ts
git commit -m "feat(sports-data): add TeamsService with player sync and daily CRON"
```

---

## Task 11: Odds Service (Cache Only)

**Files:**
- Create: `apps/api/src/sports-data/services/odds.service.ts`
- Create: `apps/api/src/sports-data/__tests__/odds.service.spec.ts`

- [ ] **Step 1: Write failing test**

Create `apps/api/src/sports-data/__tests__/odds.service.spec.ts`:

```typescript
import { OddsService } from '../services/odds.service';

describe('OddsService', () => {
  let service: OddsService;
  let mockClient: any;
  let mockCache: any;

  beforeEach(() => {
    mockClient = { get: jest.fn() };
    mockCache = {
      getCached: jest.fn().mockResolvedValue(null),
      setCached: jest.fn().mockResolvedValue(undefined),
    };

    service = new OddsService(mockClient, mockCache);
  });

  it('should fetch odds from API when cache is empty', async () => {
    const mockResponse = [
      { match_id: '123', odd_bookmakers: 'Bet365', odd_1: '1.5', odd_x: '3.2', odd_2: '5.0', bts_yes: '1.8', bts_no: '2.0', odd_date: '2026-04-10' },
    ];
    mockClient.get.mockResolvedValue(mockResponse);

    const result = await service.getOdds('123');

    expect(mockClient.get).toHaveBeenCalledWith('get_odds', { match_id: '123' });
    expect(result).toHaveLength(1);
    expect(result[0].bookmaker).toBe('Bet365');
    expect(result[0].home).toBe('1.5');
  });

  it('should return cached odds', async () => {
    const cached = [{ matchId: '123', bookmaker: 'Bet365' }];
    mockCache.getCached.mockResolvedValue(cached);

    const result = await service.getOdds('123');

    expect(mockClient.get).not.toHaveBeenCalled();
    expect(result).toEqual(cached);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && npx jest --testPathPattern="__tests__/odds.service" --no-coverage`
Expected: FAIL

- [ ] **Step 3: Implement OddsService**

Create `apps/api/src/sports-data/services/odds.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ApiFootballClient } from '../client/api-football.client';
import { SportsDataCacheService, TTL_ODDS } from '../sports-data-cache.service';
import { AfOdds } from '../interfaces/api-football.interfaces';
import { OddsDto } from '../dto/odds.dto';

@Injectable()
export class OddsService {
  private readonly logger = new Logger(OddsService.name);

  constructor(
    private readonly client: ApiFootballClient,
    private readonly cacheService: SportsDataCacheService,
  ) {}

  async getOdds(matchId: string): Promise<OddsDto[]> {
    const cacheKey = SportsDataCacheService.oddsKey(matchId);
    const cached = await this.cacheService.getCached<OddsDto[]>(cacheKey);
    if (cached) return cached;

    const raw = await this.client.get<AfOdds[]>('get_odds', { match_id: matchId });

    if (!Array.isArray(raw)) return [];

    const odds = raw.map((o) => {
      const dto = new OddsDto();
      dto.matchId = o.match_id;
      dto.bookmaker = o.odd_bookmakers;
      dto.updatedAt = o.odd_date;
      dto.home = o.odd_1 || null;
      dto.draw = o.odd_x || null;
      dto.away = o.odd_2 || null;
      dto.btsYes = o.bts_yes || null;
      dto.btsNo = o.bts_no || null;
      return dto;
    });

    await this.cacheService.setCached(cacheKey, odds, TTL_ODDS);
    return odds;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && npx jest --testPathPattern="__tests__/odds.service" --no-coverage`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/sports-data/services/odds.service.ts apps/api/src/sports-data/__tests__/odds.service.spec.ts
git commit -m "feat(sports-data): add OddsService with Redis cache"
```

---

## Task 12: H2H Service (Cache Only)

**Files:**
- Create: `apps/api/src/sports-data/services/h2h.service.ts`
- Create: `apps/api/src/sports-data/__tests__/h2h.service.spec.ts`

- [ ] **Step 1: Write failing test**

Create `apps/api/src/sports-data/__tests__/h2h.service.spec.ts`:

```typescript
import { H2hService } from '../services/h2h.service';

describe('H2hService', () => {
  let service: H2hService;
  let mockClient: any;
  let mockNormalizer: any;
  let mockCache: any;

  beforeEach(() => {
    mockClient = { get: jest.fn() };
    mockNormalizer = {
      normalizeMatch: jest.fn((m: any) => ({ externalId: m.match_id })),
    };
    mockCache = {
      getCached: jest.fn().mockResolvedValue(null),
      setCached: jest.fn().mockResolvedValue(undefined),
    };

    service = new H2hService(mockClient, mockNormalizer, mockCache);
  });

  it('should fetch H2H from API when cache is empty', async () => {
    const mockResponse = {
      firstTeam_VS_secondTeam: [{ match_id: '1' }],
      firstTeam_lastResults: [{ match_id: '2' }],
      secondTeam_lastResults: [{ match_id: '3' }],
    };
    mockClient.get.mockResolvedValue(mockResponse);

    const result = await service.getH2H('2627', '2637');

    expect(mockClient.get).toHaveBeenCalledWith('get_H2H', {
      firstTeamId: '2627',
      secondTeamId: '2637',
    });
    expect(result.headToHead).toHaveLength(1);
    expect(result.firstTeamResults).toHaveLength(1);
    expect(result.secondTeamResults).toHaveLength(1);
  });

  it('should return cached H2H', async () => {
    const cached = { headToHead: [], firstTeamResults: [], secondTeamResults: [] };
    mockCache.getCached.mockResolvedValue(cached);

    const result = await service.getH2H('2627', '2637');

    expect(mockClient.get).not.toHaveBeenCalled();
    expect(result).toEqual(cached);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && npx jest --testPathPattern="__tests__/h2h.service" --no-coverage`
Expected: FAIL

- [ ] **Step 3: Implement H2hService**

Create `apps/api/src/sports-data/services/h2h.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ApiFootballClient } from '../client/api-football.client';
import { ApiFootballNormalizer } from '../normalizer/api-football.normalizer';
import { SportsDataCacheService, TTL_H2H } from '../sports-data-cache.service';
import { AfH2H } from '../interfaces/api-football.interfaces';
import { H2hDto } from '../dto/h2h.dto';

@Injectable()
export class H2hService {
  private readonly logger = new Logger(H2hService.name);

  constructor(
    private readonly client: ApiFootballClient,
    private readonly normalizer: ApiFootballNormalizer,
    private readonly cacheService: SportsDataCacheService,
  ) {}

  async getH2H(teamId1: string, teamId2: string): Promise<H2hDto> {
    const cacheKey = SportsDataCacheService.h2hKey(teamId1, teamId2);
    const cached = await this.cacheService.getCached<H2hDto>(cacheKey);
    if (cached) return cached;

    const raw = await this.client.get<AfH2H>('get_H2H', {
      firstTeamId: teamId1,
      secondTeamId: teamId2,
    });

    const dto = new H2hDto();
    dto.headToHead = (raw.firstTeam_VS_secondTeam ?? []).map((m) => this.normalizer.normalizeMatch(m));
    dto.firstTeamResults = (raw.firstTeam_lastResults ?? []).map((m) => this.normalizer.normalizeMatch(m));
    dto.secondTeamResults = (raw.secondTeam_lastResults ?? []).map((m) => this.normalizer.normalizeMatch(m));

    await this.cacheService.setCached(cacheKey, dto, TTL_H2H);
    return dto;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && npx jest --testPathPattern="__tests__/h2h.service" --no-coverage`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/sports-data/services/h2h.service.ts apps/api/src/sports-data/__tests__/h2h.service.spec.ts
git commit -m "feat(sports-data): add H2hService with Redis cache"
```

---

## Task 13: Rewire Module and Delete Old Files

**Files:**
- Modify: `apps/api/src/sports-data/sports-data.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/.env.example` → root `.env.example`
- Delete: `apps/api/src/sports-data/sports-data.service.ts`
- Delete: `apps/api/src/sports-data/sports-data-poller.service.ts`
- Delete: `apps/api/src/sports-data/sports-data-normalizer.service.ts`
- Delete: `apps/api/src/sports-data/interfaces/thesportsdb.interfaces.ts`
- Delete: `apps/api/src/sports-data/sports-data-normalizer.service.spec.ts`
- Delete: `apps/api/src/sports-data/sports-data-poller.service.spec.ts`

- [ ] **Step 1: Rewrite sports-data.module.ts**

Replace contents of `apps/api/src/sports-data/sports-data.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { ApiFootballClient } from './client/api-football.client';
import { ApiFootballNormalizer } from './normalizer/api-football.normalizer';
import { SportsDataCacheService } from './sports-data-cache.service';
import { LivescoreService } from './services/livescore.service';
import { FixturesService } from './services/fixtures.service';
import { StandingsService } from './services/standings.service';
import { TeamsService } from './services/teams.service';
import { OddsService } from './services/odds.service';
import { H2hService } from './services/h2h.service';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule],
  providers: [
    ApiFootballClient,
    ApiFootballNormalizer,
    SportsDataCacheService,
    LivescoreService,
    FixturesService,
    StandingsService,
    TeamsService,
    OddsService,
    H2hService,
  ],
  exports: [
    ApiFootballClient,
    SportsDataCacheService,
    LivescoreService,
    FixturesService,
    StandingsService,
    TeamsService,
    OddsService,
    H2hService,
  ],
})
export class SportsDataModule {}
```

- [ ] **Step 2: Remove duplicate ScheduleModule.forRoot() from app.module.ts**

In `apps/api/src/app.module.ts`, remove `ScheduleModule` from imports (it's already imported in `SportsDataModule`):

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';
import { SportsDataModule } from './sports-data/sports-data.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    RedisModule,
    HealthModule,
    SportsDataModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 3: Update .env.example**

Replace the `THESPORTSDB_API_KEY` line in `.env.example`:

```
# External APIs
APIFOOTBALL_API_KEY=your_api_key_here
APIFOOTBALL_TIMEZONE=Europe/Paris
```

- [ ] **Step 4: Delete old TheSportsDB files**

Run:
```bash
cd /home/quentin/pulseScore
rm apps/api/src/sports-data/sports-data.service.ts
rm apps/api/src/sports-data/sports-data-poller.service.ts
rm apps/api/src/sports-data/sports-data-normalizer.service.ts
rm apps/api/src/sports-data/interfaces/thesportsdb.interfaces.ts
rm apps/api/src/sports-data/sports-data-normalizer.service.spec.ts
rm apps/api/src/sports-data/sports-data-poller.service.spec.ts
```

- [ ] **Step 5: Verify build compiles**

Run: `cd apps/api && npx nest build`
Expected: Build succeeds with no errors

- [ ] **Step 6: Run all tests**

Run: `cd apps/api && npx jest --no-coverage`
Expected: All tests pass (old tests deleted, new tests pass)

- [ ] **Step 7: Commit**

```bash
git add -A apps/api/src/sports-data/ apps/api/src/app.module.ts .env.example
git commit -m "refactor(sports-data): rewire module to APIFootball, remove TheSportsDB"
```

---

## Task 14: Update ADR Documentation

**Files:**
- Modify: `docs/adr/001-thesportsdb-api-limits.md` (rename/replace)

- [ ] **Step 1: Replace ADR with APIFootball documentation**

Replace `docs/adr/001-thesportsdb-api-limits.md` contents with:

```markdown
# ADR 001: APIFootball.com as Primary Data Source

**Status:** Accepted (replaces TheSportsDB)
**Date:** 2026-04-10

## Context

PulseScore needs real-time football livescore data. TheSportsDB free tier does not include livescore.

## Decision

Use APIFootball.com v3 as the primary data source.

### Free Tier Limits

- **Data endpoints:** England Championship, France Ligue 2
- **Livescore:** All leagues (WebSocket push)
- **Rate limit:** 180 requests/hour per endpoint
- **Features:** Livescore, Live Events, Teams, Players, Results, Fixtures, Standings, H2H, Odds

### Architecture

- WebSocket for real-time livescore (no polling, no quota consumption)
- HTTP client with 20s throttle for data endpoints
- Hybrid storage: Prisma DB for persistent data, Redis for ephemeral (odds, H2H, lineups, stats)

### Refresh Strategy

| Data | Method | Frequency |
|------|--------|-----------|
| Livescore | WebSocket | Real-time |
| Standings | HTTP CRON | Every 6h |
| Teams/Players | HTTP CRON | Daily at 3 AM |
| Fixtures | HTTP CRON | Every 6h |
| Odds | HTTP on-demand | Cache 5min |
| H2H | HTTP on-demand | Cache 1h |

## Consequences

- Livescore covers all leagues (great for portfolio demo)
- Data endpoints limited to 2 leagues — sufficient for portfolio scope
- WebSocket requires reconnection handling (exponential backoff implemented)
```

- [ ] **Step 2: Commit**

```bash
git add docs/adr/
git commit -m "docs: update ADR 001 for APIFootball.com pivot"
```

---

## Summary

| Task | Description | Tests |
|------|-------------|-------|
| 1 | Prisma schema (Standing, Player) | Migration |
| 2 | Interfaces + DTOs | Type-only |
| 3 | ApiFootballClient HTTP | 4 tests |
| 4 | ApiFootballClient WebSocket | 2 tests |
| 5 | Normalizer | 20+ tests |
| 6 | Cache service update | Key patterns |
| 7 | LivescoreService | 7 tests |
| 8 | FixturesService | 2 tests |
| 9 | StandingsService | 2 tests |
| 10 | TeamsService | 2 tests |
| 11 | OddsService | 2 tests |
| 12 | H2hService | 2 tests |
| 13 | Module rewire + cleanup | Build + all tests |
| 14 | ADR documentation | — |
