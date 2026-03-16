# Infrastructure - CLAUDE.md

## Overview

Docker Compose-based deployment with nginx as reverse proxy + SSL termination. All services communicate on an internal Docker bridge network. Only nginx is externally accessible (ports 80/443).

---

## Services

| Service | Image | Internal Port | External |
|---------|-------|---------------|---------|
| postgres | postgres:16-alpine | 5432 | None (internal only) |
| redis | redis:7-alpine | 6379 | None (internal only) |
| backend | custom (NestJS) | 3001 | Via nginx |
| frontend | custom (Next.js) | 3000 | Via nginx |
| nginx | nginx:alpine | 80, 443 | 80, 443 |

## Networks

- `portalon_internal` - all services communicate here; postgres/redis isolated
- `portalon_external` - only nginx is on this network (public internet facing)

---

## Files

```
infrastructure/
├── docker-compose.yml          # Production configuration
├── docker-compose.override.yml # Local dev overrides (auto-merged)
├── nginx/
│   ├── nginx.conf              # Main nginx config (worker, gzip, rate limits, security headers)
│   └── conf.d/                 # Per-site configs (portalon.conf)
└── scripts/
    ├── backup_postgres.sh      # Daily backup + rotation (30 days). Includes RESTORE docs.
    ├── deploy.sh               # Zero-downtime deploy script
    └── init-db.sql             # One-time DB init (run on first Postgres boot)
```

---

## Local Development

Use `docker-compose.override.yml` (auto-merged by Docker Compose):
- Postgres exposed on `localhost:5432`
- Redis exposed on `localhost:6379`
- Backend exposed on `localhost:3001`
- Frontend exposed on `localhost:3000`
- nginx only starts with `--profile proxy` flag

```bash
cd infrastructure
docker compose up -d                      # Dev mode (override auto-applied)
docker compose --profile proxy up -d      # Include nginx
```

---

## Production Deployment

```bash
# First deploy
cp /path/to/repo/.env.example /opt/portalon/.env
# Edit /opt/portalon/.env with real secrets

cd /opt/portalon/infrastructure
docker compose up -d --build

# Run migrations + seed
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma db seed  # Run ONCE for demo data
```

For subsequent deploys, use `scripts/deploy.sh` which handles zero-downtime.

---

## nginx Configuration

**Rate limiting zones** (defined in `nginx.conf`):
- `api` zone: 30 req/min per IP (general API)
- `leads` zone: 10 req/min per IP (public lead form endpoint)

**Security headers** set globally:
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

**SSL**: Uses Let's Encrypt certificates mounted at `/etc/letsencrypt`. Certbot webroot at `/var/www/certbot`.

---

## Backups

**Script**: `scripts/backup_postgres.sh`
**Cron**: `0 3 * * *` (daily at 3am)
**Retention**: 30 days
**Location**: `/opt/portalon/backups/portalon_YYYYMMDD_HHMMSS.sql.gz`

**To restore**: See the RESTORE PROCEDURE section at the bottom of `backup_postgres.sh`.

---

## Environment Variables

**Required (no defaults, deployment will fail)**:
- `POSTGRES_PASSWORD` - DB password (used by both postgres service and DATABASE_URL)
- `REDIS_PASSWORD` - Redis auth password
- `JWT_SECRET` - Access token signing secret
- `JWT_REFRESH_SECRET` - Refresh token signing secret
- `FRONTEND_URL` - For CORS (e.g. `https://portalon.yourdomain.com`)
- `NEXT_PUBLIC_API_URL` - Browser-accessible API URL

**Optional (have defaults)**:
- `POSTGRES_DB` (default: `portalon_db`)
- `POSTGRES_USER` (default: `portalon`)
- `PORT` (default: `3001`)
- `JWT_EXPIRES_IN` (default: `15m`)
- `JWT_REFRESH_EXPIRES_IN` (default: `7d`)
- `OPENCLAW_BASE_URL` (default: `http://host.docker.internal:11434`)

---

## Health Checks

- **postgres**: `pg_isready` every 10s
- **redis**: `redis-cli ping` every 10s
- **backend**: `curl /api/v1/health` every 30s (30s start_period)
- **frontend**: depends on backend being healthy before starting

---

## Security Notes

- Database and Redis have no external ports in production (internal network only)
- `POSTGRES_PASSWORD` uses `${VAR:?error}` syntax - Docker Compose fails fast if unset
- Backend container runs as non-root (configured in Dockerfile)
- Uploads volume isolated from source code
- nginx terminates SSL, backend serves HTTP internally
