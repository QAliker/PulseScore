# Sofascore Live Poller + SSE Stream Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stream free real-time live football scores to all browsers by polling Sofascore's unofficial public API server-side once every 30s and fanning out over Server-Sent Events.

**Architecture:** One NestJS `@Interval(30s)` poller calls `SofascoreClient.getLive()`, normalizes events to `MatchDto[]`, writes a Redis snapshot (`sports:live`), and pushes onto an in-memory RxJS `Subject`. `GET /livescore/stream` (`@Sse`) emits the snapshot on connect then every tick; `GET /livescore` reads the snapshot. The pre-wired frontend EventSource hooks are uncommented to consume it.

**Tech Stack:** NestJS 11 (`@nestjs/schedule`, `@Sse`), ioredis, RxJS 7, Next.js 16 / React 19 EventSource, Jest (api), Vitest (web).

**Reference spec:** `docs/superpowers/specs/2026-06-08-sofascore-live-sse-design.md`

---

## File Structure

**Backend — create (`apps/api/src/sports-data/`):**
- `interfaces/sofascore.interfaces.ts` — raw Sofascore response types
- `client/sofascore.client.ts` — `SofascoreClient.getLive()` fetch wrapper
- `normalizer/sofascore.normalizer.ts` — `SofascoreNormalizer.toMatchDtos()`
- `services/live-stream.service.ts` — `LiveStreamService` poll loop + Subject + snapshot
- `normalizer/sofascore.normalizer.spec.ts` — normalizer tests
- `services/live-stream.service.spec.ts` — poll loop tests

**Backend — modify:**
- `services/livescore.service.ts` — gut FDO loop, delegate to `LiveStreamService.snapshot()`
- `controllers/livescore.controller.ts` — add `@Sse('stream')`
- `sports-data.module.ts` — register the 3 new providers

**Frontend — modify (`apps/web/src/`):**
- `hooks/use-socket.ts` — uncomment EventSource block, add imports
- `hooks/use-live-scores.ts` — uncomment socket subscribe + flash diff
- `components/app/live-connection-badge.tsx` — read live status (no code change needed beyond default; verified in Task 8)

---

## Task 1: Sofascore raw interfaces

**Files:**
- Create: `apps/api/src/sports-data/interfaces/sofascore.interfaces.ts`

- [ ] **Step 1: Write the interfaces file**

```typescript
// Raw shapes from https://api.sofascore.com/api/v1/sport/football/events/live
// Only the fields we consume are typed; the real payload has many more.

export interface SofascoreScore {
  current?: number;
}

export interface SofascoreStatus {
  code: number;
  description: string; // e.g. "1st half", "Halftime", "Ended"
  type: string; // "inprogress" | "finished" | "notstarted" | "canceled" | "postponed"
}

export interface SofascoreTeam {
  id: number;
  name: string;
  shortName?: string;
}

export interface SofascoreCategory {
  id: number;
  name: string; // country / region, e.g. "England"
  flag?: string;
}

export interface SofascoreTournament {
  id: number;
  name: string; // e.g. "Premier League"
  category?: SofascoreCategory;
}

export interface SofascoreTime {
  initial?: number; // seconds elapsed at start of current period
  currentPeriodStartTimestamp?: number; // unix seconds
}

export interface SofascoreEvent {
  id: number;
  tournament: SofascoreTournament;
  homeTeam: SofascoreTeam;
  awayTeam: SofascoreTeam;
  homeScore?: SofascoreScore;
  awayScore?: SofascoreScore;
  status: SofascoreStatus;
  startTimestamp: number; // unix seconds
  time?: SofascoreTime;
}

export interface SofascoreLiveResponse {
  events: SofascoreEvent[];
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /home/quentin/pulseScore && npx tsc -p apps/api/tsconfig.json --noEmit`
Expected: no errors referencing `sofascore.interfaces.ts`.

- [ ] **Step 3: Commit**

```bash
cd /home/quentin/pulseScore
git add apps/api/src/sports-data/interfaces/sofascore.interfaces.ts
git commit -m "feat(api): add sofascore raw interfaces"
```

