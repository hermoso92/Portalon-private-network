# Production Checklist — Portalon Private Network

## Security

- [ ] JWT_SECRET is >= 32 chars, cryptographically random (openssl rand -base64 48)
- [ ] JWT_REFRESH_SECRET is >= 32 chars, different from JWT_SECRET
- [ ] POSTGRES_PASSWORD is strong and unique
- [ ] REDIS_PASSWORD is strong and unique
- [ ] All seed/demo passwords rotated (admin@portalon.com, partner@demo.com, etc.)
- [ ] NODE_ENV=production in .env (disables Swagger, enables error masking)
- [ ] FRONTEND_URL is exact domain (no trailing slash, no wildcard)
- [ ] Postgres and Redis NOT exposed on external ports (check docker compose ps)
- [ ] nginx security headers present: X-Frame-Options, X-Content-Type-Options, etc.
- [ ] HTTPS enforced (HTTP redirects to HTTPS in nginx config)
- [ ] Rate limiting active: 30 req/min global, 10 req/min on public lead form

## Data

- [ ] Prisma migrations applied: npx prisma migrate deploy
- [ ] NO seed demo data in production database
- [ ] Real promotion data loaded with accurate prices and unit inventory
- [ ] Commission rules reviewed and approved by finance/legal
- [ ] Partner list reviewed: only APPROVED partners have portal access

## Infrastructure

- [ ] All 5 containers starting and healthy
- [ ] Healthcheck endpoints responding
- [ ] SSL certificate valid and auto-renewing (certbot timer active)
- [ ] Backup script running (verify cron: crontab -l)
- [ ] Disk space adequate (>20GB free)
- [ ] Log rotation configured (logrotate for nginx_logs volume)
- [ ] VPS firewall: only 22 (SSH), 80 (HTTP), 443 (HTTPS) open

## Application

- [ ] /api/v1/health returns {"status":"ok"}
- [ ] Admin login works with production credentials
- [ ] Partner login works with production credentials
- [ ] Public landing page loads correctly
- [ ] Lead form submission creates lead in CRM
- [ ] Partner attribution works (test with referral code)
- [ ] Commission rules trigger on status change
- [ ] AI scoring works OR graceful fallback is confirmed (score=30 default)

## Monitoring (Setup Before Go-Live)

- [ ] Log alerts for error-level backend logs
- [ ] Disk space alert at 80% usage
- [ ] Health endpoint monitoring (external uptime check)
- [ ] Backup completion alerts
- [ ] Container restart alerts

## Legal/Compliance

- [ ] Privacy policy accessible from landing page
- [ ] Terms of service for partners
- [ ] GDPR compliance: data deletion process defined for lead data
- [ ] Commission agreement template reviewed by legal
- [ ] Data processing agreement (DPA) with client signed if applicable
