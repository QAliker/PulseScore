# World Cup Full Tournament Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the FIFA World Cup to PulseScore as a full tournament — 8 group tables, a visual knockout bracket, scorers, and results — sourced from Football-Data.org (`WC`).

**Architecture:** Backend adds `group` (standings) and `stage`/`group` (matches) through the existing FDO path, plus two new read endpoints (`/groups` all group tables, `/matches` all matches — the existing fixtures/results endpoints use a ±30-day window that would truncate the bracket). Frontend flags the WC `League` with `isCup`, and the leagues `[slug]` page branches to a new `WorldCupView` (Groups · Bracket · Scorers · Results). No DB seeding — data resolves on the fly with graceful fallbacks. WC is excluded from cron warmup.

**Tech Stack:** NestJS 11 + Jest (API), Next.js 16 App Router + React 19 + Tailwind (web), Football-Data.org v4.

> **Commits:** Commit steps included per convention. Per project rule ([[feedback_no_commit]]), the executor runs `git commit` **only when the user explicitly authorizes it** — otherwise leave changes in the working tree and report. Current run: **stay on `main`, no commits** unless the user says otherwise.

> **API tests:** `apps/api` HAS Jest. Backend tasks are TDD (test first). `apps/web` UI tasks verify via `npm run lint` + `npm run build --workspace=apps/web` + manual (no component test pattern exists).

> **Next.js note:** `apps/web/AGENTS.md` warns this is Next.js 16 with breaking changes — follow existing file patterns exactly; do not "modernize".

---

## Reference: raw FDO stage values

FDO World Cup matches use `stage`: `GROUP_STAGE`, `LAST_16`, `QUARTER_FINALS`, `SEMI_FINALS`, `THIRD_PLACE`, `FINAL`. Standings group tables carry `group`: `GROUP_A` … `GROUP_H`, all with `type: 'TOTAL'`.

---

## Task 1: Backend types — add group/stage to interfaces + DTOs

**Files:**
- Modify: `apps/api/src/sports-data/interfaces/football-data-org.interfaces.ts`
- Modify: `apps/api/src/sports-data/dto/standing.dto.ts`
- Modify: `apps/api/src/sports-data/dto/match.dto.ts`

- [ ] **Step 1: Add `stage`/`group` to `FdoMatch`**

In `football-data-org.interfaces.ts`, the `FdoMatch` interface currently ends with `competition: { id: number; name: string; code: string };`. Add two fields:
```ts
export interface FdoMatch {
  id: number;
  utcDate: string;
  status: string;
  matchday: number | null;
  stage?: string | null;
  group?: string | null;
  homeTeam: FdoTeam;
  awayTeam: FdoTeam;
  score: FdoScore;
  competition: { id: number; name: string; code: string };
}
```

- [ ] **Step 2: Add `group` to the standings element type**

In the same file, `FdoStandingsResponse.standings` is `Array<{ type: string; table: FdoStanding[] }>`. Change to:
```ts
  standings: Array<{ type: string; group?: string | null; table: FdoStanding[] }>;
```

- [ ] **Step 3: Add `group` to `StandingDto`**

In `dto/standing.dto.ts`, add after `form: string | null;`:
```ts
  group: string | null;
```

- [ ] **Step 4: Add `stage`/`group` to `MatchDto`**

In `dto/match.dto.ts`, in `class MatchDto`, add after `round: number | null;`:
```ts
  stage: string | null;
  group: string | null;
```

- [ ] **Step 5: Verify it compiles**

Run: `cd /home/quentin/pulseScore && npm run build --workspace=apps/api`
Expected: TypeScript compiles. (It may surface a PRE-EXISTING root-owned `apps/api/dist` permission error from a stale file — if so, run `npx tsc --noEmit -p apps/api/tsconfig.json` instead and expect no type errors.)

- [ ] **Step 6: Commit (only if user authorized)**

```bash
git add apps/api/src/sports-data/interfaces/football-data-org.interfaces.ts apps/api/src/sports-data/dto/standing.dto.ts apps/api/src/sports-data/dto/match.dto.ts
git commit -m "feat(api): add group/stage fields to FDO types and DTOs"
```