---

## Task 2: SofascoreClient

Mirrors `FootballDataOrgClient` style. No unit test (network fetch wrapper, matches existing client convention — covered indirectly by `LiveStreamService` tests in Task 4 which mock it).

**Files:**
- Create: `apps/api/src/sports-data/client/sofascore.client.ts`

- [ ] **Step 1: Write the client**

```typescript
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { SofascoreLiveResponse } from '../interfaces/sofascore.interfaces';

@Injectable()
export class SofascoreClient {
  private readonly logger = new Logger(SofascoreClient.name);
  private readonly liveUrl =
    'https://api.sofascore.com/api/v1/sport/football/events/live';

  async getLive(): Promise<SofascoreLiveResponse> {
    const response = await fetch(this.liveUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Referer: 'https://www.sofascore.com/',
        Accept: 'application/json',
      },
    });

    if (response.status === 429 || response.status === 503) {
      this.logger.warn(`Sofascore throttled: ${response.status}`);
      throw new HttpException(
        `Sofascore unavailable (${response.status})`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!response.ok) {
      throw new Error(
        `Sofascore request failed: ${response.status} ${response.statusText}`,
      );
    }

    return response.json() as Promise<SofascoreLiveResponse>;
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /home/quentin/pulseScore && npx tsc -p apps/api/tsconfig.json --noEmit`
Expected: no errors referencing `sofascore.client.ts`.

- [ ] **Step 3: Commit**

```bash
cd /home/quentin/pulseScore
git add apps/api/src/sports-data/client/sofascore.client.ts
git commit -m "feat(api): add sofascore live client"
```

---

## Task 3: SofascoreNormalizer (TDD)

**Files:**
- Create: `apps/api/src/sports-data/normalizer/sofascore.normalizer.ts`
- Test: `apps/api/src/sports-data/normalizer/sofascore.normalizer.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { SofascoreNormalizer } from './sofascore.normalizer';
import {
  SofascoreEvent,
  SofascoreLiveResponse,
} from '../interfaces/sofascore.interfaces';

function makeEvent(over: Partial<SofascoreEvent> = {}): SofascoreEvent {
  return {
    id: 100,
    tournament: {
      id: 17,
      name: 'Premier League',
      category: { id: 1, name: 'England', flag: 'england' },
    },
    homeTeam: { id: 1, name: 'Arsenal' },
    awayTeam: { id: 2, name: 'Chelsea' },
    homeScore: { current: 2 },
    awayScore: { current: 1 },
    status: { code: 6, description: '1st half', type: 'inprogress' },
    startTimestamp: 1_700_000_000,
    ...over,
  };
}

describe('SofascoreNormalizer', () => {
  const normalizer = new SofascoreNormalizer();

  it('maps a live event to a MatchDto', () => {
    const res: SofascoreLiveResponse = { events: [makeEvent()] };
    const [dto] = normalizer.toMatchDtos(res);

    expect(dto.id).toBe('sofa:100');
    expect(dto.externalId).toBe('sofa:100');
    expect(dto.status).toBe('LIVE');
    expect(dto.sport).toBe('Football');
    expect(dto.homeScore).toBe(2);
    expect(dto.awayScore).toBe(1);
    expect(dto.homeTeam.name).toBe('Arsenal');
    expect(dto.homeTeam.externalId).toBe('sofa:team:1');
    expect(dto.awayTeam.externalId).toBe('sofa:team:2');
    expect(dto.league?.name).toBe('Premier League');
    expect(dto.league?.country).toBe('England');
    expect(dto.league?.externalId).toBe('sofa:tournament:17');
    expect(dto.goalscorers).toEqual([]);
    expect(dto.cards).toEqual([]);
    expect(dto.lineups).toBeNull();
    expect(dto.startTime).toEqual(new Date(1_700_000_000 * 1000));
  });

  it('maps status types', () => {
    const cases: Array<[string, string]> = [
      ['inprogress', 'LIVE'],
      ['finished', 'FINISHED'],
      ['canceled', 'CANCELLED'],
      ['postponed', 'POSTPONED'],
      ['notstarted', 'SCHEDULED'],
      ['unknown', 'SCHEDULED'],
    ];
    for (const [type, expected] of cases) {
      const [dto] = normalizer.toMatchDtos({
        events: [makeEvent({ status: { code: 0, description: '', type } })],
      });
      expect(dto.status).toBe(expected);
    }
  });

  it('returns null progress when not live', () => {
    const [dto] = normalizer.toMatchDtos({
      events: [
        makeEvent({
          status: { code: 100, description: 'Ended', type: 'finished' },
        }),
      ],
    });
    expect(dto.progress).toBeNull();
  });

  it('returns "HT" progress at halftime', () => {
    const [dto] = normalizer.toMatchDtos({
      events: [
        makeEvent({
          status: { code: 31, description: 'Halftime', type: 'inprogress' },
        }),
      ],
    });
    expect(dto.progress).toBe('HT');
  });

  it('computes the live minute from period timestamps', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_180 * 1000); // +180s
    const [dto] = normalizer.toMatchDtos({
      events: [
        makeEvent({
          status: { code: 7, description: '2nd half', type: 'inprogress' },
          time: { initial: 2700, currentPeriodStartTimestamp: 1_700_000_000 },
        }),
      ],
    });
    // base 45 + elapsed 3 + 1 = 49
    expect(dto.progress).toBe('49');
    jest.restoreAllMocks();
  });

  it('handles missing scores as null', () => {
    const [dto] = normalizer.toMatchDtos({
      events: [makeEvent({ homeScore: undefined, awayScore: {} })],
    });
    expect(dto.homeScore).toBeNull();
    expect(dto.awayScore).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/quentin/pulseScore && npx jest --config apps/api/package.json sofascore.normalizer -i`
