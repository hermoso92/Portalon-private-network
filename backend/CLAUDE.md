# Backend - CLAUDE.md

## Overview

NestJS 10 API. TypeScript strict mode. All business logic lives in feature modules under `src/modules/`. Shared utilities are in `src/common/`.

**Port**: 3001 (configurable via `PORT` env)
**Global prefix**: `/api/v1`
**Swagger**: `/api/docs` (development only)

---

## Bootstrap (`main.ts`)

Order of setup:
1. `helmet()` - security headers
2. `compression()` - gzip
3. `enableCors()` - restricts to `FRONTEND_URL`
4. `setGlobalPrefix('api/v1')`
5. `ValidationPipe` - whitelist, forbidNonWhitelisted, transform, implicit conversion
6. `HttpExceptionFilter` - unified error format; masks errors in production
7. `LoggingInterceptor` - request/response logging

---

## Module Map

```
src/modules/
├── auth/          # POST /auth/login|refresh|logout|me
├── partners/      # POST /partners/login|register, GET/PATCH /partners
├── leads/         # Full lead lifecycle CRUD + pipeline + AI scoring
├── commissions/   # Commission rules (per promotion) + events (per lead)
├── attribution/   # Lead-to-partner attribution tracking
├── ai/            # Ollama-compatible scoring service (fire-and-forget)
├── promotions/    # Promotion CRUD + asset management
├── units/         # Unit CRUD + availability sync
├── dashboard/     # Admin KPI aggregates
└── audit/         # Immutable audit log
```

---

## Authentication Architecture

### Users (staff)
- Login: `POST /auth/login` → returns `accessToken` (15m) + `refreshToken` (7d)
- Token payload: `{ sub: userId, email, role: UserRole, type: 'user' }`
- Refresh tokens stored in DB and rotated on each use

### Partners (external network)
- Login: `POST /partners/login` → returns `accessToken` (15m) only
- Token payload: `{ sub: partner.id, email, role: 'PARTNER', type: 'partner' }`
- Partners must be `status: APPROVED` to log in

### JwtStrategy (unified)
`src/modules/auth/strategies/jwt.strategy.ts`

Checks `payload.type`:
- `'partner'` → looks up `prisma.partner`, validates `status === 'APPROVED'`
- `'user'` → looks up `prisma.user`, validates `isActive === true`

Returns unified principal `{ id, email, role, name }` attached as `req.user`.

### Guards
- `JwtAuthGuard` - validates JWT, allows `@Public()` to bypass
- `RolesGuard` - checks `req.user.role` against `@Roles(...)` decorator

---

## Lead Pipeline

```
NEW → QUALIFIED → CONTACTED → VISIT_SCHEDULED → VISITED → RESERVED → WON
         ↓              ↓            ↓                ↓         ↓        (terminal)
       LOST           LOST         LOST             LOST      LOST
       (LOST → NEW reactivation allowed)
```

Enforced in `leads.service.ts` via `VALID_TRANSITIONS` constant map.
Invalid transitions return `HTTP 400 BadRequestException`.

### Lead Status Change Flow
1. `PATCH /leads/:id/status` validates transition
2. Creates `LeadActivity` record (audit trail)
3. If `RESERVED` or `WON`: fires `commissionsService.processLeadEvent()` async (fire-and-forget)

### Commission Deduplication
`processLeadEvent()` checks `prisma.commissionEvent.findFirst({ where: { leadId, triggerType } })` before creating - prevents duplicate commissions if status is set multiple times.

---

## AI Service

**File**: `src/modules/ai/ai.service.ts` + `ai-client.service.ts`

- Ollama-compatible HTTP client
- Three operations: `classifyLead`, `summarizeLead`, `detectRiskFlags`
- All operations are `fire-and-forget` from the controller (never block the API response)
- Graceful degradation: returns defaults if service is unavailable (`isAvailable()` check)
- Default score: 30 (cold) when AI unavailable

---

## Prisma Usage

**Schema**: `prisma/schema.prisma`
**Client**: `src/common/prisma/prisma.service.ts` (global singleton module)

Always use `PrismaService` via injection - never import `PrismaClient` directly in modules.

Key enums: `UserRole`, `PartnerStatus`, `LeadStatus`, `LeadSourceType`, `CommissionTriggerType`, `CommissionStatus`

### Unit Ordering
`units.service.ts findByPromotion()` orders by `[{ featured: 'desc' }, { unitCode: 'asc' }]`. The `sortOrder` field exists in schema but is not used in this query intentionally (featured units always bubble up).

---

## Error Handling

All errors go through `HttpExceptionFilter`:
- `HttpException` subclasses: status + message are passed through
- Validation errors from `ValidationPipe`: `{ statusCode, message: 'Validation failed', errors: string[] }`
- Unhandled `Error`: logged server-side, returns generic `500 Internal server error` (no stack trace in production)

---

## Testing

```bash
cd backend
npm test              # Jest unit tests
npm run test:watch    # Watch mode
npm run test:cov      # Coverage
```

Test files:
- `src/modules/auth/auth.service.spec.ts` - auth service tests
- `src/modules/leads/leads.service.spec.ts` - pipeline transition tests
- `src/modules/auth/strategies/jwt.strategy.spec.ts` - JWT strategy validation

---

## Common Commands

```bash
# Database
npx prisma migrate dev           # Create new migration from schema changes
npx prisma migrate deploy        # Apply pending migrations (production)
npx prisma db seed               # Run seed.ts
npx prisma studio                # GUI to browse DB

# Development
npm run start:dev                # Hot-reload dev server
npm run build                    # Compile TypeScript
npm run start:prod               # Run compiled output
```

---

## Environment Variables

See `/.env.example` for full documentation. Critical backend vars:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Must be >= 32 chars, cryptographically random
- `JWT_REFRESH_SECRET` - Must differ from JWT_SECRET
- `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` - Rate limiting store
- `OPENCLAW_BASE_URL` / `OPENCLAW_MODEL` - AI inference server
