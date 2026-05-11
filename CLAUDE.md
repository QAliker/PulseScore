## Commands

```bash
# Dev (both apps)
npm run dev

# Dev (web only)
npm run dev:front

# Build
npm run build

# Lint
npm run lint

# Test (API only — Jest)
npm run test

# DB
npm run prisma:migrate:dev
npm run prisma:generate
```

## Architecture

Monorepo (npm workspaces):
- `apps/api` — NestJS 11 backend, port 3001
- `apps/web` — Next.js 16 frontend, port 3000

Infra: PostgreSQL (5432) + Redis (6379) via Docker

## Environment

Root `.env` (loaded by API via `../../.env`):
- `DATABASE_URL`
- `REDIS_URL`
- `RAPIDAPI_KEY` — API-Football v3 (RapidAPI)
- `FDO_API_KEY` — Football-Data.org
- `NEXT_PUBLIC_API_URL=http://localhost:3001`
- `APIFOOTBALL_TIMEZONE=Europe/Paris`

## Local Dev Setup

```bash
docker-compose up -d postgres redis
npm run prisma:migrate:dev
npm run dev
```
