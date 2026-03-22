# 🕌 Mosque Platform — Monorepo

Global mosque data platform. Next.js frontend · Fastify backend · Python AI scraper · Shared TypeScript types.

---

## Repo structure

```
mosque-platform/
├── apps/
│   ├── frontend/               Next.js 14 (App Router)
│   │   ├── src/
│   │   │   ├── app/            Routes (mosques, prayer-times, map, auth, admin)
│   │   │   ├── components/     UI, mosque, prayer, layout components
│   │   │   ├── lib/            API client, utilities
│   │   │   ├── hooks/          React Query hooks
│   │   │   └── stores/         Zustand stores
│   │   ├── Dockerfile
│   │   └── Dockerfile.dev
│   │
│   ├── backend/                Node.js Fastify API
│   │   ├── src/
│   │   │   ├── routes/         mosque, prayer, user, admin
│   │   │   ├── services/       Business logic
│   │   │   ├── repositories/   Database access (Postgres + Redis)
│   │   │   ├── plugins/        Fastify plugins (auth, db, cache)
│   │   │   ├── middleware/      Auth, rate-limit, logging
│   │   │   ├── jobs/           Kafka consumers, scheduled tasks
│   │   │   └── config/         Env validation (Zod)
│   │   ├── Dockerfile
│   │   └── Dockerfile.dev
│   │
│   └── scraper/                Python AI scraping service
│       ├── src/
│       │   ├── extractors/     Playwright worker + GPT-4o extractor
│       │   ├── validators/     Pydantic schema validation
│       │   ├── publishers/     Kafka publisher
│       │   ├── utils/          Helpers (geocoding, dedup)
│       │   └── config/         Pydantic-settings
│       ├── tests/
│       ├── Dockerfile
│       └── Dockerfile.dev
│
├── packages/
│   ├── shared-types/           TypeScript types used by frontend + backend
│   │   └── src/
│   │       ├── mosque/
│   │       ├── prayer/
│   │       ├── user/
│   │       ├── scraper/
│   │       └── common/         Pagination, API responses, Kafka events
│   ├── config/                 Shared ESLint, Prettier, TS configs
│   └── utils/                  Shared utility functions
│
├── infrastructure/
│   ├── docker/
│   │   └── postgres/init.sql   Schema + PostGIS setup
│   ├── nginx/                  Reverse proxy config
│   └── scripts/
│       └── setup-dev.sh        One-command dev bootstrap
│
├── .github/workflows/
│   └── ci-cd.yml               Lint → test → build → deploy
│
├── docker-compose.dev.yml      Full local stack
├── docker-compose.prod.yml     Production stack
├── turbo.json                  Turborepo pipeline
└── package.json                Workspace root
```

---

## Quick start

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20+ |
| Python | 3.11+ |
| Docker | 24+ |

### One-command setup

```bash
git clone https://github.com/your-org/mosque-platform.git
cd mosque-platform
bash infrastructure/scripts/setup-dev.sh
```

This script:
1. Checks prerequisites
2. Copies `.env.example` → `.env` for all services
3. Installs Node.js dependencies (all workspaces)
4. Builds shared TypeScript packages
5. Creates Python venv and installs scraper deps
6. Starts infrastructure via Docker (Postgres, Redis, Kafka, Elasticsearch)

### Manual setup

```bash
# 1. Install Node deps
npm install

# 2. Copy env files
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
cp apps/scraper/.env.example apps/scraper/.env

# 3. Build shared packages
npx turbo run build --filter=@mosque/shared-types

# 4. Start infrastructure
npm run docker:dev

# 5. Start all apps with hot reload
npm run dev
```

---

## Services & ports

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 | http://localhost:3000 |
| Backend API | 3001 | http://localhost:3001/api/v1 |
| API docs (Swagger) | 3001 | http://localhost:3001/docs |
| Postgres | 5432 | — |
| Redis | 6379 | — |
| Elasticsearch | 9200 | http://localhost:9200 |
| Kafka | 9092 | — |
| Kafka UI | 8080 | http://localhost:8080 |
| Redis UI | 8081 | http://localhost:8081 |

---

## Development commands

```bash
# Run everything
npm run dev

# Individual services
npm run dev:frontend
npm run dev:backend

# Build all
npm run build

# Test all
npm run test

# Lint all
npm run lint

# Type-check all
npm run type-check

# Docker
npm run docker:dev       # Start full dev stack
npm run docker:prod      # Start production stack
npm run docker:down      # Tear down + remove volumes

# Scraper (Python)
cd apps/scraper
source .venv/bin/activate
python -m src.main
```

---

## Environment variables

Each service has its own `.env` file. Key variables:

| Variable | Service | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | scraper | GPT-4o extraction |
| `JWT_SECRET` | backend | Min 32 chars |
| `POSTGRES_PASSWORD` | all | Shared DB password |
| `NEXT_PUBLIC_API_URL` | frontend | Backend URL (build-time) |

See each service's `.env.example` for the full list.

---

## CI/CD

GitHub Actions pipeline (`.github/workflows/ci-cd.yml`):

```
push to main
  → lint (Node + Python)
  → test (backend, frontend, scraper) — parallel
  → build Docker images → push to GHCR
  → deploy via SSH to production
```

Required GitHub secrets:
- `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`
- `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`

---

## Adding a new service

1. Create `apps/my-service/` with `package.json` (set `"name": "my-service"`)
2. Add to `docker-compose.dev.yml` and `docker-compose.prod.yml`
3. Add a `Dockerfile` and `Dockerfile.dev`
4. Turborepo picks it up automatically via the `apps/*` workspace glob

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS, React Query, Zustand |
| Backend | Node.js, Fastify, TypeScript, Zod, PostgreSQL, PostGIS, Redis, Elasticsearch |
| Scraper | Python 3.11, Playwright, GPT-4o, Pydantic, Kafka, Celery |
| Database | PostgreSQL 16 + PostGIS 3.4 |
| Cache | Redis 7 |
| Search | Elasticsearch 8 |
| Messaging | Apache Kafka |
| Build | Turborepo, tsup |
| CI/CD | GitHub Actions |
| Infra | Docker, Nginx |
