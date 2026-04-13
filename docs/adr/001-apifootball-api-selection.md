# ADR-001: APIFootball.com as Primary Sports Data Provider

**Status:** Accepted
**Date:** 2026-04-10

## Context

PulseScore needs a free-tier sports data API that provides:
- Live scores (real-time or near-real-time)
- Match fixtures, results, standings
- Team and player data
- Head-to-head and odds data

We evaluated several options:
- **TheSportsDB** — No livescore on free tier
- **Football-Data.org** — No livescore endpoint at all
- **API-Football (rapidapi)** — Only 100 requests/day on free tier
- **APIFootball.com v3** — 180 req/hour, free WebSocket livescore for all leagues

## Decision

Use **APIFootball.com v3** (`https://apiv3.apifootball.com/`) as the primary data provider.

### Free Tier Coverage
- **Leagues:** England Championship (league_id `152`), France Ligue 2 (league_id `168`)
- **Livescore:** WebSocket (`wss://wss.apifootball.com/livescore`) for ALL leagues (no quota consumed)
- **Endpoints:** Live Events, Teams, Players, Results, Fixtures, Standings, H2H, Odds (1x2, BTS, O/U, AH)
- **Rate limit:** 180 requests/hour

### Architecture
- Pattern C: Low-level `ApiFootballClient` (HTTP + WebSocket) + domain services (Livescore, Fixtures, Standings, Teams, Odds, H2H)
- Hybrid storage: Prisma DB for persistent data (matches, teams, standings, players) + Redis cache for ephemeral data (odds 5min, H2H 1h, lineups/statistics 3h)
- CRON refresh: Standings/Fixtures every 6h, Teams/Players daily at 3 AM
- On-demand with cache: Odds, H2H

## Consequences

- Free tier limits us to Championship and Ligue 2 for fixture/standing/team data
- Livescore covers all leagues via WebSocket (no API quota impact)
- 180 req/hour budget is sufficient with CRON schedules and aggressive caching
- Upgrading to a paid plan unlocks all leagues for all endpoints
