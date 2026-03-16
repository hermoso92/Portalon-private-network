# Checklist Pre-Reunión — Portalon Private Network

Completa este checklist antes de abrir el portátil en la reunión. Tiempo estimado: 10 minutos.

---

## 1. Servicios levantados

```bash
cd /opt/portalon/infrastructure   # o ruta local
docker compose ps
```

- [ ] `backend` → `Up` (puerto 3001)
- [ ] `frontend` → `Up` (puerto 3000)
- [ ] `postgres` → `Up`
- [ ] `redis` → `Up`
- [ ] `nginx` → `Up` (puerto 80/443)

Verificar salud del backend:
```bash
curl -s http://localhost:3001/api/v1/health | jq .
```

---

## 2. Seed data cargado y verificado

Si es la primera vez o la base de datos está limpia:
```bash
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma db seed
```

Verificar datos con una llamada rápida:
```bash
# Login admin y verificar que devuelve token
curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@portalon.com","password":"Portalon2024!"}' | jq .accessToken
```

- [ ] Seed ejecutado sin errores
- [ ] 11+ leads visibles en `/admin/leads` (pipeline completo)
- [ ] Michael Davidson aparece con estado WON y score 94
- [ ] David Chen aparece con alerta roja "Requiere revisión manual"
- [ ] Comisiones de Carlos García: 15.525€ en Davidson + 3.975€ en Sophie

---

## 3. Ventanas del navegador preparadas

**Ventana A (modo normal) — Panel Admin**
- URL: `http://localhost:3000`
- Login: `admin@portalon.com` / `Portalon2024!`
- Navegar a: Dashboard → Leads

**Ventana B (modo incógnito) — Panel Partner**
- URL: `http://localhost:3000`
- Login: `partner@demo.com` / `Partner2024!`
- Navegar a: Dashboard partner

**Pestaña extra preparada (para minuto 4)**
- URL lista para pegar: `http://localhost:3000/promocion/el-portalon-del-brillante?ref=CARL9X2F`

- [ ] Ventana A abierta y logada como admin
- [ ] Ventana B abierta en incógnito y logada como partner (Carlos García)
- [ ] Landing page cargando correctamente con `?ref=CARL9X2F`

---

## 4. Verificación de pantallas clave

### Dashboard Admin
- [ ] KPI "Total leads" visible con número correcto
- [ ] KPI "Comisión pendiente" visible (≈ 14.325€)
- [ ] KPI "Comisiones generadas" visible
- [ ] Subtitle: "Red de distribución activa"
- [ ] Gráficos de leads y unidades visibles

### Lead Detail — Michael Davidson (WON)
- [ ] Score 94 con fondo verde y etiqueta "Caliente"
- [ ] Resumen IA visible: "Inversor puro, perfil cash buyer..."
- [ ] Comisiones: "Comisión de reserva" 5.175€ + "Comisión de venta" 10.350€
- [ ] Timeline con actividades: llamadas, emails, cambios de estado

### Lead Detail — David Chen (CONTACTED)
- [ ] Alerta roja visible: "Requiere revisión manual"
- [ ] Flag `offshore_funds` (HIGH) visible con descripción
- [ ] Badge "Riesgo alto" visible en la card de flags
- [ ] Score 45, etiqueta "Templado"

### Dashboard Partner (Carlos García)
- [ ] KPI "Comisión pendiente" visible
- [ ] KPI "Comisión total generada" visible
- [ ] Caption referral: "Comparte este enlace con tus clientes inversores"
- [ ] Código `CARL9X2F` visible
- [ ] 4 leads visibles (los suyos únicamente)

---

## 5. Credenciales visibles (tener a mano)

| Rol | Email | Password |
|-----|-------|----------|
| Admin | admin@portalon.com | Portalon2024! |
| Agente | comercial@portalon.com | Agent2024! |
| Partner Carlos | partner@demo.com | Partner2024! |
| Partner Ana | ana.torres@demo.com | Partner2024! |

---

## 6. URLs de demo apuntadas

```
Admin dashboard:    http://localhost:3000/admin/dashboard
Admin leads:        http://localhost:3000/admin/leads
Partner dashboard:  http://localhost:3000/partner/dashboard
Landing + ref:      http://localhost:3000/promocion/el-portalon-del-brillante?ref=CARL9X2F
```

---

## 7. Script de demo

- [ ] Script impreso o en segundo monitor: `docs/business/demo-script.md`
- [ ] Duración ensayada: 4 minutos en limpio
- [ ] Respuestas a preguntas frecuentes memorizadas

---

## Si algo falla en directo

**Frontend no carga**: Verificar `docker compose ps` y reiniciar con `docker compose restart frontend`

**Login falla**: Verificar que el seed se ejecutó. Ejecutar `npx prisma db seed` de nuevo (es idempotente para usuarios y promoción)

**Leads no aparecen**: El seed no crea leads si ya existen. Si hay datos sucios:
```bash
docker compose exec backend npx prisma migrate reset --force
docker compose exec backend npx prisma db seed
```
⚠️ Esto borra todos los datos. Solo en entorno de demo.

**IA no disponible**: Los leads del seed tienen scores precalculados (94, 87, 72...). No afecta a la demo principal. Scores de leads nuevos serán 30 (fallback visible).
