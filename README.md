# Portalon Private Network

Red privada de distribución comercial para promociones inmobiliarias de alto ticket. Plataforma B2B SaaS que conecta promotores con una red selecta de partners (brokers, agentes y family offices) a través de un CRM con pipeline, scoring IA y comisiones automatizadas.

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | NestJS 10 + TypeScript, Prisma ORM, PostgreSQL 16 |
| Frontend | Next.js 14 (App Router), TailwindCSS, shadcn/ui, Zustand |
| IA | OpenClaw / Ollama-compatible (self-hosted, llama3.1) |
| Infra | Docker Compose, Nginx (SSL termination), Redis 7 |
| Auth | JWT dual-token (access 15m + refresh 7d), rotación de tokens |

## Arranque rápido (desarrollo)

```bash
# 1. Variables de entorno
cp .env.example .env
# Edita .env — ver sección Variables de entorno

# 2. Levantar infra local
cd infrastructure
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d

# 3. Backend
cd backend
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev

# 4. Frontend
cd frontend
npm install
npm run dev
```

- API: http://localhost:3001/api/v1
- Swagger: http://localhost:3001/api/docs
- Frontend: http://localhost:3000

## Despliegue en VPS

Ver [DEPLOY.md](./DEPLOY.md) para la guía completa paso a paso.

```bash
cd infrastructure
bash scripts/deploy.sh --seed   # primera vez
bash scripts/deploy.sh          # actualizaciones
```

## Credenciales demo (tras seed)

| Rol | Email | Contraseña |
|-----|-------|-----------|
| Super Admin | admin@portalon.com | Portalon2024! |
| Agente Comercial | comercial@portalon.com | Agent2024! |
| Partner (APPROVED) | partner@demo.com | Partner2024! |
| Partner (APPROVED) | ana.torres@demo.com | Partner2024! |
| Partner (PENDING) | pendiente@demo.com | Partner2024! |

**Cambiar todas las contraseñas tras el primer acceso en producción.**

## Arquitectura de módulos (backend)

```
src/modules/
├── auth/          JWT login/refresh/logout para users
├── partners/      Registro, login y gestión de partners
├── promotions/    Promociones inmobiliarias y sus assets
├── units/         Unidades (pisos/apartamentos) por promoción
├── leads/         CRM pipeline + actividades + scoring IA
├── attribution/   Tracking de origen de cada lead
├── commissions/   Reglas y eventos de comisiones automáticas
├── dashboard/     KPIs y métricas por rol
├── ai/            Integración OpenClaw (classify, summarize, riskFlags)
├── audit/         Log de auditoría de acciones admin
└── users/         Gestión de usuarios internos
```

## Pipeline de leads

```
NEW → QUALIFIED → CONTACTED → VISIT_SCHEDULED → VISITED → RESERVED → WON
 └─────────────────────────────────────────────────────────────────→ LOST
```

Las transiciones se validan en `leads.service.ts`. Los estados terminales (WON, LOST←NEW) son irreversibles excepto reactivación desde LOST.

## Comisiones automáticas

Se calculan automáticamente al mover un lead a `RESERVED` (1,5%) o `WON` (3%) si existe una regla activa para la promoción y el lead tiene atribución de partner. Deduplicadas por `(leadId, triggerType)`.

## Integración IA

Tres operaciones sobre cada lead:
- `classifyLead` → score 0-100 + heatLevel (cold/warm/hot)
- `summarizeLead` → resumen ejecutivo en lenguaje natural
- `detectRiskFlags` → alertas de riesgo (financiación dudosa, datos inconsistentes, etc.)

Se ejecutan de forma asíncrona (fire & forget) al crear o actualizar un lead. Si OpenClaw no está disponible, se aplica fallback silencioso con valores por defecto.

## Seguridad

- Secrets mínimos de 32 chars — usar `openssl rand -hex 32`
- PostgreSQL y Redis nunca expuestos externamente (red Docker interna)
- Helmet + CORS restrictivo en backend
- Throttling global: 100 req/min por IP
- Validación con `class-validator` + whitelist estricto en todos los DTOs
- Contraseñas hasheadas con bcrypt (cost=12)

## Variables de entorno críticas

```bash
JWT_SECRET=<openssl rand -hex 32>
JWT_REFRESH_SECRET=<openssl rand -hex 32>  # distinto al anterior
POSTGRES_PASSWORD=<contraseña fuerte>
REDIS_PASSWORD=<contraseña fuerte>
FRONTEND_URL=https://tu-dominio.com
NEXT_PUBLIC_API_URL=https://tu-dominio.com/api/v1
OPENCLAW_BASE_URL=http://localhost:11434
```

## Comandos útiles

```bash
# Migraciones
cd backend && npx prisma migrate dev          # desarrollo
cd backend && npx prisma migrate deploy       # producción

# Reseed (borra y recrea datos de demo)
cd backend && npx prisma db seed

# Logs en producción
docker compose logs -f backend
docker compose logs -f frontend

# Backup manual de la DB
bash infrastructure/scripts/backup_postgres.sh

# Acceso a la DB
docker compose exec postgres psql -U portalon -d portalon_db
```

## Estructura de carpetas

```
Portalon-private-network/
├── backend/           NestJS API
│   ├── prisma/        Schema, migraciones, seed
│   └── src/
│       ├── common/    Guards, decoradores, filtros, interceptores
│       ├── config/    app.config.ts
│       └── modules/   11 módulos de negocio
├── frontend/          Next.js 14 App Router
│   ├── app/           Rutas (public) y (private)/admin + partner
│   ├── components/    UI compartidos (shadcn/ui)
│   ├── features/      Componentes de negocio por dominio
│   └── lib/           API client, auth store, utils
├── infrastructure/    Docker Compose, Nginx, scripts
│   ├── docker-compose.yml
│   ├── docker-compose.override.yml  (dev local)
│   ├── nginx/
│   └── scripts/       deploy.sh, backup_postgres.sh
└── docs/
    └── business/      Documentación comercial y operativa
```