(If that flag form errors, use `cd apps/api && npx jest sofascore.normalizer`.)
Expected: FAIL — `Cannot find module './sofascore.normalizer'`.

- [ ] **Step 3: Write minimal implementation**

```typescript
import { Injectable } from '@nestjs/common';
import {
  SofascoreEvent,
  SofascoreLiveResponse,
} from '../interfaces/sofascore.interfaces';
import { MatchDto } from '../dto/match.dto';
import { TeamDto } from '../dto/team.dto';
import { LeagueDto } from '../dto/league.dto';

@Injectable()
export class SofascoreNormalizer {
  toMatchDtos(res: SofascoreLiveResponse): MatchDto[] {
    return (res.events ?? []).map((event) => this.toMatchDto(event));
  }

  private toMatchDto(event: SofascoreEvent): MatchDto {
    const dto = new MatchDto();
    dto.id = `sofa:${event.id}`;
    dto.externalId = `sofa:${event.id}`;
    dto.status = this.normalizeStatus(event.status.type);
    dto.sport = 'Football';
    dto.startTime = new Date(event.startTimestamp * 1000);
    dto.progress = this.deriveProgress(event);
    dto.homeScore = event.homeScore?.current ?? null;
    dto.awayScore = event.awayScore?.current ?? null;
    dto.round = null;
    dto.stage = null;
    dto.group = null;
    dto.winner = null;
    dto.venue = null;
    dto.goalscorers = [];
    dto.cards = [];
    dto.substitutions = [];
    dto.lineups = null;
    dto.statistics = [];

    const homeTeam = new TeamDto();
    homeTeam.id = `sofa:team:${event.homeTeam.id}`;
    homeTeam.externalId = `sofa:team:${event.homeTeam.id}`;
    homeTeam.name = event.homeTeam.name;
    homeTeam.logo = null;
    dto.homeTeam = homeTeam;

    const awayTeam = new TeamDto();
    awayTeam.id = `sofa:team:${event.awayTeam.id}`;
    awayTeam.externalId = `sofa:team:${event.awayTeam.id}`;
    awayTeam.name = event.awayTeam.name;
    awayTeam.logo = null;
    dto.awayTeam = awayTeam;

    const league = new LeagueDto();
    league.id = `sofa:tournament:${event.tournament.id}`;
    league.externalId = `sofa:tournament:${event.tournament.id}`;
    league.name = event.tournament.name;
    league.sport = 'Football';
    league.country = event.tournament.category?.name ?? null;
    league.logo = null;
    dto.league = league;

    return dto;
  }

  private normalizeStatus(type: string): MatchDto['status'] {
    switch (type) {
      case 'inprogress':
        return 'LIVE';
      case 'finished':
        return 'FINISHED';
      case 'canceled':
        return 'CANCELLED';
      case 'postponed':
        return 'POSTPONED';
      default:
        return 'SCHEDULED';
    }
  }

  private deriveProgress(event: SofascoreEvent): string | null {
    if (event.status.type !== 'inprogress') return null;
    if (/halftime|half[- ]?time/i.test(event.status.description)) return 'HT';

    const time = event.time;
    if (time?.currentPeriodStartTimestamp != null) {
      const nowSec = Math.floor(Date.now() / 1000);
      const elapsedMin = Math.floor(
        (nowSec - time.currentPeriodStartTimestamp) / 60,
      );
      const baseMin = Math.round((time.initial ?? 0) / 60);
      const minute = baseMin + Math.max(0, elapsedMin) + 1;
      return String(minute);
    }

    return event.status.description || null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/quentin/pulseScore/apps/api && npx jest sofascore.normalizer`
