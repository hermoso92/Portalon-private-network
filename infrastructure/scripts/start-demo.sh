#!/usr/bin/env bash
# =============================================================
# Portalon Private Network — Demo Setup Script (Linux / macOS)
# =============================================================
# USO:
#   chmod +x infrastructure/scripts/start-demo.sh
#   ./infrastructure/scripts/start-demo.sh           # primera vez o rutina
#   ./infrastructure/scripts/start-demo.sh --fresh   # reset completo de BD
#
# QUÉ HACE:
#   1. Verifica que Docker esté instalado y en marcha
#   2. Crea infrastructure/.env con valores de demo si no existe
#   3. Arranca todos los contenedores (postgres, redis, backend, frontend)
#   4. Espera a que el backend esté sano (health check)
#   5. Ejecuta migraciones de base de datos (Prisma)
#   6. Ejecuta el seed de datos de demo
#   7. Imprime las credenciales y URLs listas para usar
# =============================================================

set -euo pipefail

# ── Colores ────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✓${NC} $1"; }
info() { echo -e "${BLUE}→${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC}  $1"; }
fail() { echo -e "${RED}✗ ERROR:${NC} $1"; exit 1; }
step() { echo -e "\n${BOLD}$1${NC}"; }

# ── Flags ──────────────────────────────────────────────────
FRESH=false
for arg in "$@"; do
  case $arg in
    --fresh) FRESH=true ;;
    --help|-h)
      echo "Uso: $0 [--fresh]"
      echo "  --fresh   Borra y recrea la base de datos (útil si hay datos corruptos)"
      exit 0
      ;;
  esac
done

# ── Rutas ──────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT_DIR="$(cd "$INFRA_DIR/.." && pwd)"
ENV_FILE="$INFRA_DIR/.env"

# ── Banner ─────────────────────────────────────────────────
echo ""
echo -e "${BOLD}╔════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║   PORTALON PRIVATE NETWORK — DEMO SETUP   ║${NC}"
echo -e "${BOLD}╚════════════════════════════════════════════╝${NC}"
echo ""

# ── 1. Verificar Docker ────────────────────────────────────
step "1/6 · Verificando Docker..."

if ! command -v docker &>/dev/null; then
  fail "Docker no encontrado. Instala Docker Desktop desde https://docs.docker.com/get-docker/"
fi

if ! docker info &>/dev/null; then
  fail "El demonio Docker no está en marcha. Abre Docker Desktop y vuelve a intentarlo."
fi

