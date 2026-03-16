#!/usr/bin/env bash
# =============================================================
# Portalon Private Network — VPS Setup Script
# =============================================================
# Configura el sistema completo en un VPS Ubuntu/Debian desde cero.
# Ejecutar como usuario con sudo o como root.
#
# USO:
#   # Desde la raíz del repositorio:
#   chmod +x infrastructure/scripts/start-vps.sh
#   ./infrastructure/scripts/start-vps.sh
#
#   # Con IP explícita (si la detección automática falla):
#   ./infrastructure/scripts/start-vps.sh --ip 1.2.3.4
#
#   # Reset completo de base de datos:
#   ./infrastructure/scripts/start-vps.sh --fresh
#
# QUÉ HACE:
#   1. Instala Docker si no está instalado (Ubuntu/Debian)
#   2. Detecta la IP pública del VPS
#   3. Crea infrastructure/.env con las URLs del VPS
#   4. Construye imágenes en modo PRODUCCIÓN (JS compilado, más rápido)
#   5. Arranca todos los contenedores (sin nginx — acceso directo por puertos)
#   6. Espera health check del backend
#   7. Ejecuta migraciones Prisma
#   8. Ejecuta seed de datos de demo
#   9. Muestra URLs y credenciales listas
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
EXPLICIT_IP=""

for arg in "$@"; do
  case $arg in
    --fresh) FRESH=true ;;
    --ip) shift; EXPLICIT_IP="${2:-}" ;;
    --ip=*) EXPLICIT_IP="${arg#*=}" ;;
    --help|-h)
      echo "Uso: $0 [--ip VPS_IP] [--fresh]"
      echo ""
      echo "  --ip IP    IP pública del VPS (si la detección automática falla)"
      echo "  --fresh    Borra y recrea la base de datos"
      echo ""
      echo "Ejemplo:"
      echo "  $0 --ip 1.2.3.4"
      exit 0
      ;;
  esac
done

# ── Rutas ──────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$INFRA_DIR/.env"

# ── Banner ─────────────────────────────────────────────────
echo ""
echo -e "${BOLD}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║    PORTALON PRIVATE NETWORK — VPS SETUP            ║${NC}"
echo -e "${BOLD}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# ── 1. Instalar Docker si no está ─────────────────────────
step "1/7 · Docker..."

if ! command -v docker &>/dev/null; then
  warn "Docker no encontrado. Instalando..."

  # Detectar distribución
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    DISTRO="${ID:-unknown}"
  else
    DISTRO="unknown"
  fi

  case "$DISTRO" in
    ubuntu|debian|linuxmint|pop)
      info "Instalando Docker en $DISTRO..."
      apt-get update -qq
      apt-get install -y -qq ca-certificates curl gnupg lsb-release
      curl -fsSL https://get.docker.com | sh
      ;;
    centos|rhel|fedora|rocky|almalinux)
      info "Instalando Docker en $DISTRO..."
      yum install -y -q curl
      curl -fsSL https://get.docker.com | sh
      ;;
    *)
      fail "Distribución '$DISTRO' no soportada automáticamente.\nInstala Docker manualmente: https://docs.docker.com/get-docker/"
      ;;
  esac

  # Añadir usuario actual al grupo docker (no aplica si es root)
  if [ "$EUID" -ne 0 ] && id -nG "$USER" | grep -qv docker; then
    usermod -aG docker "$USER" 2>/dev/null || true
    warn "Usuario añadido al grupo docker. Si hay errores de permisos, cierra y vuelve a abrir la sesión SSH."
  fi

  ok "Docker instalado"