Expected: PASS, all 6 tests green.

- [ ] **Step 5: Commit**

```bash
cd /home/quentin/pulseScore
git add apps/api/src/sports-data/normalizer/sofascore.normalizer.ts apps/api/src/sports-data/normalizer/sofascore.normalizer.spec.ts
git commit -m "feat(api): add sofascore normalizer with tests"
```

---

## Task 4: LiveStreamService (TDD)

Owns the poll loop, Redis snapshot, and RxJS Subject fan-out.

**Files:**
- Create: `apps/api/src/sports-data/services/live-stream.service.ts`
- Test: `apps/api/src/sports-data/services/live-stream.service.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { firstValueFrom } from 'rxjs';
import { take, toArray } from 'rxjs/operators';
import { LiveStreamService } from './live-stream.service';
import { SofascoreClient } from '../client/sofascore.client';
import { SofascoreNormalizer } from '../normalizer/sofascore.normalizer';
import { SportsDataCacheService } from '../sports-data-cache.service';
import { MatchDto } from '../dto/match.dto';

function fakeMatch(id: string): MatchDto {
  const m = new MatchDto();
  m.id = id;
  m.externalId = id;
  m.status = 'LIVE';
  return m;
}

describe('LiveStreamService', () => {
  let client: { getLive: jest.Mock };
  let normalizer: { toMatchDtos: jest.Mock };
  let cache: { getCached: jest.Mock; setCached: jest.Mock };
  let service: LiveStreamService;

  beforeEach(() => {
    client = { getLive: jest.fn() };
    normalizer = { toMatchDtos: jest.fn() };
    cache = { getCached: jest.fn(), setCached: jest.fn() };
    service = new LiveStreamService(
      client as unknown as SofascoreClient,
      normalizer as unknown as SofascoreNormalizer,
      cache as unknown as SportsDataCacheService,
    );
  });

  it('writes snapshot to redis and emits on the subject', async () => {
    const matches = [fakeMatch('sofa:1')];
    client.getLive.mockResolvedValue({ events: [] });
    normalizer.toMatchDtos.mockReturnValue(matches);

    const emitted = firstValueFrom(service.stream().pipe(take(1)));
    await service.poll();

    await expect(emitted).resolves.toEqual(matches);
    expect(cache.setCached).toHaveBeenCalledWith(
      SportsDataCacheService.livescoresKey(),
      matches,
      30,
    );
  });

  it('keeps previous snapshot and does not emit on poll error', async () => {
    client.getLive.mockRejectedValue(new Error('503'));
    const events: MatchDto[][] = [];
    const sub = service.stream().subscribe((v) => events.push(v));

    await service.poll();

    expect(events).toEqual([]);
    expect(cache.setCached).not.toHaveBeenCalled();
    sub.unsubscribe();
  });

  it('snapshot() returns the cached value or empty array', async () => {
    const matches = [fakeMatch('sofa:9')];
    cache.getCached.mockResolvedValueOnce(matches);
    await expect(service.snapshot()).resolves.toEqual(matches);

    cache.getCached.mockResolvedValueOnce(null);
    await expect(service.snapshot()).resolves.toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/quentin/pulseScore/apps/api && npx jest live-stream.service`
