# Portalon Private Network - Guía de despliegue en VPS

## Requisitos del VPS

- Ubuntu 22.04+
- Docker + Docker Compose v2
- OpenClaw instalado y accesible (Ollama-compatible)
- Dominio apuntando al VPS

## 1. Preparar el servidor

```bash
# Actualizar sistema
apt update && apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER

# Instalar Docker Compose v2
apt install docker-compose-plugin -y

# Verificar
docker --version && docker compose version
```

## 2. Configurar firewall (UFW)

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status
```

## 3. Clonar el repositorio

```bash
mkdir -p /opt/portalon
cd /opt/portalon
git clone <URL_REPOSITORIO> .
```

## 4. Configurar variables de entorno

```bash
cp .env.example .env
nano .env
```

Valores críticos que debes cambiar:
- `POSTGRES_PASSWORD` - contraseña fuerte para PostgreSQL
- `REDIS_PASSWORD` - contraseña fuerte para Redis
- `JWT_SECRET` - string aleatorio mínimo 32 caracteres (usa: `openssl rand -hex 32`)
- `JWT_REFRESH_SECRET` - string aleatorio distinto al anterior
- `FRONTEND_URL` - tu dominio con https://
- `NEXT_PUBLIC_API_URL` - https://tu-dominio.com/api/v1
- `OPENCLAW_BASE_URL` - URL de tu instancia OpenClaw/Ollama

## 5. Configurar Nginx

```bash
# Editar el virtual host
nano infrastructure/nginx/conf.d/portalon.conf

# Reemplaza TU_DOMINIO.COM con tu dominio real (3 ocurrencias)
```

## 6. Obtener certificado Let's Encrypt

```bash
# Método 1: Certbot standalone (antes de levantar nginx)
apt install certbot -y
certbot certonly --standalone -d tu-dominio.com -d www.tu-dominio.com

# Método 2: Certbot con webroot (nginx ya corriendo)
# Primero levanta nginx en HTTP, luego:
certbot certonly --webroot -w /var/www/certbot -d tu-dominio.com

# Renovación automática - añadir al cron:
# 0 12 * * * /usr/bin/certbot renew --quiet && docker compose -f /opt/portalon/infrastructure/docker-compose.yml restart nginx
```

## 7. Desplegar

```bash
cd /opt/portalon/infrastructure

# Primera vez - con seed de datos iniciales
bash scripts/deploy.sh --seed

# Actualizaciones posteriores
bash scripts/deploy.sh
```

## 8. Configurar backups automáticos

```bash
# Editar crontab
crontab -e

# Añadir (backup diario a las 3:00 AM):
0 3 * * * /opt/portalon/infrastructure/scripts/backup_postgres.sh >> /var/log/portalon_backup.log 2>&1
```

## 9. Verificar despliegue

```bash
# Estado de contenedores
docker compose ps

# Logs backend
docker compose logs -f backend

# Logs nginx
docker compose logs nginx

# Probar API
curl https://tu-dominio.com/api/v1/health
```

## 10. Credenciales iniciales (seed)

Tras el primer deploy con --seed:

| Rol | Email | Contraseña |
|-----|-------|------------|
| Super Admin | admin@portalon.com | Portalon2024! |
| Agente Comercial | comercial@portalon.com | Agent2024! |
| Partner demo | partner@demo.com | Partner2024! |

**IMPORTANTE: Cambiar todas las contraseñas tras el primer acceso.**

## 11. Comandos útiles

```bash
# Ver logs en tiempo real
docker compose logs -f

# Reiniciar servicio específico
docker compose restart backend

# Ejecutar migraciones manualmente
docker compose exec backend npx prisma migrate deploy

# Acceder a la DB
docker compose exec postgres psql -U portalon -d portalon_db

# Backup manual
bash /opt/portalon/infrastructure/scripts/backup_postgres.sh

# Restore desde backup
gunzip -c /opt/portalon/backups/portalon_20240101_030000.sql.gz | docker compose exec -T postgres psql -U portalon -d portalon_db
```

## Arquitectura del despliegue

```
Internet
    |
    |  :80, :443
    |
  [Nginx] ─── SSL termination
    |
    ├── /api/* ──────────── [Backend NestJS :3001]
    │                              |
    └── /* ──────────────── [Frontend Next.js :3000]
                                [Backend NestJS :3001]
                                       |
                              ┌────────┴────────┐
                         [PostgreSQL]       [Redis]
                         (internal)        (internal)

    [OpenClaw/Ollama] ── accesible desde backend (host o red)
```
