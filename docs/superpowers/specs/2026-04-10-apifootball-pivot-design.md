# Sports-Data Module: Pivot to APIFootball.com v3

**Date:** 2026-04-10
**Status:** Approved

## Context

PulseScore's `sports-data` module currently uses TheSportsDB as its data source. TheSportsDB's free tier does not include livescore, which is the core feature for a real-time sports scores platform. APIFootball.com provides livescore (all leagues) on its free tier, along with rich match data (goals, cards, lineups, statistics, odds).

## Free Tier Scope

**Data endpoints (HTTP):** England Championship, France Ligue 2
**Livescore (WebSocket):** All leagues
**Available features:** Livescore, Live Events (goals/cards/lineups/stats), Teams, Players, Results, Fixtures, Standings, H2H, Odds (1x2, BTS, O/U, AH, 65+ bookmakers)

## Architecture

### Layer Separation (Pattern C)

A low-level HTTP/WebSocket client handles infrastructure concerns (auth, rate-limit, errors, reconnection). Domain services sit on top and contain business logic.

```
ApiFootballClient (infra)
  ├── HTTP: auth, throttle (180 req/h), error handling
  └── WebSocket: wss://wss.apifootball.com/livescore, auto-reconnect
       ↓
Domain Services (business logic)
  ├── LivescoreService      → WebSocket push, change detection, DB upsert
  ├── FixturesService       → results & upcoming matches
  ├── StandingsService      → league tables
  ├── TeamsService           → teams + players
  ├── OddsService            → betting odds (cache only)
  └── H2hService             → head-to-head (cache only)
```

### File Structure

```
sports-data/
├── client/
│   └── api-football.client.ts          # HTTP + WebSocket client
├── services/
│   ├── livescore.service.ts            # WebSocket livescore + change detection
│   ├── fixtures.service.ts             # Results & upcoming matches
│   ├── standings.service.ts            # League standings
│   ├── teams.service.ts                # Teams + players
│   ├── odds.service.ts                 # Odds (Redis cache only)
│   └── h2h.service.ts                  # Head-to-head (Redis cache only)
├── normalizer/
│   └── api-football.normalizer.ts      # Raw API responses → DTOs
├── interfaces/
│   └── api-football.interfaces.ts      # Raw API response types
├── dto/
│   ├── match.dto.ts                    # Updated for APIFootball fields
│   ├── league.dto.ts
│   ├── team.dto.ts
│   ├── livescore.dto.ts
│   ├── standing.dto.ts                 # NEW
│   ├── player.dto.ts                   # NEW
│   ├── odds.dto.ts                     # NEW
│   └── h2h.dto.ts                      # NEW
├── sports-data-cache.service.ts        # Redis cache (extended keys/TTLs)
├── sports-data.module.ts               # NestJS module
└── __tests__/
    ├── api-football.client.spec.ts
    ├── api-football.normalizer.spec.ts
    ├── livescore.service.spec.ts
    ├── fixtures.service.spec.ts
    ├── standings.service.spec.ts
    ├── teams.service.spec.ts
    ├── odds.service.spec.ts
    └── h2h.service.spec.ts
```

## Storage Strategy (Hybrid)

### Prisma (persistent)

| Model | Purpose |
|-------|---------|
| Match | Core match data, scores, status |
| MatchEvent | Goals, cards, substitutions (history) |
| League | Championship, Ligue 2 metadata |
| Team | Team info, badges |
| Standing (NEW) | League table positions |
| Player (NEW) | Player profiles and season stats |

### Redis (ephemeral cache)

| Key Pattern | TTL | Purpose |
|-------------|-----|---------|
| `odds:{match_id}` | 5 min | Betting odds |
| `h2h:{team1}:{team2}` | 1 hour | Head-to-head history |
| `lineups:{match_id}` | Match duration | Match lineups |
| `statistics:{match_id}` | Match duration | Match statistics |

## New Prisma Models

### Standing