Expected: FAIL — `Cannot find module './live-stream.service'`.

- [ ] **Step 3: Write minimal implementation**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Observable, Subject } from 'rxjs';
import { SofascoreClient } from '../client/sofascore.client';
import { SofascoreNormalizer } from '../normalizer/sofascore.normalizer';
import {
  SportsDataCacheService,
  TTL_LIVE,
} from '../sports-data-cache.service';
import { MatchDto } from '../dto/match.dto';

@Injectable()
export class LiveStreamService {
  private readonly logger = new Logger(LiveStreamService.name);
  private readonly subject = new Subject<MatchDto[]>();

  constructor(
    private readonly client: SofascoreClient,
    private readonly normalizer: SofascoreNormalizer,
    private readonly cache: SportsDataCacheService,
  ) {}

  @Interval(30_000)
  async poll(): Promise<void> {
    try {
      const res = await this.client.getLive();
      const matches = this.normalizer.toMatchDtos(res);
      await this.cache.setCached(
        SportsDataCacheService.livescoresKey(),
        matches,
        TTL_LIVE,
      );
      this.subject.next(matches);
    } catch (err) {
      this.logger.warn(`Live poll failed, keeping last snapshot: ${String(err)}`);
    }
  }

  async snapshot(): Promise<MatchDto[]> {
    const cached = await this.cache.getCached<MatchDto[]>(
      SportsDataCacheService.livescoresKey(),
    );
    return cached ?? [];
  }

