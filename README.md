# PulseScore Arena

**Plateforme de scores sportifs en temps réel** — Real-time sports scores platform.

> Live scores, leaderboards, and fan prediction games powered by WebSocket, Redis Pub/Sub, and an event-driven architecture.

---

## Stack

| Layer | Technology |
|---|---|
| Backend | NestJS 11 + TypeScript (strict) |
| Frontend | Next.js 16 + Tailwind CSS |
| Database | PostgreSQL 16 via Prisma 7 ORM |
| Cache / Realtime | Redis 7 (Sorted Sets + Pub/Sub) |
| Infrastructure | Docker Compose + GitHub Actions CI |

---

## Prerequisites

- **Docker** ≥ 24 and **Docker Compose** plugin
- **Node.js** ≥ 22 (for local development outside Docker)
- **npm** ≥ 10

---

## Getting started

### 1. Clone the repository

```bash
git clone https://github.com/your-org/pulsescore.git
cd pulsescore
```

### 2. Configure environment variables

```bash
cp .env.example .env
# Edit .env and set your values (DATABASE_URL, REDIS_URL, etc.)
```

### 3. Start infrastructure services (PostgreSQL + Redis)

```bash
docker compose up -d postgres redis
```

Wait for both to be healthy:

```bash
docker compose ps   # STATUS should show "(healthy)"
```

### 4. Install dependencies and run Prisma migrations

```bash
npm install                                    # root workspace
npm install --workspace=apps/api               # API deps
npm install --workspace=apps/web               # Web deps

# Generate Prisma client and run initial migration
cd apps/api
DATABASE_URL=postgresql://pulsescore:pulsescore@localhost:5432/pulsescore \
  npx prisma migrate dev --name init
cd ../..
```

### 5. Start the development servers

```bash
npm run dev
```

Or start each app individually:

```bash
# API on http://localhost:3001
npm run start:dev --workspace=apps/api

# Web on http://localhost:3000
npm run dev --workspace=apps/web
```

### 6. Start everything with Docker Compose (full stack)

```bash
docker compose up --build
```

---

## Accessing services

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API | http://localhost:3001 |
| Health check | http://localhost:3001/health |
| Prisma Studio | `npx prisma studio` (from `apps/api/`) |
| PostgreSQL | `localhost:5432` (user: pulsescore, db: pulsescore) |
| Redis | `localhost:6379` |

---

## Project structure

```
pulseScore/
├── apps/
│   ├── api/                # NestJS backend
│   │   ├── src/
│   │   │   ├── app.module.ts
│   │   │   ├── main.ts
│   │   │   ├── health/     # GET /health endpoint (DB + Redis checks)
│   │   │   ├── prisma/     # PrismaService + PrismaModule
│   │   │   └── redis/      # RedisService + RedisModule
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── prisma.config.ts  # Prisma 7 config (datasource URL)
│   │   └── Dockerfile
│   └── web/                # Next.js 16 frontend
│       ├── src/app/
│       │   ├── layout.tsx
│       │   └── page.tsx
│       └── Dockerfile
├── docker-compose.yml
├── .env.example
├── .github/workflows/ci.yml
└── package.json            # npm workspaces root
```

---

## Available scripts (root)

```bash
npm run dev                 # Start both API and web in watch mode
npm run build               # Production build for both apps
npm run lint                # Lint both apps
npm run test                # Run API unit tests
npm run prisma:generate     # Regenerate Prisma client
npm run prisma:migrate:dev  # Create + apply a new migration
npm run prisma:migrate:deploy  # Apply pending migrations (production)
```

---

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push to `main` and on pull requests:

1. Spins up PostgreSQL 16 and Redis 7 service containers
2. Installs dependencies
3. Generates Prisma client and runs migrations
4. Lints both apps
5. Builds both apps
6. Runs API unit tests

---

## Roadmap

- [ ] **Feature 2** — WebSocket gateway (Socket.io + Redis Pub/Sub for score fan-out)
- [ ] **Feature 3** — Sports data ingestion (TheSportsDB / API-Sports integration)
- [ ] **Feature 4** — Leaderboards (Redis Sorted Sets ZADD / ZREVRANGE)
- [ ] **Feature 5** — Fan prediction mini-game
- [ ] **Feature 6** — Admin dashboard (engagement metrics)
- [ ] **Feature 7** — Authentication (JWT + Refresh tokens)
- [ ] **Feature 8** — Deploy to Railway / Fly.io

---

*PulseScore Arena — open-source sports fan engagement platform.*
