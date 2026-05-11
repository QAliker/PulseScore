# Football-Data.org Integration Design

**Date:** 2026-05-11  
**Status:** Approved

## Context

API-Football (RapidAPI) covers historical seasons (2022–2024). football-data.org covers the current season (2025/26 onwards). Services route to the correct source based on `getCurrentSeason()`.

## Season Routing

```ts
// Dynamic — no hardcoded year
export function getCurrentSeason(): number {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = month >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return year; // e.g. 2025 for the 2025/26 season
}

export const HISTORY_SEASON_RAF = 2024; // last season available on API-Football free plan
```

Rule: `getCurrentSeason() >= 2025` → FDO. `season <= 2024` → API-Football.

## League ID Mapping

```ts
export const LEAGUE_MAP: Record<string, { fdoCode: string; name: string }> = {
  '39':  { fdoCode: 'PL',  name: 'Premier League' },
  '140': { fdoCode: 'PD',  name: 'La Liga' },
  '78':  { fdoCode: 'BL1', name: 'Bundesliga' },
  '135': { fdoCode: 'SA',  name: 'Serie A' },
  '61':  { fdoCode: 'FL1', name: 'Ligue 1' },
  '40':  { fdoCode: 'ELC', name: 'Championship' },
};
```

## DB Migration

Two nullable unique columns added to Prisma schema:

```prisma
model League {
  fdoExternalId String? @unique
}

model Team {
  fdoExternalId String? @unique
}
```

## New Files

### `client/football-data-org.client.ts`
Injectable NestJS service. Auth via `X-Auth-Token` header using `FOOTBALL_DATA_ORG_KEY` env var. Base URL: `https://api.football-data.org/v4/`. Single `get<T>()` method returning parsed JSON directly (FDO does not wrap in `response[]`).

### `interfaces/football-data-org.interfaces.ts`
TypeScript interfaces for FDO responses:
- `FdoMatch` — match detail with `status`, `utcDate`, `homeTeam`, `awayTeam`, `score`, `matchday`
- `FdoTeam` — `id`, `name`, `crest`
- `FdoScore` — `fullTime: { home, away }`, `halfTime: { home, away }`
- `FdoStanding` — `position`, `team`, `playedGames`, `won`, `draw`, `lost`, `goalsFor`, `goalsAgainst`, `points`
- `FdoCompetitionTeamsResponse` — `{ teams: FdoTeam[] }`
- `FdoMatchesResponse` — `{ matches: FdoMatch[] }`
- `FdoStandingsResponse` — `{ standings: [{ table: FdoStanding[] }] }`

### `normalizer/football-data-org.normalizer.ts`
Injectable NestJS service. Maps FDO types → existing DTOs (`MatchDto`, `StandingDto`, `TeamDto`). For team/league IDs, resolves `fdoExternalId` against DB to return internal DB IDs — ensures navigation links are consistent across seasons.

Injects `PrismaService` to resolve `fdoExternalId → internal DB id` internally.

```ts
normalizeStatus(status: string): MatchDto['status']
normalizeMatch(raw: FdoMatch): Promise<MatchDto>   // does DB lookup by fdoExternalId internally
normalizeStanding(raw: FdoStanding, leagueId: string, leagueName: string): StandingDto
```

If `fdoExternalId` has no DB match, normalizer falls back to `String(fdoTeam.id)` as the entity ID (no DB write). Data is still returned, but team detail navigation may 404 until seeding catches up.

## Services Updated

| Service | Change |
|---|---|
| `FixturesService` | `getFixtures`, `getMatchById`, `getTeamFixtures`, `getTeamResults`, `getLeagueFixtures`, `getLeagueResults` route to FDO for current season |
| `StandingsService` | `getStandings` routes to FDO for current season; cron refreshes both sources |
| `LivescoreService` | Live matches always use FDO (current season only) |
| `TeamsService` | Team detail + team matches route to FDO for current season |
| `H2hService` | Uses FDO `matches/{id}/head2head` for current season matches |

### Services NOT updated (FDO free tier lacks these)
`InjuriesService`, `PredictionsService`, `OddsService`, `TransfersService`, `TrophiesService`, `PlayersService`, `CoachesService` — remain on API-Football only.

## WarmupService — FDO Seeding

New `seedFdoIds()` method runs at startup (after existing warm-up). Only runs for entities where `fdoExternalId IS NULL`.

Steps per league:
1. Update `League.fdoExternalId` from `LEAGUE_MAP`
2. Fetch `/v4/competitions/{fdoCode}/teams` from FDO
3. For each FDO team, `updateMany` on DB teams matching by name → set `fdoExternalId`

If name match fails, team stays `fdoExternalId: null`. Normalizer handles this by creating a minimal team record rather than throwing.

## Web — `apps/web/src/lib/leagues.ts`

Add `fdoCode: string` to `League` type. Replace hardcoded `season: '2024/25'` with dynamic computation:

```ts
function getCurrentSeasonLabel(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = month >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}/${String(year + 1).slice(2)}`; // "2025/26"
}
```

## Module

`FootballDataOrgClient` and `FootballDataOrgNormalizer` registered as providers in `SportsDataModule`. Injected into the five updated services alongside existing `ApiFootballClient`.