  stream(): Observable<MatchDto[]> {
    return this.subject.asObservable();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/quentin/pulseScore/apps/api && npx jest live-stream.service`
Expected: PASS, all 3 tests green.

- [ ] **Step 5: Commit**

```bash
cd /home/quentin/pulseScore
git add apps/api/src/sports-data/services/live-stream.service.ts apps/api/src/sports-data/services/live-stream.service.spec.ts
git commit -m "feat(api): add live-stream poll service with tests"
```

---

## Task 5: Wire module, retire FDO livescore, add SSE endpoint

**Files:**
- Modify: `apps/api/src/sports-data/sports-data.module.ts`
- Modify: `apps/api/src/sports-data/services/livescore.service.ts`
- Modify: `apps/api/src/sports-data/controllers/livescore.controller.ts`

- [ ] **Step 1: Register providers in the module**

In `sports-data.module.ts`, add these imports after the existing client/normalizer imports (after line 9 `SportsDataCacheService` import):

```typescript
import { SofascoreClient } from './client/sofascore.client';
import { SofascoreNormalizer } from './normalizer/sofascore.normalizer';
import { LiveStreamService } from './services/live-stream.service';
```

In the `providers` array, add after `SportsDataCacheService,`:

```typescript
    SofascoreClient,
    SofascoreNormalizer,
    LiveStreamService,
```

In the `exports` array, add after `LivescoreService,`:

```typescript
    LiveStreamService,
```

- [ ] **Step 2: Replace livescore.service.ts body**

Replace the entire file `apps/api/src/sports-data/services/livescore.service.ts` with:

```typescript
import { Injectable } from '@nestjs/common';
import { LiveStreamService } from './live-stream.service';
import { MatchDto } from '../dto/match.dto';

@Injectable()
export class LivescoreService {
  constructor(private readonly liveStream: LiveStreamService) {}

  async getCurrent(): Promise<MatchDto[]> {
    return this.liveStream.snapshot();
  }
}
```

- [ ] **Step 3: Add the SSE endpoint to the controller**

Replace the entire file `apps/api/src/sports-data/controllers/livescore.controller.ts` with:

```typescript
import { Controller, Get, Sse, MessageEvent } from '@nestjs/common';
import { Observable, from, merge, defer, map } from 'rxjs';
import { LivescoreService } from '../services/livescore.service';
import { LiveStreamService } from '../services/live-stream.service';

@Controller('livescore')
export class LivescoreController {
  constructor(
    private readonly livescoreService: LivescoreService,
    private readonly liveStream: LiveStreamService,
  ) {}

  @Get()
  getCurrent() {
    return this.livescoreService.getCurrent();
  }

  @Sse('stream')
  stream(): Observable<MessageEvent> {
    const initial = defer(() => from(this.liveStream.snapshot()));
    return merge(initial, this.liveStream.stream()).pipe(
      map((matches) => ({ data: matches }) as MessageEvent),
    );
  }
}
```

Note: NestJS serializes the `data` object to JSON over the wire, which the frontend parses as `ApiMatch[]`.

- [ ] **Step 4: Verify it compiles and existing tests still pass**

Run: `cd /home/quentin/pulseScore && npx tsc -p apps/api/tsconfig.json --noEmit && cd apps/api && npx jest`
Expected: no type errors; all jest suites pass. (`livescore.service.ts` no longer references `FootballDataOrgClient`, `PrismaService`, or `LEAGUE_MAP` — confirm no other file imports `LivescoreService` expecting those.)

- [ ] **Step 5: Smoke-test the endpoints manually**

Run (API must be running via `npm run dev` with Docker up):
```bash
curl -s http://localhost:3001/livescore | head -c 300
curl -sN http://localhost:3001/livescore/stream | head -c 300
```
Expected: first returns a JSON array (possibly `[]` if no live matches or first poll not yet fired); second prints `data: [...]` SSE frame(s). If empty, wait 30s for the first poll tick.

- [ ] **Step 6: Commit**

```bash
cd /home/quentin/pulseScore
git add apps/api/src/sports-data/sports-data.module.ts apps/api/src/sports-data/services/livescore.service.ts apps/api/src/sports-data/controllers/livescore.controller.ts
git commit -m "feat(api): stream live scores via SSE, retire FDO livescore path"
```

---

## Task 6: Frontend — enable EventSource in use-socket

**Files:**
- Modify: `apps/web/src/hooks/use-socket.ts`

- [ ] **Step 1: Replace the file with the live version**

Replace the entire file `apps/web/src/hooks/use-socket.ts` with:

```typescript
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Match, SocketStatus } from '@/lib/types';
import type { ApiMatch } from '@/lib/api-types';
import { apiMatchesToMatches } from '@/lib/api-match-map';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type Listener = (matches: Match[]) => void;

export type UseSocketResult = {
  status: SocketStatus;
  subscribe: (listener: Listener) => () => void;
};

export function useSocket(enabled = true): UseSocketResult {
  const [status, setStatus] = useState<SocketStatus>('connecting');
  const listenersRef = useRef<Set<Listener>>(new Set());
  const esRef = useRef<EventSource | null>(null);

  const subscribe = useCallback((listener: Listener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let retry: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      const es = new EventSource(`${API_URL}/livescore/stream`);
      esRef.current = es;

      es.onopen = () => setStatus('live');

      es.onmessage = (event: MessageEvent<string>) => {
        try {
          const raw = JSON.parse(event.data) as ApiMatch[];
          const matches = apiMatchesToMatches(raw);
          listenersRef.current.forEach((l) => l(matches));
        } catch {
          // malformed frame — ignore
        }
      };

      es.onerror = () => {
        setStatus('reconnecting');
        es.close();
        esRef.current = null;
        retry = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      if (retry) clearTimeout(retry);
      esRef.current?.close();
      esRef.current = null;
    };
  }, [enabled]);

  return { status, subscribe };
}
```

- [ ] **Step 2: Verify imports resolve**

Run: `cd /home/quentin/pulseScore && npx tsc -p apps/web/tsconfig.json --noEmit`
Expected: no errors referencing `use-socket.ts`. (Confirms `ApiMatch` is exported from `@/lib/api-types` and `apiMatchesToMatches` from `@/lib/api-match-map`.)

- [ ] **Step 3: Commit**

```bash
cd /home/quentin/pulseScore
git add apps/web/src/hooks/use-socket.ts
git commit -m "feat(web): connect live EventSource in useSocket"
```

---

## Task 7: Frontend — wire useLiveScores to the socket

**Files:**
- Modify: `apps/web/src/hooks/use-live-scores.ts`

- [ ] **Step 1: Replace the file with the live version**

Replace the entire file `apps/web/src/hooks/use-live-scores.ts` with:

```typescript
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSocket } from './use-socket';
import type { Match, MatchesByLeague, SocketStatus } from '@/lib/types';