else
  DOCKER_VERSION=$(docker --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
  ok "Docker $DOCKER_VERSION ya instalado"
fi

# Iniciar Docker si no está en marcha
if ! docker info &>/dev/null 2>&1; then
  info "Iniciando el demonio Docker..."
  systemctl start docker 2>/dev/null || service docker start 2>/dev/null || fail "No se pudo iniciar Docker. Inicia manualmente: sudo systemctl start docker"
  sleep 3
fi

# Comprobar compose
if docker compose version &>/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose &>/dev/null; then
  COMPOSE_CMD="docker-compose"
else
  info "Instalando Docker Compose plugin..."
  apt-get install -y -qq docker-compose-plugin 2>/dev/null || \
  yum install -y -q docker-compose-plugin 2>/dev/null || \
  fail "No se pudo instalar Docker Compose. Instala manualmente."
  COMPOSE_CMD="docker compose"
fi

ok "Docker Compose listo ($COMPOSE_CMD)"

# ── 2. Detectar IP pública ─────────────────────────────────
step "2/7 · Detectando IP pública del VPS..."

if [ -n "$EXPLICIT_IP" ]; then
  VPS_IP="$EXPLICIT_IP"
  ok "Usando IP proporcionada: $VPS_IP"
else
  VPS_IP=""
  # Intentar varios servicios de detección de IP
  for IP_SERVICE in "https://ifconfig.me" "https://icanhazip.com" "https://ipecho.net/plain" "https://api.ipify.org"; do
    DETECTED=$(curl -s --connect-timeout 5 "$IP_SERVICE" 2>/dev/null | tr -d '[:space:]' || true)
    if echo "$DETECTED" | grep -qE '^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$'; then
      VPS_IP="$DETECTED"
      break
    fi
  done

  if [ -z "$VPS_IP" ]; then
    echo ""
    echo -e "${YELLOW}No se pudo detectar la IP pública automáticamente.${NC}"
    echo -n "Introduce la IP pública de este VPS: "
    read -r VPS_IP
    if [ -z "$VPS_IP" ]; then
      fail "Debes indicar la IP pública. Usa: $0 --ip TU_IP"
    fi
  fi

  ok "IP pública detectada: $VPS_IP"
fi

# ── 3. Crear .env ──────────────────────────────────────────
step "3/7 · Configurando entorno..."

cd "$INFRA_DIR"

if [ -f "$ENV_FILE" ] && [ "$FRESH" = false ]; then
  ok ".env ya existe — no se sobreescribe"
  info "Si quieres recrearlo, elimínalo primero: rm infrastructure/.env"
else
  if [ "$FRESH" = true ] && [ -f "$ENV_FILE" ]; then
    info "Modo --fresh: eliminando .env anterior..."
    rm -f "$ENV_FILE"
  fi

  info "Creando $ENV_FILE con IP $VPS_IP..."
  cat > "$ENV_FILE" <<ENVEOF
# ================================================================
# Portalon Private Network — Configuración VPS
# Generado automáticamente por start-vps.sh el $(date '+%Y-%m-%d %H:%M')
# ================================================================

# App
NODE_ENV=production
PORT=3001

# PostgreSQL
POSTGRES_DB=portalon_db
POSTGRES_USER=portalon
POSTGRES_PASSWORD=demo_pg_portalon_2024

# Redis
REDIS_PASSWORD=demo_redis_portalon_2024

# JWT (cámbia estas antes de producción real)
JWT_SECRET=demo-jwt-secret-portalon-private-network-vps-2024x
JWT_REFRESH_SECRET=demo-refresh-secret-portalon-private-network-vps-2024x
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# URLs — apuntan a la IP pública del VPS
# IMPORTANTE: NEXT_PUBLIC_API_URL se hornea en el build del frontend.
#             Si cambias la IP/dominio, debes reconstruir: --build
FRONTEND_URL=http://${VPS_IP}:3000
NEXT_PUBLIC_API_URL=http://${VPS_IP}:3001/api/v1
NEXT_PUBLIC_PROMOTION_SLUG=el-portalon-del-brillante

# IA (opcional — el sistema funciona sin ella, score por defecto = 30)
OPENCLAW_BASE_URL=http://host.docker.internal:11434
OPENCLAW_MODEL=llama3.1
OPENCLAW_TIMEOUT=30000

# Database URL completa (usada por Prisma dentro del contenedor)
DATABASE_URL=postgresql://portalon:demo_pg_portalon_2024@postgres:5432/portalon_db
ENVEOF

  ok ".env creado para http://${VPS_IP}"
fi

# ── 4. Arrancar contenedores (modo producción) ─────────────
step "4/7 · Construyendo y arrancando contenedores..."

# Usamos -f explícito para evitar que docker-compose.override.yml
# (que es para desarrollo local) se auto-aplique en el VPS.
COMPOSE_FILES="-f docker-compose.yml -f docker-compose.vps.yml"

if [ "$FRESH" = true ]; then
  warn "Modo --fresh: eliminando contenedores y volúmenes..."
  $COMPOSE_CMD $COMPOSE_FILES down --volumes --remove-orphans 2>/dev/null || true
else
  $COMPOSE_CMD $COMPOSE_FILES down --remove-orphans 2>/dev/null || true
fi

info "Construyendo imágenes en modo producción (primera vez: 5-10 minutos)..."
$COMPOSE_CMD $COMPOSE_FILES up -d --build

ok "Contenedores arrancados"

# ── 5. Health check del backend ────────────────────────────
step "5/7 · Esperando a que el backend esté listo..."

MAX_WAIT=180
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
    $COMPOSE_CMD $COMPOSE_FILES logs --tail=40 backend
    fail "Backend no responde tras ${MAX_WAIT}s."
  fi

  echo -n "."
  sleep 3
  WAITED=$((WAITED + 3))
done

# ── 6. Migraciones y seed ──────────────────────────────────
step "6/7 · Ejecutando migraciones y seed..."

if [ "$FRESH" = true ]; then
  info "Reseteando esquema (--fresh)..."
  $COMPOSE_CMD $COMPOSE_FILES exec -T backend npx prisma migrate reset --force --skip-seed
  ok "Esquema reseteado"
fi

info "Aplicando migraciones Prisma..."
$COMPOSE_CMD $COMPOSE_FILES exec -T backend npx prisma migrate deploy
ok "Migraciones aplicadas"

info "Cargando datos de demo (seed)..."
$COMPOSE_CMD $COMPOSE_FILES exec -T backend npx prisma db seed
ok "Seed completado"

# ── 7. Abrir puertos en firewall ───────────────────────────
step "7/7 · Configurando firewall..."

if command -v ufw &>/dev/null; then
  if ufw status | grep -q "Status: active"; then
    ufw allow 3000/tcp 2>/dev/null && ok "Puerto 3000 abierto en ufw" || warn "No se pudo abrir puerto 3000 (¿ya abierto?)"
    ufw allow 3001/tcp 2>/dev/null && ok "Puerto 3001 abierto en ufw" || warn "No se pudo abrir puerto 3001 (¿ya abierto?)"
  else
    info "ufw instalado pero inactivo — no se modifica"
  fi
elif command -v firewall-cmd &>/dev/null; then
  firewall-cmd --permanent --add-port=3000/tcp 2>/dev/null || true
  firewall-cmd --permanent --add-port=3001/tcp 2>/dev/null || true
  firewall-cmd --reload 2>/dev/null || true
  ok "Puertos abiertos en firewalld"
else
  warn "No se detectó ufw ni firewalld. Abre los puertos 3000 y 3001 manualmente en el panel de tu proveedor VPS."
fi

# ── Resumen final ──────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║              ✅  VPS LISTO PARA LA DEMO                      ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BOLD}URLs:${NC}"
echo "  Panel admin:     http://${VPS_IP}:3000/admin/dashboard"
echo "  Panel partner:   http://${VPS_IP}:3000/partner/dashboard"
echo "  Landing pública: http://${VPS_IP}:3000/promocion/el-portalon-del-brillante"
echo "  Landing + ref:   http://${VPS_IP}:3000/promocion/el-portalon-del-brillante?ref=CARL9X2F"
echo "  API health:      http://${VPS_IP}:3001/api/v1/health"
echo "  API docs:        http://${VPS_IP}:3001/api/docs"
echo ""
echo -e "${BOLD}Credenciales:${NC}"
echo "  Super Admin   →  admin@portalon.com       /  Portalon2024!"
echo "  Manager       →  manager@portalon.com     /  Manager2024!"
echo "  Agente        →  comercial@portalon.com   /  Agent2024!"
echo "  Partner Carlos→  partner@demo.com         /  Partner2024!  [CARL9X2F]"
echo "  Partner Ana   →  ana.torres@demo.com      /  Partner2024!  [ANAT8K3M]"
echo ""
echo -e "${BOLD}Estado de contenedores:${NC}"
$COMPOSE_CMD $COMPOSE_FILES ps
echo ""
echo -e "${BOLD}Logs en tiempo real:${NC}"
echo "  cd infrastructure && $COMPOSE_CMD $COMPOSE_FILES logs -f"
echo ""
echo -e "${BOLD}Parar todos los servicios:${NC}"
echo "  cd infrastructure && $COMPOSE_CMD $COMPOSE_FILES down"
echo ""
echo -e "${YELLOW}⚠  Recuerda: Para producción real, cambia todas las contraseñas del .env${NC}"
echo ""
