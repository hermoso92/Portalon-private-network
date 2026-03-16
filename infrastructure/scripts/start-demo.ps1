# =============================================================
# Portalon Private Network — Demo Setup Script (Windows)
# =============================================================
# USO (desde PowerShell como Administrador):
#   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
#   .\infrastructure\scripts\start-demo.ps1             # primera vez
#   .\infrastructure\scripts\start-demo.ps1 -Fresh      # reset completo de BD
#
# REQUISITOS:
#   - Docker Desktop instalado y en marcha
#   - PowerShell 5.1+ (incluido en Windows 10/11)
#
# QUÉ HACE:
#   1. Verifica que Docker esté instalado y en marcha
#   2. Crea infrastructure\.env con valores de demo si no existe
#   3. Arranca todos los contenedores (postgres, redis, backend, frontend)
#   4. Espera a que el backend esté sano (health check)
#   5. Ejecuta migraciones de base de datos (Prisma)
#   6. Ejecuta el seed de datos de demo
#   7. Imprime las credenciales y URLs listas para usar
# =============================================================

#Requires -Version 5.1
param(
    [switch]$Fresh,
    [switch]$Help
)

$ErrorActionPreference = "Stop"

# ── Helpers ────────────────────────────────────────────────
function Write-Ok   ($msg) { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Info ($msg) { Write-Host "   --> $msg" -ForegroundColor Cyan }
function Write-Warn ($msg) { Write-Host "  [!]  $msg" -ForegroundColor Yellow }
function Write-Step ($msg) { Write-Host "`n$msg" -ForegroundColor White }
function Write-Fail ($msg) {
    Write-Host "`n  [ERROR] $msg" -ForegroundColor Red
    exit 1
}

if ($Help) {
    Write-Host "Uso: .\start-demo.ps1 [-Fresh] [-Help]"
    Write-Host "  -Fresh   Borra y recrea la base de datos (util si hay datos corruptos)"
    exit 0
}

# ── Rutas ──────────────────────────────────────────────────
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$InfraDir  = Split-Path -Parent $ScriptDir
$RootDir   = Split-Path -Parent $InfraDir
$EnvFile   = Join-Path $InfraDir ".env"

# ── Banner ─────────────────────────────────────────────────
Write-Host ""
Write-Host "=================================================" -ForegroundColor Blue
Write-Host "   PORTALON PRIVATE NETWORK -- DEMO SETUP       " -ForegroundColor Blue
Write-Host "=================================================" -ForegroundColor Blue
Write-Host ""

# ── 1. Verificar Docker ────────────────────────────────────
Write-Step "1/6 - Verificando Docker..."

try {
    $null = Get-Command docker -ErrorAction Stop
} catch {
    Write-Fail "Docker no encontrado. Instala Docker Desktop desde https://docs.docker.com/get-docker/"
}

try {
    $null = docker info 2>&1
    if ($LASTEXITCODE -ne 0) { throw }
} catch {
    Write-Fail "El demonio Docker no esta en marcha. Abre Docker Desktop y vuelve a intentarlo."
}

$dockerVersion = (docker --version) -replace "Docker version ", "" -replace ",.*", ""
Write-Ok "Docker $dockerVersion detectado"

# Detectar compose v2 o v1
$composeCmd = $null
try {
    $null = docker compose version 2>&1
    if ($LASTEXITCODE -eq 0) { $composeCmd = @("docker", "compose") }
} catch {}

if (-not $composeCmd) {
    try {
        $null = Get-Command docker-compose -ErrorAction Stop
        $composeCmd = @("docker-compose")
        Write-Warn "Usando docker-compose v1. Se recomienda actualizar a Docker Desktop con Compose v2."
    } catch {
        Write-Fail "Docker Compose no encontrado. Actualiza Docker Desktop."
    }
}
Write-Ok "Docker Compose listo"

# ── 2. Crear .env si no existe ─────────────────────────────
Write-Step "2/6 - Configurando entorno..."

if (-not (Test-Path $EnvFile)) {
    Write-Info "Creando $EnvFile con valores de demo..."

    $envContent = @"
# ================================================================
# Portalon Private Network - Variables de entorno para demo local
# ADVERTENCIA: Estos valores son SOLO para demo/desarrollo local.
#              Cambia TODAS las contrasenas antes de produccion.
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

# JWT (valores de demo - NO usar en produccion)
JWT_SECRET=demo-jwt-secret-portalon-private-network-local-2024x
JWT_REFRESH_SECRET=demo-refresh-secret-portalon-private-network-local-2024x
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# URLs (demo local - puertos expuestos por docker-compose.override.yml)
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_PROMOTION_SLUG=el-portalon-del-brillante

# IA (opcional - el sistema funciona sin ella, score por defecto = 30)
OPENCLAW_BASE_URL=http://host.docker.internal:11434
OPENCLAW_MODEL=llama3.1
OPENCLAW_TIMEOUT=30000

# Database URL completa (usada por Prisma dentro del contenedor)
DATABASE_URL=postgresql://portalon:demo_pg_portalon_2024@postgres:5432/portalon_db
"@
    # Escribir con codificacion UTF8 sin BOM (compatible con Docker)
    [System.IO.File]::WriteAllText($EnvFile, $envContent, [System.Text.UTF8Encoding]::new($false))
    Write-Ok ".env creado con valores de demo"
} else {
    Write-Ok ".env ya existe - no se sobreescribe"
}

# ── 3. Arrancar contenedores ───────────────────────────────
Write-Step "3/6 - Arrancando contenedores..."

Set-Location $InfraDir

if ($Fresh) {
    Write-Warn "Modo -Fresh: eliminando contenedores y volumenes existentes..."
    & $composeCmd[0] ($composeCmd[1..99] + @("down", "--volumes", "--remove-orphans")) 2>$null
} else {
    & $composeCmd[0] ($composeCmd[1..99] + @("down", "--remove-orphans")) 2>$null
}

Write-Info "Construyendo imagenes y arrancando servicios (puede tardar varios minutos la primera vez)..."
& $composeCmd[0] ($composeCmd[1..99] + @("up", "-d", "--build"))
if ($LASTEXITCODE -ne 0) { Write-Fail "Fallo al arrancar los contenedores. Revisa los logs con: docker compose logs" }

Write-Ok "Contenedores arrancados"

# ── 4. Esperar health check del backend ────────────────────
Write-Step "4/6 - Esperando a que el backend este listo..."

$maxWait  = 120
$waited   = 0
$healthUrl = "http://localhost:3001/api/v1/health"

Write-Host "   Esperando backend" -NoNewline

while ($true) {
    try {
        $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host " OK" -ForegroundColor Green
            Write-Ok "Backend respondiendo en $healthUrl"
            break
        }
    } catch { }

    if ($waited -ge $maxWait) {
        Write-Host ""
        Write-Warn "El backend tardo demasiado. Logs recientes:"
        & $composeCmd[0] ($composeCmd[1..99] + @("logs", "--tail=30", "backend"))
        Write-Fail "Backend no responde tras ${maxWait}s. Revisa los logs anteriores."
    }

    Write-Host "." -NoNewline
    Start-Sleep -Seconds 3
    $waited += 3
}