---

## Task 2: Normalizer — map stage/group (TDD)

**Files:**
- Modify: `apps/api/src/sports-data/normalizer/football-data-org.normalizer.ts`
- Test: `apps/api/src/sports-data/__tests__/football-data-org.normalizer.spec.ts`

- [ ] **Step 1: Write failing tests**

Append inside the top-level `describe('FootballDataOrgNormalizer', ...)` block in the spec (after existing tests):

```ts
  describe('normalizeMatch stage/group', () => {
    it('maps stage and group when present', () => {
      const m = normalizer.normalizeMatch(
        { ...fdoMatch, stage: 'LAST_16', group: null },
        null, null, null,
      );
      expect(m.stage).toBe('LAST_16');
      expect(m.group).toBeNull();
    });

    it('defaults stage/group to null when absent', () => {
      const m = normalizer.normalizeMatch(fdoMatch, null, null, null);
      expect(m.stage).toBeNull();
      expect(m.group).toBeNull();
    });
  });

  describe('normalizeStanding group', () => {
    const entry: FdoStanding = {
      position: 1,
      team: { id: 759, name: 'Brazil', crest: 'https://crests.football-data.org/759.png' },
      playedGames: 3, won: 3, draw: 0, lost: 0,
      goalsFor: 7, goalsAgainst: 1, points: 9, form: null,
    };

    it('sets group when passed', () => {
      const s = normalizer.normalizeStanding(entry, 'wc', 'FIFA World Cup', null, 'GROUP_A');
      expect(s.group).toBe('GROUP_A');
    });

    it('defaults group to null', () => {
      const s = normalizer.normalizeStanding(entry, 'wc', 'FIFA World Cup', null);
      expect(s.group).toBeNull();
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/quentin/pulseScore && npm run test --workspace=apps/api -- football-data-org.normalizer`
Expected: FAIL (`stage`/`group` undefined; `normalizeStanding` has no 5th param).

- [ ] **Step 3: Implement in the normalizer**

In `normalizeMatch`, after `dto.round = raw.matchday;` add:
```ts
    dto.stage = raw.stage ?? null;
    dto.group = raw.group ?? null;
```

Change `normalizeStanding` signature and body. Current signature:
```ts
  normalizeStanding(
    raw: FdoStanding,
    leagueId: string,
    leagueName: string,
    teamResolvedId: string | null,
  ): StandingDto {
```
→
```ts
  normalizeStanding(
    raw: FdoStanding,
    leagueId: string,
    leagueName: string,
    teamResolvedId: string | null,
    group: string | null = null,
  ): StandingDto {
```
And before `return dto;` add:
```ts
    dto.group = group;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/quentin/pulseScore && npm run test --workspace=apps/api -- football-data-org.normalizer`
Expected: PASS (all, including pre-existing).

- [ ] **Step 5: Commit (only if user authorized)**

```bash
git add apps/api/src/sports-data/normalizer/football-data-org.normalizer.ts apps/api/src/sports-data/__tests__/football-data-org.normalizer.spec.ts
git commit -m "feat(api): normalize FDO match stage and standing group"
```

---

## Task 3: standings.service — getGroupStandings (TDD)

**Files:**
- Modify: `apps/api/src/sports-data/sports-data-cache.service.ts`
- Modify: `apps/api/src/sports-data/services/standings.service.ts`
- Test: `apps/api/src/sports-data/__tests__/standings.service.spec.ts`

- [ ] **Step 1: Add a cache key**

Read `sports-data-cache.service.ts` to see the existing static key methods (e.g. `standingsKey`, `seasonKey`). Following that exact pattern, add:
```ts
  static groupsKey(leagueId: string): string {
    return `sports:groups:${leagueId}`;
  }
```
(Match the actual prefix style used by the neighboring methods if it differs.)

- [ ] **Step 2: Write a failing test**

Open `__tests__/standings.service.spec.ts`, read how it constructs the service + mocks `fdoClient`/`prismaService`/`cacheService`. Add a test that mocks an FDO standings response with two groups and asserts `getGroupStandings` returns all rows with their `group` labels. Use the existing mock setup style in that file; the assertion core:

```ts
  it('getGroupStandings returns every group table labelled with its group', async () => {
    // cacheService.getCached → null; fdoClient.get → response below; prisma team.findFirst → null
    const response = {
      competition: { id: 2000, name: 'FIFA World Cup', code: 'WC' },
      season: { id: 1, startDate: '2026-06-11', endDate: '2026-07-19', currentMatchday: 1, winner: null },
      standings: [
        { type: 'TOTAL', group: 'GROUP_A', table: [
          { position: 1, team: { id: 759, name: 'Brazil', crest: 'c' }, playedGames: 1, won: 1, draw: 0, lost: 0, goalsFor: 2, goalsAgainst: 0, points: 3, form: null },
        ] },
        { type: 'TOTAL', group: 'GROUP_B', table: [
          { position: 1, team: { id: 760, name: 'France', crest: 'c' }, playedGames: 1, won: 1, draw: 0, lost: 0, goalsFor: 3, goalsAgainst: 1, points: 3, form: null },
        ] },
      ],
    };
    // wire mocks per the file's existing pattern, with LEAGUE_MAP entry for '1' present (add to season.constants in Task 4; for this unit test, call with a leagueId already mapped, or mock LEAGUE_MAP). If LEAGUE_MAP['1'] is needed, ensure Task 4 ran first or use an existing mapped id like '39' for the pure-shape assertion.
    const result = await service.getGroupStandings('39');
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.group)).toEqual(['GROUP_A', 'GROUP_B']);
    expect(result[0].teamName).toBe('Brazil');
  });
```
> Note: keep the test self-contained — mirror the exact mock wiring already used by other tests in this file (the file shows how `fdoClient.get`, `cacheService.getCached/setCached`, and `prismaService` are mocked). Use a `leagueId` that exists in `LEAGUE_MAP` to avoid the early `return []`.

- [ ] **Step 3: Run test to verify it fails**

Run: `cd /home/quentin/pulseScore && npm run test --workspace=apps/api -- standings.service`
Expected: FAIL (`getGroupStandings` is not a function).

- [ ] **Step 4: Implement `getGroupStandings`**

In `standings.service.ts`, add this method (mirrors `getStandingsFdo` but keeps every `type:'TOTAL'` table and labels rows with their group):

```ts
  async getGroupStandings(leagueId: string): Promise<StandingDto[]> {
    const cacheKey = SportsDataCacheService.groupsKey(leagueId);
    const cached = await this.cacheService.getCached<StandingDto[]>(cacheKey);
    if (cached) return cached;

    const mapping = LEAGUE_MAP[leagueId];
    if (!mapping) return [];

    const data = await this.fdoClient.get<FdoStandingsResponse>(
      `competitions/${mapping.fdoCode}/standings`,
    );

    const league = await this.prismaService.league.findFirst({
      where: { externalId: leagueId },
    });
    const leagueResolvedId = league?.id ?? leagueId;

    const groupTables = data.standings.filter((s) => s.type === 'TOTAL');
    const result: StandingDto[] = [];
    for (const gt of groupTables) {
      for (const entry of gt.table) {
        const team = await this.prismaService.team.findFirst({
          where: { fdoExternalId: String(entry.team.id) },
        });
        result.push(
          this.fdoNormalizer.normalizeStanding(
            entry,
            leagueResolvedId,
            data.competition.name,
            team?.externalId ?? null,
            gt.group ?? null,
          ),
        );
      }
    }

    await this.cacheService.setCached(cacheKey, result, TTL_STANDINGS);
    return result;
  }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /home/quentin/pulseScore && npm run test --workspace=apps/api -- standings.service`
Expected: PASS.

- [ ] **Step 6: Commit (only if user authorized)**

```bash
git add apps/api/src/sports-data/sports-data-cache.service.ts apps/api/src/sports-data/services/standings.service.ts apps/api/src/sports-data/__tests__/standings.service.spec.ts
git commit -m "feat(api): add getGroupStandings for grouped competitions"
```

---

## Task 4: fixtures all-matches + LEAGUE_MAP + controller routes

