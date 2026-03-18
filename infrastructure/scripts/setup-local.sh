#!/usr/bin/env bash
# ============================================================
# Portalon Private Network — Local Dev Setup
# Arranca todo el stack localmente con un solo comando.
# Uso: bash setup-local.sh
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
INFRA_DIR="$SCRIPT_DIR"

# ── Colores ──────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }
step()    { echo -e "\n${BOLD}${CYAN}▶ $*${NC}"; }

# ── Requisitos ────────────────────────────────────────────────
step "Verificando requisitos"

command -v docker >/dev/null 2>&1  || error "Docker no encontrado. Instálalo desde https://docs.docker.com/get-docker/"
docker info >/dev/null 2>&1        || error "Docker daemon no está corriendo. Inicia Docker Desktop o 'sudo systemctl start docker'"
command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1 || error "Docker Compose v2 no encontrado."

success "Docker $(docker --version | awk '{print $3}' | tr -d ',')"
success "Docker Compose $(docker compose version --short)"

# ── Fichero .env ──────────────────────────────────────────────
step "Configurando variables de entorno"

ENV_FILE="$ROOT_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
  info "No se encontró .env — creando desde .env.example con valores locales..."
  cp "$ROOT_DIR/.env.example" "$ENV_FILE"

  # Parchar los valores que necesitan ajuste para dev local
  sed -i.bak \
    -e 's|NODE_ENV=production|NODE_ENV=development|' \
    -e 's|FRONTEND_URL=https://tu-dominio.com|FRONTEND_URL=http://localhost:3000|' \
    -e 's|DATABASE_URL=postgresql://portalon:CHANGE_ME_DB_PASSWORD@postgres:5432/portalon_db|DATABASE_URL=postgresql://portalon:localdev_password_change_me@postgres:5432/portalon_db|' \
    -e 's|REDIS_PASSWORD=CHANGE_ME_REDIS_PASSWORD|REDIS_PASSWORD=localdev_redis_pw|' \
    -e 's|JWT_SECRET=CHANGE_ME_JWT_SECRET_MIN_32_CHARS_RANDOM|JWT_SECRET=local-dev-jwt-secret-not-for-production-32x|' \
    -e 's|JWT_REFRESH_SECRET=CHANGE_ME_JWT_REFRESH_SECRET_MIN_32_CHARS_RANDOM|JWT_REFRESH_SECRET=local-dev-refresh-secret-not-for-production-xx|' \
    -e 's|NEXT_PUBLIC_API_URL=https://tu-dominio.com/api/v1|NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1|' \
    -e 's|POSTGRES_PASSWORD=CHANGE_ME_DB_PASSWORD|POSTGRES_PASSWORD=localdev_password_change_me|' \
    "$ENV_FILE"
  rm -f "${ENV_FILE}.bak"

  success ".env creado con valores de desarrollo local"
else
  success ".env ya existe — usando configuración existente"
fi

# Exportar variables del .env al shell actual
set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

# ── Build + Up ────────────────────────────────────────────────
step "Construyendo imágenes y levantando servicios"
info "Primera vez puede tardar 5-10 minutos (Next.js build es el más lento)"

cd "$INFRA_DIR"

# docker-compose.override.yml se aplica automáticamente en dev
docker compose up -d --build 2>&1

success "Contenedores iniciados"

# ── Esperar backend ───────────────────────────────────────────
step "Esperando a que el backend esté listo"

MAX_WAIT=120
ELAPSED=0
INTERVAL=5

while true; do
  STATUS=$(docker compose exec -T backend curl -sf http://localhost:3001/api/v1/health 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','?'))" 2>/dev/null || echo "waiting")

  if [ "$STATUS" = "ok" ]; then
    success "Backend respondiendo en http://localhost:3001"
    break
  fi

  if [ "$ELAPSED" -ge "$MAX_WAIT" ]; then
    warn "El backend tardó más de ${MAX_WAIT}s en arrancar."
    warn "Revisa los logs: docker compose logs backend"
    warn "Continuando de todas formas (las migraciones pueden tardar)..."
    break
  fi

  echo -ne "  ⏳ ${ELAPSED}s — estado: ${STATUS} (esperando ${INTERVAL}s más)...\r"
  sleep "$INTERVAL"
  ELAPSED=$((ELAPSED + INTERVAL))
done

# ── Migraciones ───────────────────────────────────────────────
step "Ejecutando migraciones de base de datos"

# Las migraciones se ejecutan automáticamente en el CMD del Dockerfile dev:
# "npx prisma migrate deploy && npm run start:dev"
# Pero esperamos a que terminen antes del seed.
sleep 5

if docker compose exec -T backend npx prisma migrate status 2>&1 | grep -q "Database schema is up to date"; then
  success "Migraciones aplicadas correctamente"
else
  info "Aplicando migraciones pendientes..."
  docker compose exec -T backend npx prisma migrate deploy
  success "Migraciones aplicadas"
fi

# ── Seed ─────────────────────────────────────────────────────
step "Cargando datos de demo (seed)"

if docker compose exec -T backend npx prisma db seed 2>&1; then
  success "Seed ejecutado correctamente"
else
  warn "El seed falló o ya estaba ejecutado. Puedes reintentarlo con:"
  warn "  docker compose exec backend npx prisma db seed"
fi

# ── Resumen final ─────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${GREEN}  ✅  Portalon Private Network — Listo localmente${NC}"
echo -e "${BOLD}${GREEN}════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${BOLD}Frontend (admin)${NC}   →  http://localhost:3000/admin"
echo -e "  ${BOLD}Frontend (partner)${NC} →  http://localhost:3000/partner"
echo -e "  ${BOLD}API REST${NC}           →  http://localhost:3001/api/v1"
echo -e "  ${BOLD}Swagger docs${NC}       →  http://localhost:3001/api/docs"
echo -e "  ${BOLD}PostgreSQL${NC}         →  localhost:5432  (user: portalon)"
echo -e "  ${BOLD}Redis${NC}              →  localhost:6379"
echo ""
echo -e "${BOLD}Credenciales demo:${NC}"
echo -e "  Super Admin  →  admin@portalon.com     /  Portalon2024!"
echo -e "  Manager      →  manager@portalon.com   /  Manager2024!"
echo -e "  Agent        →  comercial@portalon.com /  Agent2024!"
echo -e "  Partner      →  partner@demo.com       /  Partner2024!"
echo ""
echo -e "${BOLD}Comandos útiles:${NC}"
echo -e "  Ver logs:       docker compose logs -f backend"
echo -e "  Reiniciar API:  docker compose restart backend"
echo -e "  Parar todo:     docker compose down"
echo -e "  Reset total:    docker compose down -v  (borra datos)"
echo ""