```prisma
model Standing {
  id           String   @id @default(cuid())
  leagueId     String
  league       League   @relation(fields: [leagueId], references: [id])
  teamId       String
  team         Team     @relation(fields: [teamId], references: [id])
  position     Int
  played       Int      @default(0)
  won          Int      @default(0)
  drawn        Int      @default(0)
  lost         Int      @default(0)
  goalsFor     Int      @default(0)
  goalsAgainst Int      @default(0)
  points       Int      @default(0)
  season       String
  updatedAt    DateTime @updatedAt
  @@unique([leagueId, teamId, season])
  @@map("standings")
}
```

### Player

```prisma
model Player {
  id            String   @id @default(cuid())
  externalId    String   @unique
  name          String
  image         String?
  number        Int?
  position      String?
  age           Int?
  teamId        String?
  team          Team?    @relation(fields: [teamId], references: [id])
  goals         Int      @default(0)
  assists       Int      @default(0)
  yellowCards   Int      @default(0)
  redCards      Int      @default(0)
  matchesPlayed Int      @default(0)
  rating        String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  @@map("players")
}
```

## API Client Details

### HTTP

- **Base URL:** `https://apiv3.apifootball.com/`
- **Auth:** Query param `APIkey` from env `APIFOOTBALL_API_KEY`
- **Rate limit:** 180 req/h → internal throttle ~20s between requests
- **Method:** Single `get(action: string, params: Record<string, string>)` method

### WebSocket

- **URL:** `wss://wss.apifootball.com/livescore?APIkey=xxx`
- **Reconnection:** Exponential backoff (1s, 2s, 4s, 8s... max 60s)
- **Heartbeat:** Periodic ping to detect stale connections

## Data Refresh Strategy

| Data | Method | Frequency |
|------|--------|-----------|
| Livescore | WebSocket push | Real-time |
| Standings | HTTP CRON | Every 6 hours |
| Teams/Players | HTTP CRON | Once per day |
| Fixtures | HTTP CRON | Every 6 hours |
| Odds | HTTP on-demand | When requested (cache 5min) |
| H2H | HTTP on-demand | When requested (cache 1h) |

## Normalizer Mappings

Key field mappings from APIFootball raw responses to DTOs:

| APIFootball field | DTO field |
|-------------------|-----------|
| `match_id` | `externalId` |
| `match_status` ("Finished", "Half Time", "45'") | `status` (SCHEDULED/LIVE/FINISHED/CANCELLED/POSTPONED) |
| `match_hometeam_score` | `homeScore` |
| `match_awayteam_score` | `awayScore` |
| `match_hometeam_name` | `homeTeam.name` |
| `match_awayteam_name` | `awayTeam.name` |
| `team_home_badge` | `homeTeam.logo` |
| `team_away_badge` | `awayTeam.logo` |
| `league_id` | `league.externalId` |
| `league_name` | `league.name` |
| `match_date` + `match_time` | `startTime` (Date) |
| `match_round` | `round` |
| `match_stadium` | `venue` |
| `goalscorer[]` | `MatchEvent[]` (type: GOAL) |
| `cards[]` | `MatchEvent[]` (type: YELLOW_CARD/RED_CARD) |
| `substitutions{}` | `MatchEvent[]` (type: SUBSTITUTION) |

## Environment Variables

```
APIFOOTBALL_API_KEY=xxx          # replaces THESPORTSDB_API_KEY
APIFOOTBALL_TIMEZONE=Europe/Paris
```

## Files to Delete (TheSportsDB)

- `sports-data.service.ts` (replaced by client + services)
- `sports-data-poller.service.ts` (replaced by livescore.service.ts + CRON services)
- `sports-data-normalizer.service.ts` (replaced by normalizer/)
- `interfaces/thesportsdb.interfaces.ts` (replaced by interfaces/)
- `sports-data-normalizer.service.spec.ts`
- `sports-data-poller.service.spec.ts`
