#!/bin/bash
# ============================================================
# Portalon Private Network - Deploy Script
# Usage: ./deploy.sh [--seed]
# ============================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SEED=false

# Parse args
for arg in "$@"; do
  case $arg in
    --seed) SEED=true ;;
  esac
done

echo "=== Portalon Private Network - Deploy ==="
echo "Project: $PROJECT_DIR"
echo ""

# Check .env exists
if [ ! -f "$PROJECT_DIR/../.env" ]; then
  echo "ERROR: .env file not found"
  echo "Copy .env.example to .env and fill in the values"
  exit 1
fi

cd "$PROJECT_DIR"

echo "1. Pulling latest images..."
docker compose pull postgres redis nginx 2>/dev/null || true

echo "2. Building application images..."
docker compose build --no-cache backend frontend

echo "3. Stopping old containers..."
docker compose down --remove-orphans 2>/dev/null || true

echo "4. Starting infrastructure (postgres, redis)..."
docker compose up -d postgres redis
sleep 5

echo "5. Waiting for database..."
until docker compose exec postgres pg_isready -U "${POSTGRES_USER:-portalon}" 2>/dev/null; do
  echo "   Waiting for PostgreSQL..."
  sleep 2
done
echo "   PostgreSQL ready!"

echo "6. Starting backend (runs migrations automatically)..."
docker compose up -d backend
sleep 10

echo "7. Checking backend health..."
RETRIES=0
until curl -sf http://localhost:3001/api/v1/health > /dev/null 2>&1 || [ $RETRIES -eq 12 ]; do
  echo "   Waiting for backend... ($RETRIES/12)"
  sleep 5
  RETRIES=$((RETRIES+1))
done

if [ $RETRIES -eq 12 ]; then
  echo "WARNING: Backend health check timed out - check logs with: docker compose logs backend"
fi

if [ "$SEED" = true ]; then
  echo "8. Running seed..."
  docker compose exec backend node -e "
    const { exec } = require('child_process');
    exec('npx ts-node prisma/seed.ts', (err, stdout, stderr) => {
      if (err) { console.error(stderr); process.exit(1); }
      console.log(stdout);
    });
  " || echo "Seed skipped (may need ts-node)"
fi

echo "9. Starting frontend..."
docker compose up -d frontend

echo "10. Starting nginx..."
docker compose up -d nginx

echo ""
echo "=== Deploy complete! ==="
docker compose ps
echo ""
echo "Check logs: docker compose logs -f backend"
echo "API docs (dev only): http://localhost:3001/api/docs"