DOCKER_VERSION=$(docker --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
ok "Docker $DOCKER_VERSION detectado"

# Comprobar compose (v2 plugin o v1 standalone)
if docker compose version &>/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose &>/dev/null; then
  COMPOSE_CMD="docker-compose"
  warn "Usando docker-compose v1. Se recomienda actualizar a Docker Compose v2."
else
  fail "Docker Compose no encontrado. Actualiza Docker Desktop."
fi
ok "Docker Compose listo ($COMPOSE_CMD)"

# ── 2. Crear .env si no existe ─────────────────────────────
step "2/6 · Configurando entorno..."

if [ ! -f "$ENV_FILE" ]; then
  info "Creando $ENV_FILE con valores de demo..."
  cat > "$ENV_FILE" <<'ENVEOF'
# ================================================================
# Portalon Private Network — Variables de entorno para demo local
# ADVERTENCIA: Estos valores son SOLO para demo/desarrollo local.
#              Cambia TODAS las contraseñas antes de producción.
# ================================================================

# App
NODE_ENV=development
PORT=3001

# PostgreSQL
POSTGRES_DB=portalon_db
POSTGRES_USER=portalon
POSTGRES_PASSWORD=demo_pg_portalon_2024

# Redis
REDIS_PASSWORD=demo_redis_portalon_2024

# JWT (valores de demo — NO usar en producción)
JWT_SECRET=demo-jwt-secret-portalon-private-network-local-2024x
JWT_REFRESH_SECRET=demo-refresh-secret-portalon-private-network-local-2024x
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# URLs (demo local — puertos expuestos por docker-compose.override.yml)
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_PROMOTION_SLUG=el-portalon-del-brillante

# IA (opcional — el sistema funciona sin ella, score por defecto = 30)
OPENCLAW_BASE_URL=http://host.docker.internal:11434
OPENCLAW_MODEL=llama3.1
OPENCLAW_TIMEOUT=30000

# Database URL completa (usada por Prisma dentro del contenedor)
DATABASE_URL=postgresql://portalon:demo_pg_portalon_2024@postgres:5432/portalon_db
ENVEOF
  ok ".env creado con valores de demo"
else
  ok ".env ya existe — no se sobreescribe"
fi

# ── 3. Arrancar contenedores ───────────────────────────────
step "3/6 · Arrancando contenedores..."
cd "$INFRA_DIR"

if [ "$FRESH" = true ]; then
  warn "Modo --fresh: eliminando contenedores y volúmenes existentes..."
  $COMPOSE_CMD down --volumes --remove-orphans 2>/dev/null || true
else
  $COMPOSE_CMD down --remove-orphans 2>/dev/null || true
fi

info "Construyendo imágenes y arrancando servicios (puede tardar varios minutos la primera vez)..."
$COMPOSE_CMD up -d --build

ok "Contenedores arrancados"

# ── 4. Esperar health check del backend ────────────────────
step "4/6 · Esperando a que el backend esté listo..."

MAX_WAIT=120   # segundos máximos de espera
WAITED=0
HEALTH_URL="http://localhost:3001/api/v1/health"

echo -n "   Esperando"
while true; do
  if curl -sf "$HEALTH_URL" &>/dev/null; then
    echo ""
    ok "Backend respondiendo en $HEALTH_URL"
    break
  fi

  if [ $WAITED -ge $MAX_WAIT ]; then
    echo ""
    echo ""
    warn "El backend tardó demasiado. Logs recientes:"
    $COMPOSE_CMD logs --tail=30 backend
    fail "Backend no responde tras ${MAX_WAIT}s. Revisa los logs anteriores."
  fi

  echo -n "."
  sleep 3
  WAITED=$((WAITED + 3))
done

# ── 5. Migraciones ─────────────────────────────────────────
step "5/6 · Ejecutando migraciones y seed..."

if [ "$FRESH" = true ]; then
  info "Reseteando base de datos (--fresh)..."
  $COMPOSE_CMD exec -T backend npx prisma migrate reset --force --skip-seed
  ok "Base de datos reseteada"
fi

info "Aplicando migraciones..."
$COMPOSE_CMD exec -T backend npx prisma migrate deploy
ok "Migraciones aplicadas"

info "Cargando datos de demo (seed)..."
$COMPOSE_CMD exec -T backend npx prisma db seed
ok "Seed completado"

# ── 6. Verificación final ──────────────────────────────────
step "6/6 · Verificación final..."

# Verificar que el frontend responde
FRONTEND_STATUS=$(curl -so /dev/null -w "%{http_code}" "http://localhost:3000" 2>/dev/null || echo "000")
if [ "$FRONTEND_STATUS" = "200" ] || [ "$FRONTEND_STATUS" = "307" ] || [ "$FRONTEND_STATUS" = "302" ]; then
  ok "Frontend accesible en http://localhost:3000"
else
  warn "Frontend devolvió HTTP $FRONTEND_STATUS — puede que aún esté iniciando"
fi

# Verificar estado de contenedores
echo ""
info "Estado de los contenedores:"
$COMPOSE_CMD ps

# ── Resumen final ──────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║              ✅  DEMO LISTA PARA USAR                      ║${NC}"
echo -e "${GREEN}${BOLD}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BOLD}URLs:${NC}"
echo "  Panel admin:    http://localhost:3000/admin/dashboard"
echo "  Panel partner:  http://localhost:3000/partner/dashboard"
echo "  Landing pública:http://localhost:3000/promocion/el-portalon-del-brillante"
echo "  Landing + ref:  http://localhost:3000/promocion/el-portalon-del-brillante?ref=CARL9X2F"
echo "  API health:     http://localhost:3001/api/v1/health"
echo "  API docs:       http://localhost:3001/api/docs"
echo ""
echo -e "${BOLD}Credenciales:${NC}"
echo "  Super Admin   →  admin@portalon.com       /  Portalon2024!"
echo "  Manager       →  manager@portalon.com     /  Manager2024!"
echo "  Agente        →  comercial@portalon.com   /  Agent2024!"
echo "  Partner Carlos→  partner@demo.com         /  Partner2024!  [CARL9X2F]"
echo "  Partner Ana   →  ana.torres@demo.com      /  Partner2024!  [ANAT8K3M]"
echo ""
echo -e "${BOLD}Script de demo:${NC}  docs/business/demo-script.md"
echo -e "${BOLD}Checklist:${NC}       docs/business/meeting-checklist.md"
echo ""
echo -e "${YELLOW}Para detener todos los servicios:${NC}"
echo "  cd infrastructure && $COMPOSE_CMD down"
echo ""