export type FlashEntry = { matchId: string; scorer: 'home' | 'away'; at: number };

type UseLiveScoresResult = {
  matchesByLeague: MatchesByLeague;
  all: Match[];
  status: SocketStatus;
  flashes: FlashEntry[];
};

export function useLiveScores(initial: Match[]): UseLiveScoresResult {
  const [matches, setMatches] = useState<Match[]>(initial);
  const [flashes, setFlashes] = useState<FlashEntry[]>([]);
  const prevRef = useRef<Match[]>(initial);
  const { status, subscribe } = useSocket();

  useEffect(() => {
    return subscribe((fresh: Match[]) => {
      const prev = prevRef.current;
      const newFlashes: FlashEntry[] = [];

      for (const next of fresh) {
        const old = prev.find((m) => m.id === next.id);
        if (!old) continue;
        if (next.homeScore > old.homeScore) {
          newFlashes.push({ matchId: next.id, scorer: 'home', at: Date.now() });
        } else if (next.awayScore > old.awayScore) {
          newFlashes.push({ matchId: next.id, scorer: 'away', at: Date.now() });
        }
      }

      prevRef.current = fresh;
      setMatches(fresh);
      if (newFlashes.length) {
        setFlashes((prev) => [
          ...prev.filter((f) => !newFlashes.some((n) => n.matchId === f.matchId)),
          ...newFlashes,
        ]);
      }
    });
  }, [subscribe]);

  // Auto-clear flashes after animation window.
  useEffect(() => {
    if (!flashes.length) return;
    const t = setTimeout(() => {
      const cutoff = Date.now() - 1000;
      setFlashes((prev) => prev.filter((f) => f.at > cutoff));
    }, 1100);
    return () => clearTimeout(t);
  }, [flashes]);

  useEffect(() => {
    const t = setInterval(() => {
      setMatches((prev) =>
        prev.map((m) =>
          m.status === 'live' || m.status === 'halftime'
            ? { ...m, minute: (m.minute ?? 0) + 1 }
            : m,
        ),
      );
    }, 60_000);
    return () => clearInterval(t);
  }, []);

  const matchesByLeague = useMemo(() => {
    const map: MatchesByLeague = {};
    for (const m of matches) {
      (map[m.leagueSlug] ??= []).push(m);
    }
    for (const slug of Object.keys(map)) {
      map[slug].sort(sortMatch);
    }
    return map;
  }, [matches]);

  return { matchesByLeague, all: matches, status, flashes };
}

const statusRank: Record<Match['status'], number> = {
  live: 0,
  halftime: 1,
  scheduled: 2,
  postponed: 3,
  finished: 4,
};

