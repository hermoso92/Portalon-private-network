# Pilot Checklist — Portalon Private Network

## Pre-Pilot Setup

### Infrastructure
- [ ] VPS provisioned (min: 2 vCPU, 4GB RAM, 40GB SSD)
- [ ] Domain DNS pointing to VPS
- [ ] SSL certificate configured in nginx (Let's Encrypt)
- [ ] Docker + Docker Compose installed
- [ ] .env created from .env.example with all REQUIRED values filled
- [ ] All passwords are cryptographically random
- [ ] Firewall configured (only 80/443 external)
- [ ] Backup cron: 0 3 * * * /opt/portalon/infrastructure/scripts/backup_postgres.sh

### Application Verification
- [ ] docker compose up -d --build completes without errors
- [ ] All 5 containers healthy: postgres, redis, backend, frontend, nginx
- [ ] curl https://yourdomain.com/api/v1/health returns 200
- [ ] Frontend loads at https://yourdomain.com
- [ ] Admin login works

### Data Setup
- [ ] Migrations applied: docker compose exec backend npx prisma migrate deploy
- [ ] Seed run: docker compose exec backend npx prisma db seed
- [ ] Promotion data configured with real details
- [ ] Commission rules set up
- [ ] Unit inventory loaded

### Partner Onboarding Test
- [ ] Partner registration page tested (/registro-partner)
- [ ] Admin can approve partner
- [ ] Approved partner can log in
- [ ] Referral link generates correct URL
- [ ] Lead via referral link appears with correct attribution

### Demo Flow
- [ ] Lead via public form appears as LANDING_PUBLIC
- [ ] Lead via referral link appears as PARTNER_REFERRAL
- [ ] AI scoring triggers within 30s (or graceful fallback score=30)
- [ ] Pipeline advances: NEW -> QUALIFIED -> VISITED -> RESERVED
- [ ] Commission event created on RESERVED
- [ ] WON creates ON_SALE commission event
- [ ] Partner sees correct commissions in their portal
- [ ] Partner cannot see other partners' leads

## Go-Live (Real Client)
- [ ] Remove seed demo data
- [ ] All default passwords rotated
- [ ] JWT secrets are unique and random
- [ ] Privacy policy linked
- [ ] Backup tested (restore verified on staging)
- [ ] Error monitoring configured
- [ ] Rate limiting verified on public form
