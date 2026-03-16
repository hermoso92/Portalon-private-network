---
name: sales-demo-prep
description: Preparador de demos comerciales de Portalon. Úsame para preparar el entorno de demo, verificar datos de seed, construir el guion de 3 minutos o chequear que todo funciona antes de una presentación.
---

# Sales Demo Prep — Portalon

## Guion de demo de 3 minutos

### Minuto 1: Vista admin — pipeline activo

1. Login: `admin@portalon.com` / `Portalon2024!`
2. Dashboard → mostrar KPIs: leads activos, comisiones pendientes, conversión
3. Leads → pipeline con 8 leads visibles en distintos estados
4. Destacar: Michael Davidson (WON, 345k€) y Sophie Laurent (RESERVED, 265k€)
5. Abrir detalle de Davidson → timeline completo, score IA 94, AI summary visible

### Minuto 2: Vista partner — su red privada

1. Login: `partner@demo.com` / `Partner2024!` (en otra ventana / incógnito)
2. Dashboard partner → sus leads, comisiones pendientes (3.975€ + 10.350€)
3. Leads del partner → sólo los suyos (CARL9X2F)
4. Código de referral visible: `CARL9X2F` → mostrar URL de landing
5. Materiales de venta disponibles

### Minuto 3: Flujo de captura en vivo

1. Abrir landing: `/promocion/el-portalon-del-brillante?ref=CARL9X2F`
2. Rellenar formulario con lead ficticio
3. Volver al admin → lead aparece NEW con partnerId de Carlos García
4. Mostrar scoring IA ejecutándose (si OpenClaw activo) o score 50 por defecto
5. Mover lead a QUALIFIED → pipeline avanza

## Verificación pre-demo (checklist)

```bash
# 1. Verificar seed
cd backend && npx prisma db seed

# 2. Confirmar leads en todos los estados
docker compose exec backend npx prisma studio
# O via API:
curl -s http://localhost:3001/api/v1/health

# 3. Login admin funciona
curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@portalon.com","password":"Portalon2024!"}' | jq .user.role

# 4. Login partner funciona
curl -s -X POST http://localhost:3001/api/v1/partners/login \
  -H "Content-Type: application/json" \
  -d '{"email":"partner@demo.com","password":"Partner2024!"}' | jq .partner.referralCode
```

## Datos de demo disponibles

| Lead | Estado | Partner | Comisión |
|------|--------|---------|---------|
| Michael Davidson (UK) | WON | CARL9X2F | 15.525€ |
| Sophie Laurent (FR) | RESERVED | CARL9X2F | 3.975€ pdte |
| Klaus Weber (DE) | VISITED | ANAT8K3M | — |
| Isabelle Moreau (FR) | VISIT_SCHEDULED | ANAT8K3M | — |
| David Chen (HK) | CONTACTED | directo | — |
| Emma Johnson (UK) | NEW | directo | — |
| Pedro Alves (PT) | NEW | CARL9X2F | — |
| Thomas Müller (DE) | LOST | ANAT8K3M | — |

## Partners disponibles para demo

- **Carlos García** (`partner@demo.com`, CARL9X2F) — APPROVED, 2 comisiones activas
- **Ana Torres** (`ana.torres@demo.com`, ANAT8K3M) — APPROVED, sin comisiones (para mostrar flujo)
- **Roberto Sanz** (`pendiente@demo.com`, ROBE2W9P) — PENDING (para mostrar flujo de aprobación)