# ── 5. Migraciones y seed ──────────────────────────────────
Write-Step "5/6 - Ejecutando migraciones y seed..."

if ($Fresh) {
    Write-Info "Reseteando base de datos (-Fresh)..."
    & $composeCmd[0] ($composeCmd[1..99] + @("exec", "-T", "backend", "npx", "prisma", "migrate", "reset", "--force", "--skip-seed"))
    if ($LASTEXITCODE -ne 0) { Write-Fail "Fallo el reset de la base de datos." }
    Write-Ok "Base de datos reseteada"
}

Write-Info "Aplicando migraciones..."
& $composeCmd[0] ($composeCmd[1..99] + @("exec", "-T", "backend", "npx", "prisma", "migrate", "deploy"))
if ($LASTEXITCODE -ne 0) { Write-Fail "Fallo en las migraciones. Revisa los logs del backend." }
Write-Ok "Migraciones aplicadas"

Write-Info "Cargando datos de demo (seed)..."
& $composeCmd[0] ($composeCmd[1..99] + @("exec", "-T", "backend", "npx", "prisma", "db", "seed"))
if ($LASTEXITCODE -ne 0) { Write-Fail "Fallo el seed. Revisa los logs del backend." }
Write-Ok "Seed completado"

# ── 6. Verificacion final ──────────────────────────────────
Write-Step "6/6 - Verificacion final..."

try {
    $fe = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Ok "Frontend accesible en http://localhost:3000 (HTTP $($fe.StatusCode))"
} catch {
    Write-Warn "Frontend aun arrancando - espera unos segundos y recarga el navegador"
}

Write-Host ""
Write-Info "Estado de los contenedores:"
& $composeCmd[0] ($composeCmd[1..99] + @("ps"))

# ── Resumen final ──────────────────────────────────────────
Write-Host ""
Write-Host "=================================================" -ForegroundColor Green
Write-Host "        DEMO LISTA PARA USAR                    " -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host ""
Write-Host "URLs:" -ForegroundColor White
Write-Host "  Panel admin:     http://localhost:3000/admin/dashboard"
Write-Host "  Panel partner:   http://localhost:3000/partner/dashboard"
Write-Host "  Landing publica: http://localhost:3000/promocion/el-portalon-del-brillante"
Write-Host "  Landing + ref:   http://localhost:3000/promocion/el-portalon-del-brillante?ref=CARL9X2F"
Write-Host "  API health:      http://localhost:3001/api/v1/health"
Write-Host "  API docs:        http://localhost:3001/api/docs"
Write-Host ""
Write-Host "Credenciales:" -ForegroundColor White
Write-Host "  Super Admin   -->  admin@portalon.com       /  Portalon2024!"
Write-Host "  Manager       -->  manager@portalon.com     /  Manager2024!"
Write-Host "  Agente        -->  comercial@portalon.com   /  Agent2024!"
Write-Host "  Partner Carlos-->  partner@demo.com         /  Partner2024!  [CARL9X2F]"
Write-Host "  Partner Ana   -->  ana.torres@demo.com      /  Partner2024!  [ANAT8K3M]"
Write-Host ""
Write-Host "Script de demo:  docs\business\demo-script.md" -ForegroundColor Yellow
Write-Host "Checklist:       docs\business\meeting-checklist.md" -ForegroundColor Yellow
Write-Host ""
Write-Host "Para detener todos los servicios:" -ForegroundColor Yellow
Write-Host "  cd infrastructure ; docker compose down"
Write-Host ""