**Files:**
- Modify: `apps/api/src/sports-data/sports-data-cache.service.ts`
- Modify: `apps/api/src/sports-data/services/fixtures.service.ts`
- Modify: `apps/api/src/sports-data/constants/season.constants.ts`
- Modify: `apps/api/src/sports-data/controllers/leagues.controller.ts`

- [ ] **Step 1: Add a cache key for all matches**

In `sports-data-cache.service.ts`, following the existing pattern, add:
```ts
  static leagueMatchesKey(leagueId: string): string {
    return `sports:leaguematches:${leagueId}`;
  }
```

- [ ] **Step 2: Add `getAllLeagueMatches` to fixtures.service**

`fixtures.service.ts` already has a private `normalizeFdoMatch(m)` (used at line ~86) and imports `FdoMatchesResponse`, `LEAGUE_MAP`, `TTL_FIXTURES`. Add this public method (no date window — needed so the bracket gets every knockout match):

```ts
  async getAllLeagueMatches(leagueId: string): Promise<MatchDto[]> {
    const cacheKey = SportsDataCacheService.leagueMatchesKey(leagueId);
    const cached = await this.cacheService.getCached<MatchDto[]>(cacheKey);
    if (cached) return cached;

    const mapping = LEAGUE_MAP[leagueId];
    if (!mapping) return [];

    const data = await this.fdoClient.get<FdoMatchesResponse>(
      `competitions/${mapping.fdoCode}/matches`,
    );
    const matches = (
      await Promise.all(data.matches.map((m) => this.normalizeFdoMatch(m)))
    ).sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );

    await this.cacheService.setCached(cacheKey, matches, TTL_FIXTURES);
    return matches;
  }
```
> Verify `normalizeFdoMatch` is the correct private method name by reading the file (it is called around line 86). If the helper has a different name, use that.

- [ ] **Step 3: Register the World Cup in LEAGUE_MAP**

In `constants/season.constants.ts`, add to `LEAGUE_MAP`:
```ts
  '1': { fdoCode: 'WC', name: 'FIFA World Cup' },
```
Leave the `LEAGUE_IDS` arrays in `fixtures.service.ts` / `standings.service.ts` unchanged (WC stays out of cron warmup).

- [ ] **Step 4: Add controller routes**

In `leagues.controller.ts`, add two routes (place near the other `:leagueId/*` getters):
```ts
  @Get(':leagueId/groups')
  async getGroups(
    @Param('leagueId') leagueId: string,
  ): Promise<StandingDto[]> {
    return this.standingsService.getGroupStandings(leagueId);
  }

  @Get(':leagueId/matches')
  async getMatches(
    @Param('leagueId') leagueId: string,
  ): Promise<MatchDto[]> {
    return this.fixturesService.getAllLeagueMatches(leagueId);
  }
```
(`StandingDto`, `MatchDto`, `standingsService`, `fixturesService` are already imported/injected.)

- [ ] **Step 5: Verify build + tests**

Run: `cd /home/quentin/pulseScore && npx tsc --noEmit -p apps/api/tsconfig.json && npm run test --workspace=apps/api`
Expected: no type errors; existing tests still pass.

- [ ] **Step 6: Commit (only if user authorized)**

```bash
git add apps/api/src/sports-data/sports-data-cache.service.ts apps/api/src/sports-data/services/fixtures.service.ts apps/api/src/sports-data/constants/season.constants.ts apps/api/src/sports-data/controllers/leagues.controller.ts
git commit -m "feat(api): add /groups and /matches routes + World Cup league mapping"
```

---

## Task 5: Frontend types, league config, stage-label helper

**Files:**
- Modify: `apps/web/src/lib/api-types.ts`
- Modify: `apps/web/src/lib/leagues.ts`
- Create: `apps/web/src/components/world-cup/stage-labels.ts`

- [ ] **Step 1: Extend web types**

In `api-types.ts`, in `ApiStanding` add after `form: string | null;`:
```ts
  group: string | null;
```
In `ApiMatch` add after `round: number | null;`:
```ts
  stage: string | null;
  group: string | null;
```

- [ ] **Step 2: Add `isCup` + World Cup entry**

