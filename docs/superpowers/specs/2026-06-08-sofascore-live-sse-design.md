# Sofascore Live Poller + SSE Stream — Design

**Date:** 2026-06-08
**Status:** Approved (design), pending implementation plan

## Goal

Real-time live football scores in the app, free of charge. Football-Data.org's
free tier delays scores (live = paid €12/mo) and API-Football's free tier is
100 req/day (unusable for polling). Solution: poll Sofascore's unofficial public
JSON API server-side once per interval and fan results out to all browsers over
Server-Sent Events (SSE).

## Constraints & Decisions

- **Source:** Sofascore unofficial API — `GET https://api.sofascore.com/api/v1/sport/football/events/live`.
  One call returns every live football match across all competitions.
- **Poll cadence:** 30s. This is the Cloudflare-safe floor (faster risks 503/ban).
  Always-on (1 call/30s) — keeps the Redis snapshot warm for the plain GET too.
- **Scope:** display *everything* — all live leagues, no allow-list filtering.
- **Grouping:** by country → league name (Sofascore `category` + `tournament`),
  not the existing apiFootball slug map. Sofascore IDs don't match the DB.
- **Detail links:** live items are NOT clickable in v1 (Sofascore match IDs don't
  resolve to the api-football detail routes). Mapping deferred.
- **Live source role:** Sofascore *replaces* the Football-Data.org livescore path.
  FDO live fetch in `livescore.service.ts` is retired.
- **Stream fields:** basic only — score, status, minute, teams, league.
  `goalscorers`/`cards`/`lineups` left empty (per-match incident calls would be
  N extra requests per tick = ban risk).
- **ToS:** unofficial/scraped endpoint. Acceptable for a personal/portfolio
  project; not for commercial/monetized use. Adapter layer isolates the source so
  it can be swapped if it breaks.

## Architecture

Single server-side poller, in-memory fan-out:

```
@Interval(30s)
  → SofascoreClient.getLive()        (fetch w/ browser headers)
  → SofascoreNormalizer.toMatchDtos  (event[] → MatchDto[])
  → Redis SET sports:live (snapshot) + Subject<MatchDto[]>.next(snapshot)
                                              │
        ┌─────────────────────────────────────┴───────────────┐
GET /livescore/stream  (@Sse)                      GET /livescore (existing)
  startWith(snapshot) + Subject                      reads Redis snapshot
  → MessageEvent(MatchDto[])
        │
   frontend EventSource
  → apiMatchesToMatches → useLiveScores → LiveFeed (+ goal flashes, badge)
```

- One poller serves all SSE clients and the plain GET — clients never hit
  Sofascore directly.
- Fan-out via an in-memory RxJS `Subject`. Redis pub/sub (multi-instance scaling)
  is deferred — YAGNI for a single instance.
- The Redis snapshot (`sports:live`, existing key, `TTL_LIVE = 30`) is the single
  source of truth shared by stream and GET.

## Components

### Backend — new files (`apps/api/src/sports-data/`)

**`client/sofascore.client.ts`** — `SofascoreClient`
- `getLive(): Promise<SofascoreLiveResponse>` — `fetch` to
  `https://api.sofascore.com/api/v1/sport/football/events/live`.
- Headers: realistic `User-Agent`, `Referer: https://www.sofascore.com/`,
  `Accept: application/json`.
- 503/429 → throw (caller keeps last snapshot). Mirrors `FootballDataOrgClient`
  error style.

**`interfaces/sofascore.interfaces.ts`**
- `SofascoreEvent` (id, tournament{name, category{name, flag, country?}},
  homeTeam{name, shortName, ...}, awayTeam, homeScore{current}, awayScore{current},
  status{code, description, type}, startTimestamp, time?).
- `SofascoreLiveResponse { events: SofascoreEvent[] }`.

