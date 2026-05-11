## Stack

NestJS 11 · Prisma 7 · PostgreSQL · Redis · TypeScript

## Commands

```bash
npm run dev              # nest start --watch, port 3001
npm run test             # jest
npm run test:e2e         # jest --config test/jest-e2e.json
npm run prisma:studio    # DB GUI
```

## External APIs

Two clients in `src/sports-data/client/`:
- `ApiFootballClient` — API-Football v3 via RapidAPI (`RAPIDAPI_KEY`)
- `FootballDataOrgClient` — football-data.org (`FDO_API_KEY`)

League IDs (RAF → FDO): PL=39/PL, La Liga=140/PD, Bundesliga=78/BL1, Serie A=135/SA, Ligue 1=61/FL1, Championship=40/ELC

## Gotchas

- `.env` loaded from `../../.env` (monorepo root, not `apps/api/.env`)
- `getCurrentSeason()` switches season year in August
- Redis cache wraps all external API calls via `SportsDataCacheService`
