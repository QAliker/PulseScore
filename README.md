# PulseScore Arena

**Plateforme de scores sportifs en temps réel** — Real-time football scores platform.

> Live scores, classements, compositions, statistiques joueurs et historique de matchs, alimentés par une architecture event-driven (NestJS + Redis) et plusieurs sources de données football.

---

## Stack

| Layer | Technology |
|---|---|
| Backend | NestJS 11 + TypeScript (strict) |
| Frontend | Next.js 16 + React + Tailwind CSS |
| Database | PostgreSQL 16 via Prisma 7 ORM |
| Cache | Redis 7 (ioredis) — cache TTL par type de donnée |
| Scheduling | `@nestjs/schedule` (cron de warmup pour limiter le rate-limit) |
| Infrastructure | Docker Compose + GitHub Actions CI |

### Sources de données football

| Source | Usage |
|---|---|
| **API-Football v3** (`API_FOOTBALL_KEY`) | Source principale : fixtures, standings, joueurs, équipes, coaches, transferts, blessures, cotes, prédictions, H2H. Accès direct `v3.football.api-sports.io` (header `x-apisports-key`), pas via RapidAPI |
| **Football-Data.org** (`FOOTBALL_DATA_ORG_KEY`) | Livescores du jour (`LivescoreService`) |
| **ESPN** (client public) | Données complémentaires |
| **TheSportsDB** | Photos joueurs / lineups |

---

## Prerequisites

- **Docker** ≥ 24 et le plugin **Docker Compose**
- **Node.js** ≥ 22 (dév local hors Docker)
- **npm** ≥ 10

---

## Getting started

### 1. Cloner et configurer l'environnement

```bash
git clone https://github.com/your-org/pulsescore.git
cd pulsescore
cp .env.example .env
# Éditer .env : DATABASE_URL, REDIS_URL, API_FOOTBALL_KEY, FOOTBALL_DATA_ORG_KEY
```

### 2. Démarrer l'infra (PostgreSQL + Redis)

```bash
docker compose up -d postgres redis
docker compose ps   # STATUS doit afficher "(healthy)"
```

### 3. Installer les dépendances et migrer la base

```bash
npm install
npm run prisma:migrate:dev
npm run prisma:generate
```

### 4. Lancer en développement

```bash
npm run dev          # API (3001) + Web (3000)
# ou
npm run dev:front    # Web uniquement
```

### 5. Stack complète via Docker

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
| Prisma Studio | `npx prisma studio` (depuis `apps/api/`) |
| PostgreSQL | `localhost:5432` (user: pulsescore, db: pulsescore) |
| Redis | `localhost:6379` |

---

## Environment variables

Fichier `.env` à la racine (chargé par l'API via `../../.env`) :

| Variable | Description |
|---|---|
| `DATABASE_URL` | URL PostgreSQL |
| `REDIS_URL` | URL Redis |
| `API_FOOTBALL_KEY` | Clé API-Football v3 (api-sports.io direct) |
| `APIFOOTBALL_TIMEZONE` | Timezone des fixtures (ex. `Europe/Paris`) |
| `FOOTBALL_DATA_ORG_KEY` | Clé Football-Data.org (livescores) |
| `NEXT_PUBLIC_API_URL` | URL de l'API exposée au front (`http://localhost:3001`) |
| `NODE_ENV` / `PORT` | Environnement et port de l'API |

---

## Architecture

Monorepo npm workspaces :

- **`apps/api`** — backend NestJS 11 (port 3001)
- **`apps/web`** — frontend Next.js 16 (port 3000)

### Backend — module `sports-data`

Le cœur de l'API. Chaque domaine a son service + controller, agrégeant plusieurs sources externes et normalisant les données via des `normalizer/`.

```
sports-data/
├── client/          # API-Football, Football-Data.org, ESPN
├── controllers/     # matches, teams, players, leagues, standings,
│                    # h2h, transfers, injuries, coaches, venues,
│                    # countries, predictions, trophies, sidelined, livescore
├── services/        # logique métier par domaine (+ warmup cron, odds, scorers)
├── normalizer/      # normalisation des réponses externes
├── interfaces/      # types des réponses providers
├── dto/             # DTOs exposés au front
└── constants/       # mapping ligues / saisons
```

**Cache & rate-limit** : `SportsDataCacheService` met en cache les réponses dans Redis avec des TTL par type (TTL court pour le live, long pour les données statiques). Un `WarmupService` (cron) pré-charge les données fréquentes pour éviter le rate-limit 429 des providers.

### Frontend — pages

| Route | Contenu |
|---|---|
| `/` | Accueil — feed live + ligues |
| `/fixtures` | Matchs à venir |
| `/results` | Résultats |
| `/leagues` et `/leagues/[slug]` | Liste et détail des ligues |
| `/standings/[leagueId]` | Classements |
| `/teams/[teamId]` | Fiche équipe (effectif, coach, stade, couleurs) |
| `/players/[playerId]` | Fiche joueur (stats, photo) |
| `/match/[id]` | Détail match (compositions, événements, H2H) |
| `/h2h/[teamId1]/[teamId2]` | Confrontations directes |

Composants par domaine : `feed/`, `leagues/`, `match/`, `matches/`, `player/`, `scorers/`, `standings/`, `teams/`, `world-cup/`, `theme/`, `ui/`.

### Modèles Prisma

`User`, `Match`, `League`, `Team`, `Standing`, `Player`, `MatchEvent`.

---

## Available scripts (root)

```bash
npm run dev                    # API + web en watch mode
npm run dev:front              # Web uniquement
npm run build                  # Build production des deux apps
npm run lint                   # Lint des deux apps
npm run test                   # Tests API (Jest)
npm run prisma:generate        # Régénère le client Prisma
npm run prisma:migrate:dev     # Crée + applique une migration
npm run prisma:migrate:deploy  # Applique les migrations (production)
```

---

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) sur push `main` et PR :

1. Démarre PostgreSQL 16 + Redis 7 (service containers)
2. Installe les dépendances
3. Génère le client Prisma + migrations
4. Lint des deux apps
5. Build des deux apps
6. Tests unitaires API

Un hook **pre-push** (Husky) rejoue les tests localement avant push.

---

## Roadmap

- [x] Infra monorepo (NestJS + Next.js + Docker + CI)
- [x] Ingestion multi-sources (API-Football, Football-Data.org, ESPN, TheSportsDB)
- [x] Pages ligues / classements / équipes / joueurs / matchs / H2H
- [x] Cache Redis + cron de warmup anti rate-limit
- [x] Recherche navbar, liens joueurs lineup, champion card, page rate-limit
- [x] FIFA World Cup 2026
- [ ] **WebSocket gateway** — push temps réel des scores (Socket.io + Redis Pub/Sub), notifications de buts
- [ ] Leaderboards (Redis Sorted Sets)
- [ ] Mini-jeu de pronostics
- [ ] Authentification (JWT + refresh tokens)
- [ ] Déploiement (Railway / Fly.io)

---

*PulseScore Arena — plateforme open-source d'engagement des fans de football.*
