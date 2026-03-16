# Portalon Private Network - CLAUDE.md

## Project Overview

**Portalon Private Network** is a B2B SaaS platform for private commercial distribution of premium real estate developments. It enables real estate developers to manage a network of external partners (brokers, advisors, agencies) who refer high-net-worth investors to property promotions.

**Stack**: NestJS (backend) + Next.js 14 (frontend) + PostgreSQL + Redis + Docker + nginx

**Business model**: Partners earn commissions (1.5% on reservation + 3% on sale) for leads that convert. The platform manages the full pipeline from lead capture to commission payout.

---

## Repository Structure

```
Portalon-private-network/
├── backend/               # NestJS API (TypeScript)
│   ├── prisma/            # Schema + migrations + seed
│   └── src/
│       ├── app.module.ts  # Root module
│       ├── main.ts        # Bootstrap (helmet, CORS, validation, Swagger)
│       ├── common/        # Guards, decorators, filters, prisma service
│       ├── config/        # App config loader
│       └── modules/       # Feature modules (leads, partners, auth, etc.)
├── frontend/              # Next.js 14 App Router (TypeScript)
│   ├── app/               # Routes (public landing + admin + partner portals)
│   ├── features/          # Feature components (CRM, dashboard, etc.)
│   ├── components/ui/     # shadcn/ui component library
│   └── lib/               # API client, utils, auth store
├── infrastructure/        # Docker Compose, nginx, scripts
│   ├── docker-compose.yml         # Production compose
│   ├── docker-compose.override.yml # Local dev overrides (auto-merged)
│   ├── nginx/             # nginx.conf + conf.d/
│   └── scripts/           # backup_postgres.sh, deploy.sh, init-db.sql
├── docs/business/         # Product docs, demo scripts, checklists
└── .claude/agents/        # Subagent definitions for Claude Code
```

---

## Critical Files To Know

| File | Purpose |
|------|---------|
| `backend/prisma/schema.prisma` | Full data model - source of truth |
| `backend/src/main.ts` | API bootstrap, CORS, Helmet, ValidationPipe |
| `backend/src/app.module.ts` | Module wiring, throttler config |
| `backend/src/common/guards/jwt-auth.guard.ts` | JWT guard (uses JwtStrategy) |
| `backend/src/modules/auth/strategies/jwt.strategy.ts` | Unified user+partner JWT validation |
| `backend/src/modules/leads/leads.service.ts` | Pipeline logic including transition validation |
| `frontend/lib/api.ts` | Axios instance with auth interceptors |
| `frontend/lib/auth.ts` | Zustand auth store |
| `.env.example` | All environment variables with documentation |

---

## Demo Credentials (seed data)

| Role | Email | Password |
|------|-------|---------|
| Super Admin | admin@portalon.com | Portalon2024! |
| Promotion Manager | manager@portalon.com | Manager2024! |
| Sales Agent | comercial@portalon.com | Agent2024! |
| Partner (APPROVED) | partner@demo.com | Partner2024! |
| Partner 2 (APPROVED) | lucia@premiumrealty.com | Partner2024! |
| Partner 3 (PENDING) | pedro@asesorfinanciero.com | Partner2024! |

**WARNING**: Change ALL credentials before any real deployment.

---

## Key Architecture Decisions

### JWT Strategy (Unified User + Partner)
Partners have their own `Partner` table (not `User`). When a partner logs in via `/partners/login`, the token has `{ sub: partner.id, type: 'partner', role: 'PARTNER' }`. The `JwtStrategy.validate()` checks `payload.type` to decide whether to look up `prisma.partner` or `prisma.user`. Both return a unified principal `{ id, email, role, name }`.

### Lead Pipeline Transitions
Valid transitions are enforced in `leads.service.ts` via `VALID_TRANSITIONS` map. Invalid transitions return HTTP 400. Terminal state `WON` has no outgoing transitions. `LOST` can only be reactivated back to `NEW`.

### Commission Deduplication
`commissionsService.processLeadEvent()` checks for an existing `CommissionEvent` with the same `(leadId, triggerType)` before creating. Called fire-and-forget from `changeStatus` endpoint.

### Partner Scoping
Partners are scoped in `LeadsService.findAll()` - if `userRole === 'PARTNER'`, `where.partnerId` is forced to the authenticated partner's ID. Partners cannot see leads they don't own.

---

## Running Locally

```bash
# 1. Copy env and configure
cp .env.example .env
# Edit .env - at minimum set JWT_SECRET, JWT_REFRESH_SECRET, POSTGRES_PASSWORD, REDIS_PASSWORD

# 2. Start all services (from infrastructure/)
cd infrastructure
docker compose up -d

# 3. Run migrations + seed
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma db seed

# 4. Access
# API: http://localhost:3001/api/v1
# API Docs (dev only): http://localhost:3001/api/docs
# Frontend: http://localhost:3000
```

---

## Known Bugs Fixed

1. **P0 - LeadsCRM partner routing**: `LeadsCRM.tsx` row click was hardcoded to `/admin/leads/:id`. Fixed to detect partner context via `usePathname()`.
2. **P1 - Pipeline transition validation**: `changeStatus()` now validates transitions against `VALID_TRANSITIONS` map.
3. **P1 - HTTP exception filter**: Production mode no longer leaks raw error messages from unhandled exceptions.
4. **P1 - frontend/package.json**: Removed non-existent `@radix-ui/react-badge`, added `tailwindcss-animate`.
5. **P2 - docker-compose POSTGRES_PASSWORD**: Now uses `${POSTGRES_PASSWORD:?error message}` syntax - Docker Compose will fail fast with a clear error if not set.

---

## Security Notes

- Helmet is applied globally (`main.ts`)
- CORS is restricted to `FRONTEND_URL` only
- JWT secrets must be >= 32 chars and cryptographically random
- Rate limiting: global 100 req/min; nginx `leads` zone 10 req/min for public form
- Partners cannot see other partners' leads (scoped queries)
- Stack traces are never sent to clients in production
- PostgreSQL and Redis are NOT exposed externally (internal Docker network only)
- Refresh token rotation is implemented (each use invalidates old token)

---

## Modules Quick Reference

| Module | Path | Key Responsibility |
|--------|------|--------------------|
| auth | `modules/auth` | User login, JWT issue/refresh/logout |
| partners | `modules/partners` | Partner CRUD, login, stats |
| leads | `modules/leads` | Lead lifecycle, pipeline, AI scoring |
| commissions | `modules/commissions` | Rules, events, partner summary |
| attribution | `modules/attribution` | Source attribution for leads |
| ai | `modules/ai` | Ollama-backed scoring, summarization, risk flags |
| promotions | `modules/promotions` | Real estate promotion management |
| units | `modules/units` | Individual property units |
| dashboard | `modules/dashboard` | Aggregated KPIs for admin |
| audit | `modules/audit` | Immutable audit log |
| health | `common/health` | /health endpoint for Docker healthcheck |
| premium-assets | `modules/premium-assets` | Multi-mode asset ops: catalog, owners, operators, availability, pricing |