**`normalizer/sofascore.normalizer.ts`** — `SofascoreNormalizer`
- `toMatchDtos(res): MatchDto[]` mapping each event:
  - `id` / `externalId` = `sofa:${event.id}`.
  - `status`: `status.type` `inprogress`→`LIVE`, `finished`→`FINISHED`,
    `canceled`/`postponed`→`CANCELLED`/`POSTPONED`, else `SCHEDULED`.
  - `progress`: minute string derived from period timestamps / `status.description`
    (e.g. `"45"`, `"90+3"`, `"Half Time"`); `null` when not live.
  - `homeScore`/`awayScore` = `*Score.current ?? null`.
  - `league` (`LeagueDto`): `externalId: sofa:tournament:${tournamentId}`,
    `name: tournament.name`, `country: category.name`, `sport: 'Football'`,
    `logo: null`.
  - `homeTeam`/`awayTeam` (`TeamDto`): `externalId: sofa:team:${id}`, `name`, `logo: null`.
  - `sport: 'Football'`; `goalscorers`/`cards`/`substitutions`/`statistics` = `[]`;
    `lineups: null`; `venue`/`round`/`stage`/`group`/`winner` = `null`.

**`services/live-stream.service.ts`** — `LiveStreamService`
- Owns `@Interval(30000)` poll loop: client → normalizer → Redis write +
  `Subject.next(snapshot)`.
- On poll error: log warn, keep last good snapshot (no Subject emit of empty).
- `snapshot(): Promise<MatchDto[]>` — current Redis snapshot (or `[]`).
- `stream(): Observable<MatchDto[]>` — `Subject` for live ticks.

### Backend — changes

- **`services/livescore.service.ts`** — remove FDO fetch loop; `getCurrent()`
  returns `LiveStreamService.snapshot()`.
- **`controllers/livescore.controller.ts`** — add
  `@Sse('stream') stream(): Observable<MessageEvent>` =
  `merge(defer(snapshot), liveStream.stream())` mapped to `{ data: matches }`.
  (Connect → immediate snapshot, then every tick.)
- **`sports-data.module.ts`** — provide `SofascoreClient`, `SofascoreNormalizer`,
  `LiveStreamService`.

### Frontend — changes (`apps/web/src`)

- **`hooks/use-socket.ts`** — uncomment EventSource block. Connect to
  `${API_URL}/livescore/stream`; `onopen`→`live`, `onerror`→`reconnecting`+retry
  after 3s. (Code already written, just disabled.)
- **`hooks/use-live-scores.ts`** — uncomment socket `subscribe` + goal-flash diff
  block (replaces the `status = 'offline'` placeholder).
- **`components/app/live-connection-badge.tsx`** — read real status from
  `useSocket` instead of hardcoded `live`.

No change needed to `api-match-map.ts` / `MatchDto` shape — backend already emits
the exact `ApiMatch` shape the mapper consumes. Sofascore matches map to
`leagueSlug: 'unknown'` (no apiFootballId), which only affects the (currently
unrendered) grouped list; the featured carousel reads `leagueName`/`country` from
`m.league` directly.

## Error Handling

- Poll fail (503/429/network) → log warn, retain last good Redis snapshot; next
  tick retries. Badge stays `live` until the EventSource itself drops, then
  `reconnecting` and auto-retry every 3s (already implemented).
- Empty live slate → empty array, not an error.
- Minute parsing failure → `progress: null` (treated as no minute), never throws.

## Testing (Jest, `apps/api`)

- **`SofascoreNormalizer`** — status mapping (each `status.type`), minute string
  (regular, stoppage `90+3`, half-time, not-live → null), empty incident arrays,
  null scores. Mock fixture event payload.
- **`LiveStreamService`** — poll writes snapshot to Redis + emits on Subject;
  poll error keeps previous snapshot and does not emit; `snapshot()`/`stream()`
  return correct values. Mock `SofascoreClient` + `RedisService`.

## Out of Scope (deferred)

- Redis pub/sub fan-out (multi-instance horizontal scaling).
- Sofascore → DB match mapping for clickable detail / lineups in live items.
- Per-match incidents (goalscorers/cards) in the live stream.
- Poll gating on active-subscriber count.
- Non-football sports.