In `leagues.ts`, add `isCup?: boolean;` to the `League` type (after `darkInvert?: boolean;`). Then add a new entry to the `LEAGUES` array (append after Ligue 1):
```ts
  {
    slug: 'fifa-world-cup',
    name: 'FIFA World Cup',
    country: 'World',
    countryCode: 'WORLD',
    logo: 'https://media.api-sports.io/football/leagues/1.png',
    isCup: true,
    apiFootballId: 1,
    fdoCode: 'WC',
    season: '2026',
  },
```

- [ ] **Step 3: Guard the flag lookup in LeagueLogo (if needed)**

Read `apps/web/src/components/feed/league-logo.tsx`. If it derives a flag image from `countryCode`, confirm an unknown code (`'WORLD'`) falls back to `league.logo` and does not throw / render a broken flag. If it would break, add a guard so cups use `league.logo`. If `LeagueLogo` already just renders `league.logo`, no change needed — note that in your report.

- [ ] **Step 4: Create the stage-label helper**

Create `apps/web/src/components/world-cup/stage-labels.ts`:
```ts
export const STAGE_LABELS: Record<string, string> = {
  GROUP_STAGE: 'Group Stage',
  LAST_16: 'Round of 16',
  QUARTER_FINALS: 'Quarter-finals',
  SEMI_FINALS: 'Semi-finals',
  THIRD_PLACE: 'Third place',
  FINAL: 'Final',
};

// Knockout columns, left-to-right.
export const KNOCKOUT_STAGES = [
  'LAST_16',
  'QUARTER_FINALS',
  'SEMI_FINALS',
  'FINAL',
] as const;

export function stageLabel(stage: string | null | undefined): string {
  if (!stage) return '';
  return STAGE_LABELS[stage] ?? stage;
}
```

- [ ] **Step 5: Verify**

Run: `cd /home/quentin/pulseScore && npm run lint`
Expected: PASS.

- [ ] **Step 6: Commit (only if user authorized)**

```bash
git add apps/web/src/lib/api-types.ts apps/web/src/lib/leagues.ts apps/web/src/components/world-cup/stage-labels.ts
git commit -m "feat(web): add World Cup league config, group/stage types, stage labels"
```

---

## Task 6: GroupStandings component

**Files:**
- Create: `apps/web/src/components/world-cup/group-standings.tsx`

- [ ] **Step 1: Create the component**

Groups the standings by `group`, sorts A→H, renders a compact table per group in a responsive grid.

```tsx
import Image from 'next/image';
import type { ApiStanding } from '@/lib/api-types';

function groupName(raw: string): string {
  // "GROUP_A" → "Group A"
  return raw.replace('GROUP_', 'Group ');
}

export function GroupStandings({ standings }: { standings: ApiStanding[] }) {
  if (standings.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Group standings will appear once the group stage begins.
      </p>
    );
  }

  const groups = new Map<string, ApiStanding[]>();
  for (const s of standings) {
    const key = s.group ?? 'Group';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }
  const sorted = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {sorted.map(([key, rows]) => (
        <div key={key} className="rounded-xl border border-border/60 bg-card p-3">
          <h3 className="mb-2 px-1 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {groupName(key)}
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[0.62rem] uppercase tracking-wide text-muted-foreground">
                <th className="py-1 pl-1 text-left font-semibold">Team</th>
                <th className="px-1 text-center font-semibold">P</th>
                <th className="px-1 text-center font-semibold">GD</th>
                <th className="px-1 text-center font-semibold">Pts</th>
              </tr>
            </thead>
            <tbody>
              {[...rows]
                .sort((a, b) => a.position - b.position)
                .map((r) => (
                  <tr key={r.teamId} className="border-t border-border/40">
                    <td className="flex items-center gap-2 py-1.5 pl-1">
                      <span className="w-4 text-center text-xs text-muted-foreground">
                        {r.position}
                      </span>
                      {r.teamBadge && (
                        <Image
                          src={r.teamBadge}
                          alt={r.teamName}
                          width={18}
                          height={18}
                          className="h-[18px] w-[18px] object-contain"
                          unoptimized
                        />
                      )}
                      <span className="truncate font-medium">{r.teamName}</span>
                    </td>
                    <td className="px-1 text-center tabular-nums text-muted-foreground">
                      {r.played}
                    </td>
                    <td className="px-1 text-center tabular-nums text-muted-foreground">
                      {r.goalsFor - r.goalsAgainst}
                    </td>
                    <td className="px-1 text-center font-bold tabular-nums">
                      {r.points}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify** — `cd /home/quentin/pulseScore && npm run lint` → PASS.

- [ ] **Step 3: Commit (only if user authorized)**

```bash
git add apps/web/src/components/world-cup/group-standings.tsx
git commit -m "feat(web): World Cup group standings component"
```

---

## Task 7: KnockoutBracket component

**Files:**
- Create: `apps/web/src/components/world-cup/knockout-bracket.tsx`

- [ ] **Step 1: Create the component**

Builds bracket columns from matches filtered to knockout stages. Each column is a stage; matches are cards. Baseline below is production-acceptable; Step 2 polishes it.

```tsx
import Image from 'next/image';
import type { ApiMatch } from '@/lib/api-types';
import { KNOCKOUT_STAGES, stageLabel } from './stage-labels';

