# Portalon Private Network

Private commercial distribution network for premium real estate developments. Connects developers with external partner networks (brokers, advisors, agencies) to manage leads, pipeline, attributions, and commissions — all in one platform.

---

## What It Does

- **Partner Portal**: Each partner gets a private login, referral link, and real-time visibility into their leads and commissions
- **CRM Pipeline**: Full lead lifecycle from public form or referral to closed sale (8 pipeline stages)
- **Commission Engine**: Rules-based commissions (percentage or fixed) auto-triggered at reservation and sale, with deduplication
- **AI Lead Scoring**: Ollama-powered lead classification (0-100), executive summary, and risk flag detection
- **Attribution Tracking**: Every lead is attributed to a source (partner referral, landing page, direct)
- **Public Landing Page**: Conversion-optimized promotion page with embedded lead capture form

---

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS 10, TypeScript, Prisma ORM |
| Database | PostgreSQL 16 |
| Cache / Rate Limiting | Redis 7 |
| Frontend | Next.js 14 (App Router), Tailwind CSS, shadcn/ui |
| AI | Ollama-compatible (default: llama3.1) |
| Reverse Proxy | nginx (SSL termination, rate limiting) |
| Deployment | Docker Compose |

---

## Quick Start (Local Development)

```bash
# 1. Clone and configure
git clone <repo>
cd Portalon-private-network
cp .env.example .env
# Edit .env — at minimum set JWT_SECRET, JWT_REFRESH_SECRET, POSTGRES_PASSWORD, REDIS_PASSWORD

# 2. Start all services (from infrastructure/)
cd infrastructure
docker compose up -d

# 3. Apply migrations and seed demo data
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma db seed

# 4. Access
open http://localhost:3000          # Frontend
open http://localhost:3001/api/docs # Swagger (dev only)
```

The `docker-compose.override.yml` is auto-applied in local dev and exposes postgres (5432) and redis (6379) directly for tooling.

---

## Demo Credentials

| Role | Email | Password |
|------|-------|---------|
| Super Admin | admin@portalon.com | Portalon2024! |
| Sales Agent | comercial@portalon.com | Agent2024! |
| Partner (Carlos García) | partner@demo.com | Partner2024! |
| Partner (Ana Torres) | ana.torres@demo.com | Partner2024! |
| Partner PENDING | pendiente@demo.com | Partner2024! |

**WARNING**: Change all credentials before any real deployment.

### Referral Codes
- Carlos García: `CARL9X2F`
- Ana Torres: `ANAT8K3M`

Test a referral: `/promocion/el-portalon-del-brillante?ref=CARL9X2F`

---

## Architecture

```
Internet ──→ nginx (80/443)
               ├──→ /api/*    ──→ backend (NestJS :3001)
               └──→ /*        ──→ frontend (Next.js :3000)

Internal Docker network (no external access):
  ├── PostgreSQL :5432
  └── Redis :6379
```

### Key Design Decisions

**Unified JWT Strategy**: Both users and partners use the same JWT strategy. Token payload includes `type: 'user' | 'partner'`. The strategy looks up the correct table based on type. Partners never get confused with User records.

**Lead Pipeline Validation**: State machine enforced in `leads.service.ts`. Invalid transitions return HTTP 400. Terminal state `WON` has no outgoing transitions.

**Commission Deduplication**: `processLeadEvent()` checks for existing events before creating. Safe to call multiple times.

**Partner Scoping**: Partners are restricted to their own leads at the database query level, not the application level.

---

## Project Structure

```
Portalon-private-network/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Data model
│   │   ├── seed.ts            # Demo data (9 leads, 3 partners, commissions)
│   │   └── migrations/
│   └── src/
│       ├── main.ts            # Bootstrap (Helmet, CORS, ValidationPipe, Swagger)
│       ├── app.module.ts      # Module registry
│       ├── common/            # Guards, decorators, filters, Prisma service
│       └── modules/           # Feature modules
│           ├── auth/          # User auth (login, refresh, logout)
│           ├── partners/      # Partner CRUD + login
│           ├── leads/         # CRM pipeline + AI trigger
│           ├── commissions/   # Rules + events + payouts
│           ├── attribution/   # Lead source attribution
│           ├── ai/            # Ollama client + scoring prompts
│           ├── promotions/    # Promotion management
│           ├── units/         # Property unit inventory
│           ├── dashboard/     # KPI aggregates
│           └── audit/         # Immutable audit log
├── frontend/
│   ├── app/                   # Next.js App Router
│   │   ├── (public)/          # Landing page + partner registration
│   │   └── (private)/
│   │       ├── admin/         # Staff portal
│   │       └── partner/       # External partner portal
│   ├── features/              # Feature-level components
│   ├── components/ui/         # shadcn/ui component library
│   └── lib/                   # API client, auth store, utilities
├── infrastructure/
│   ├── docker-compose.yml         # Production
│   ├── docker-compose.override.yml # Local dev
│   ├── nginx/                     # Reverse proxy config
│   └── scripts/                   # Backup, deploy, init-db
├── docs/business/             # Product docs, demo scripts, checklists
└── .claude/agents/            # Claude Code subagent definitions
```