function sortMatch(a: Match, b: Match): number {
  const rs = statusRank[a.status] - statusRank[b.status];
  if (rs !== 0) return rs;
  return new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime();
}
```

(Removes the file-top `eslint-disable no-unused-vars` since `useSocket` is now used.)

- [ ] **Step 2: Verify it compiles and web tests pass**

Run: `cd /home/quentin/pulseScore && npx tsc -p apps/web/tsconfig.json --noEmit && cd apps/web && npm run test`
Expected: no type errors; vitest suite passes.

- [ ] **Step 3: Commit**

```bash
cd /home/quentin/pulseScore
git add apps/web/src/hooks/use-live-scores.ts
git commit -m "feat(web): drive live scores and goal flashes from socket"
```

---

## Task 8: Frontend — badge reflects real connection status

**Files:**
- Modify: `apps/web/src/components/app/live-connection-badge.tsx`
- Inspect: the component that renders `<LiveConnectionBadge />` (likely a navbar/header) to pass the live `status`.

- [ ] **Step 1: Find where the badge and useLiveScores status are rendered**

Run: `cd /home/quentin/pulseScore && rg -n "LiveConnectionBadge|useLiveScores" apps/web/src`
Expected: identifies the badge usage site and the component holding `status` from `useLiveScores`. The badge currently defaults `status='live'`; the goal is to pass the real `status` down.

- [ ] **Step 2: Update the badge to require an explicit status default of 'connecting'**

In `apps/web/src/components/app/live-connection-badge.tsx`, update the type and signature so it can show all real states (`SocketStatus` includes `'connecting'`). Replace lines 5-11:

```typescript
import type { SocketStatus } from '@/lib/types';

export function LiveConnectionBadge({
  status = 'offline',
}: {
  status?: SocketStatus;
} = {}) {
  const label =
    status === 'live'
      ? 'Live'
      : status === 'reconnecting'
        ? 'Reconnecting'
        : status === 'connecting'
          ? 'Connecting'
          : 'Offline';
```

Then in the dot `<span>`, add a connecting color alongside the existing ones (inside the `cn(...)` for the dot):

```typescript
          status === 'connecting' && 'bg-amber-500',
```

- [ ] **Step 3: Pass the real status at the render site**

At the usage site found in Step 1, if the rendering component has access to `useLiveScores().status` (or `useSocket().status`), pass it: `<LiveConnectionBadge status={status} />`. If the badge sits in a server component / different tree without access, leave the default — note it for follow-up rather than restructuring data flow here.

- [ ] **Step 4: Verify it compiles and tests pass**

Run: `cd /home/quentin/pulseScore && npx tsc -p apps/web/tsconfig.json --noEmit && cd apps/web && npm run test`
Expected: no type errors; vitest passes.

- [ ] **Step 5: Manual end-to-end check**

With Docker + `npm run dev` running, open `http://localhost:3000`. During live matches: badge shows "Live", scores update within ~30s, a goal triggers a flash. With API stopped: badge flips to "Reconnecting" within a few seconds.

- [ ] **Step 6: Commit**

```bash
cd /home/quentin/pulseScore
git add apps/web/src/components/app/live-connection-badge.tsx
git commit -m "feat(web): live-connection badge reflects socket status"
```

---

## Self-Review Notes

- **Spec coverage:** Sofascore source (Task 2), all-leagues no-filter (normalizer maps every event, Task 3), country→league grouping carried via `league.country`/`league.name` (Task 3; frontend grouping unchanged), live items not clickable (no detail mapping added), Sofascore replaces FDO live (Task 5 guts `livescore.service.ts`), basic fields only with empty incident arrays (Task 3), Redis snapshot single source of truth (Task 4), in-memory Subject fan-out + `@Sse` (Tasks 4-5), pre-wired frontend uncommented (Tasks 6-8), Jest tests for normalizer + service (Tasks 3-4). All spec sections mapped.
- **Type consistency:** `toMatchDtos` / `snapshot` / `stream` names consistent across Tasks 3-5; `MatchDto`/`TeamDto`/`LeagueDto` fields match `dto/match.dto.ts`; SSE `data` object matches frontend `ApiMatch[]` parse.
- **Deferred / out of scope (per spec):** Redis pub/sub multi-instance fan-out, Sofascore→DB match mapping for clickable detail/lineups, per-match incidents, subscriber-gated polling, non-football sports.
- **Risk flag:** Sofascore minute computation (Task 3 `deriveProgress`) is a heuristic on `time.initial` / `currentPeriodStartTimestamp`; if real payload fields differ, minute may be approximate but never throws (falls back to description/null). Verify against a live payload during Task 5 smoke test.