function Side({ name, badge, score, won }: {
  name: string | null; badge: string | null; score: number | null; won: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-2 px-2 py-1 ${won ? 'font-bold' : ''}`}>
      <span className="flex min-w-0 items-center gap-1.5">
        {badge && (
          <Image src={badge} alt={name ?? ''} width={16} height={16} className="h-4 w-4 object-contain" unoptimized />
        )}
        <span className="truncate text-xs">{name ?? 'TBD'}</span>
      </span>
      <span className="tabular-nums text-xs text-muted-foreground">{score ?? '–'}</span>
    </div>
  );
}

function MatchCard({ match }: { match: ApiMatch }) {
  const homeWon = match.homeScore != null && match.awayScore != null && match.homeScore > match.awayScore;
  const awayWon = match.homeScore != null && match.awayScore != null && match.awayScore > match.homeScore;
  return (
    <div className="overflow-hidden rounded-lg border border-border/60 bg-card">
      <Side name={match.homeTeam?.name ?? null} badge={match.homeTeam?.logo ?? null} score={match.homeScore} won={homeWon} />
      <div className="border-t border-border/40" />
      <Side name={match.awayTeam?.name ?? null} badge={match.awayTeam?.logo ?? null} score={match.awayScore} won={awayWon} />
    </div>
  );
}

export function KnockoutBracket({ matches }: { matches: ApiMatch[] }) {
  const knockout = matches.filter((m) => m.stage && KNOCKOUT_STAGES.includes(m.stage as (typeof KNOCKOUT_STAGES)[number]));
  const thirdPlace = matches.filter((m) => m.stage === 'THIRD_PLACE');

  if (knockout.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        The bracket will be set once the group stage is complete.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-4 overflow-x-auto pb-2">
        {KNOCKOUT_STAGES.map((stage) => {
          const stageMatches = knockout
            .filter((m) => m.stage === stage)
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
          if (stageMatches.length === 0) return null;
          return (
            <div key={stage} className="flex min-w-[180px] flex-col justify-around gap-3">
              <h3 className="text-center text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                {stageLabel(stage)}
              </h3>
              {stageMatches.map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
            </div>
          );
        })}
      </div>
      {thirdPlace.length > 0 && (
        <div className="mx-auto w-full max-w-[220px]">
          <h3 className="mb-2 text-center text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {stageLabel('THIRD_PLACE')}
          </h3>
          {thirdPlace.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Polish with /impeccable**

Invoke the `/impeccable` skill targeting `apps/web/src/components/world-cup/knockout-bracket.tsx` to add the visual bracket tree treatment (connector lines between rounds, vertical centering of each match relative to its two feeders, a Final highlight, refined spacing). Keep the same props (`{ matches: ApiMatch[] }`) and the `stage-labels` helper. Keep the mobile fallback (horizontal scroll). Re-run `npm run lint` after.

- [ ] **Step 3: Verify** — `cd /home/quentin/pulseScore && npm run lint && npm run build --workspace=apps/web` → PASS.

- [ ] **Step 4: Commit (only if user authorized)**

```bash
git add apps/web/src/components/world-cup/knockout-bracket.tsx
git commit -m "feat(web): World Cup knockout bracket component"
```

---

## Task 8: WorldCupView shell

**Files:**
- Create: `apps/web/src/components/world-cup/world-cup-view.tsx`

- [ ] **Step 1: Create the tab-shell component**

Renders the tab nav (Groups · Bracket · Scorers · Results) and the active panel. Receives already-fetched data + active tab from the page. Mirrors the existing `[slug]` page's tab-nav styling.

```tsx
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { League } from '@/lib/leagues';
import type { ApiStanding, ApiMatch, ApiScorer } from '@/lib/api-types';
import { LeagueLogo } from '@/components/feed/league-logo';
import { ScorersBoard } from '@/components/scorers/scorers-board';
import { MatchHistory } from '@/components/matches/match-history';
import { GroupStandings } from './group-standings';
import { KnockoutBracket } from './knockout-bracket';

export type CupTab = 'groups' | 'bracket' | 'scorers' | 'results';

const TABS: { id: CupTab; label: string }[] = [
  { id: 'groups', label: 'Groups' },
  { id: 'bracket', label: 'Bracket' },
  { id: 'scorers', label: 'Scorers' },
  { id: 'results', label: 'Results' },
];

export function WorldCupView({
  league, slug, tab, groups, matches, scorers,
}: {
  league: League;
  slug: string;
  tab: CupTab;
  groups: ApiStanding[];
  matches: ApiMatch[];
  scorers: ApiScorer[];
}) {
  const finishedResults = matches
    .filter((m) => m.status === 'FINISHED')
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  return (
    <div className="mx-auto flex max-w-[900px] flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8">
      <Link
        href="/leagues"
        className="inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" />
        All leagues
      </Link>

      <header className="flex items-center gap-4">
        <LeagueLogo league={league} size={56} className="size-14" />
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {league.country} · {league.season}
          </p>
          <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            {league.name}
          </h1>
        </div>
      </header>

      <nav className="flex gap-1 rounded-xl border border-border/60 bg-card p-1">
        {TABS.map(({ id, label }) => (
          <Link
            key={id}
            href={`/leagues/${slug}?tab=${id}`}
            className={`flex-1 rounded-lg py-2 text-center text-sm font-semibold transition-colors ${
              tab === id
                ? 'bg-foreground text-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {tab === 'groups' && <GroupStandings standings={groups} />}
      {tab === 'bracket' && <KnockoutBracket matches={matches} />}
      {tab === 'scorers' && <ScorersBoard scorers={scorers} league={league} />}
      {tab === 'results' && (
        <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-6">
          <MatchHistory matches={finishedResults} emptyMessage="No matches played yet." />
        </div>
      )}
    </div>
  );
}
```
> Verify `ScorersBoard` and `MatchHistory` prop shapes by reading their files (`scorers-board.tsx` takes `{ scorers, league }`; `match-history.tsx` takes `{ matches, emptyMessage?, groupByRound?, teamId? }`). Adjust the calls if the real props differ.

- [ ] **Step 2: Verify** — `cd /home/quentin/pulseScore && npm run lint` → PASS.

- [ ] **Step 3: Commit (only if user authorized)**

```bash
git add apps/web/src/components/world-cup/world-cup-view.tsx
git commit -m "feat(web): World Cup view shell with Groups/Bracket/Scorers/Results tabs"
```

---

## Task 9: Wire WorldCupView into the leagues page

**Files:**
- Modify: `apps/web/src/app/leagues/[slug]/page.tsx`

- [ ] **Step 1: Add imports**

Add:
```tsx
import { WorldCupView, type CupTab } from '@/components/world-cup/world-cup-view';
```
(`ApiStanding`, `ApiMatch`, `ApiScorer`, `apiFetch`, `LEAGUES` are already imported.)

- [ ] **Step 2: Insert the cup branch**

In `LeagueSlugPage`, after the line `if (!league) notFound();` and BEFORE the existing `const tab: Tab = ...` resolution, insert:

```tsx
  if (league.isCup) {
    const cupTab: CupTab =
      rawTab === 'bracket' || rawTab === 'scorers' || rawTab === 'results'
        ? rawTab
        : 'groups';

    const [groupsResult, matchesResult, scorersResult] = await Promise.allSettled([
      cupTab === 'groups'
        ? apiFetch<ApiStanding[]>(`/leagues/${league.apiFootballId}/groups`)
        : Promise.resolve([] as ApiStanding[]),
      cupTab === 'bracket' || cupTab === 'results'
        ? apiFetch<ApiMatch[]>(`/leagues/${league.apiFootballId}/matches`)
        : Promise.resolve([] as ApiMatch[]),
      cupTab === 'scorers'
        ? apiFetch<ApiScorer[]>(`/leagues/${league.apiFootballId}/scorers`)
        : Promise.resolve([] as ApiScorer[]),
    ]);

    return (
      <WorldCupView
        league={league}
        slug={slug}
        tab={cupTab}
        groups={groupsResult.status === 'fulfilled' ? groupsResult.value : []}
        matches={matchesResult.status === 'fulfilled' ? matchesResult.value : []}
        scorers={scorersResult.status === 'fulfilled' ? scorersResult.value : []}
      />
    );
  }
```
> `rawTab` and `slug` are already destructured from `params`/`searchParams` earlier in the function. Confirm those variable names match (the file destructures `{ tab: rawTab, round: roundParam }` and `{ slug }`).

- [ ] **Step 3: Verify** — `cd /home/quentin/pulseScore && npm run lint && npm run build --workspace=apps/web` → PASS. Confirm `/leagues/fifa-world-cup` is generated.

- [ ] **Step 4: Commit (only if user authorized)**

```bash
git add "apps/web/src/app/leagues/[slug]/page.tsx"
git commit -m "feat(web): route World Cup league slug to WorldCupView"
```

---

## Task 10: Full verification

- [ ] **Step 1: API tests** — `cd /home/quentin/pulseScore && npm run test --workspace=apps/api` → all PASS.

- [ ] **Step 2: Web build** — `cd /home/quentin/pulseScore && npm run lint && npm run build --workspace=apps/web` → PASS, route `/leagues/[slug]` present.

- [ ] **Step 3: Manual** — start stack (`docker-compose up -d postgres redis && npm run dev`), open `http://localhost:3000/leagues/fifa-world-cup`:
  - Groups tab: 8 group tables, or the empty-state message pre-tournament.
  - Bracket tab: bracket columns (or the "set once group stage complete" placeholder pre-tournament).
  - Scorers tab: scorers board (or its empty state).
  - Results tab: finished matches (or "No matches played yet.").
  - The WC card appears at `/leagues`. No console errors.

- [ ] **Step 4: Cross-check non-cup leagues unaffected** — open a normal league (e.g. `/leagues/england-premier-league`); all existing tabs work exactly as before.

---

## Self-review notes

- **Spec coverage:** interfaces/DTOs (T1), normalizer stage/group (T2), getGroupStandings (T3), all-matches + LEAGUE_MAP + routes (T4), web types/config/labels (T5), groups UI (T6), bracket UI (T7), view shell (T8), page wiring (T9), verification (T10). All spec sections mapped. Added `/matches` (all matches) beyond the spec because the existing ±30-day fixtures/results endpoints would truncate the bracket — documented in the architecture note.
- **Type consistency:** `getGroupStandings`/`getAllLeagueMatches` names match between service, controller, and tests. `normalizeStanding` 5th param `group: string | null = null` is back-compatible with the existing `getStandingsFdo` caller (which omits it). `CupTab` union (`groups|bracket|scorers|results`) consistent across `world-cup-view.tsx` and `page.tsx`. `stageLabel`/`KNOCKOUT_STAGES` defined in T5, consumed in T7/T8.
- **No DB seeding:** group standings and matches resolve via FDO with null fallbacks; consistent with `getStandingsFdo` behavior.
- **Known limitation (from spec):** national-team `/teams/[id]` pages may be sparse — out of scope; bracket/group badges are non-links in the baseline components (acceptable).