---

## API Reference

Base URL: `/api/v1`

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /auth/login | Public | User login |
| POST | /auth/refresh | Public | Refresh access token |
| POST | /auth/logout | Bearer | Invalidate refresh token |
| GET | /auth/me | Bearer | Current user |

### Partners
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /partners/register | Public | Partner self-registration |
| POST | /partners/login | Public | Partner login |
| GET | /partners | Admin | List all partners |
| GET | /partners/:id | Admin | Partner detail + leads |
| PATCH | /partners/:id/status | Admin | Approve/reject partner |

### Leads
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /leads/public | Public | Lead from landing form |
| POST | /leads | PARTNER/AGENT+ | Create lead manually |
| GET | /leads | PARTNER/AGENT+ | List leads (partner-scoped) |
| GET | /leads/:id | PARTNER/AGENT+ | Lead detail + timeline |
| PATCH | /leads/:id | AGENT+ | Update lead fields |
| PATCH | /leads/:id/status | AGENT+ | Pipeline transition |
| POST | /leads/:id/score | AGENT+ | Manual AI re-score |

Full Swagger documentation available at `/api/docs` (development mode only).

---

## Environment Variables

See `.env.example` for the complete list with documentation. Required variables:

```bash
POSTGRES_PASSWORD=          # Database password (required, no default)
REDIS_PASSWORD=             # Redis auth password
JWT_SECRET=                 # Access token secret (>= 32 chars)
JWT_REFRESH_SECRET=         # Refresh token secret (different from JWT_SECRET)
FRONTEND_URL=               # CORS allowed origin
NEXT_PUBLIC_API_URL=        # Browser-accessible API URL
```

Generate secrets: `openssl rand -base64 48`

---

## Running Tests

```bash
cd backend
npm test              # All unit tests
npm run test:watch    # Watch mode
npm run test:cov      # Coverage report
```

Key test files:
- `src/modules/auth/auth.service.spec.ts`
- `src/modules/leads/leads.service.spec.ts`
- `src/modules/auth/strategies/jwt.strategy.spec.ts`

---

## Deployment

See `infrastructure/CLAUDE.md` for full deployment guide. Quick reference:

```bash
# Production deploy
cd /opt/portalon/infrastructure
docker compose up -d --build
docker compose exec backend npx prisma migrate deploy
```

Backup (daily at 3am via cron):
```bash
/opt/portalon/infrastructure/scripts/backup_postgres.sh
```

Restore procedure is documented at the bottom of the backup script.

---

## Documentation

| Document | Location |
|----------|---------|
| Root architecture overview | CLAUDE.md |
| Backend architecture | backend/CLAUDE.md |
| Frontend architecture | frontend/CLAUDE.md |
| Infrastructure guide | infrastructure/CLAUDE.md |
| Leads module | backend/src/modules/leads/CLAUDE.md |
| Commissions module | backend/src/modules/commissions/CLAUDE.md |
| Attribution module | backend/src/modules/attribution/CLAUDE.md |
| AI module | backend/src/modules/ai/CLAUDE.md |
| Product one pager | docs/business/product-one-pager.md |
| Demo script | docs/business/demo-script.md |
| Pilot checklist | docs/business/pilot-checklist.md |
| Production checklist | docs/business/production-checklist.md |
| Known risks | docs/business/known-risks.md |

---

## Security

- Helmet security headers on all responses
- CORS restricted to `FRONTEND_URL` only
- JWT access tokens expire in 15 minutes; refresh tokens rotate on use
- Passwords hashed with bcrypt (12 rounds)
- PostgreSQL and Redis inaccessible externally (internal Docker network)
- Stack traces never sent to clients in production
- Rate limiting: 100 req/min global, 10 req/min on public lead form
- Partners are scoped at query level — cannot see other partners' data

---

## License

Private. All rights reserved.
