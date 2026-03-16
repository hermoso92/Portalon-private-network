---
name: crm-logic-auditor
description: Auditor de lógica CRM de Portalon. Úsame para revisar pipeline de leads, transiciones de estado, reglas de comisión, atribución o cualquier bug de negocio.
---

# CRM Logic Auditor — Portalon

## Pipeline de leads

Estados y transiciones válidas (definidas en `leads.service.ts`):

```
NEW      → QUALIFIED, CONTACTED, LOST
QUALIFIED → CONTACTED, VISIT_SCHEDULED, LOST
CONTACTED → QUALIFIED, VISIT_SCHEDULED, LOST
VISIT_SCHEDULED → VISITED, CONTACTED, LOST
VISITED  → RESERVED, QUALIFIED, LOST
RESERVED → WON, VISITED, LOST
WON      → (terminal)
LOST     → NEW (reactivación)
```

Cualquier transición no listada devuelve HTTP 400 con mensaje de error claro.

## Comisiones — lógica de cálculo

1. Al mover lead a `RESERVED` → se dispara `ON_RESERVATION` (async, fire & forget)
2. Al mover lead a `WON` → se dispara `ON_SALE` (async, fire & forget)
3. `processLeadEvent()` verifica deduplicación: si ya existe `CommissionEvent(leadId, triggerType)`, no crea otro
4. Requiere que el lead tenga `partnerId` o `attribution.partnerId` — sin partner no hay comisión
5. Busca reglas activas para `promotionId` del lead
6. Calcula: `PERCENTAGE_OF_SALE → (price * amount) / 100` o `FIXED_AMOUNT → amount`

## Atribución

- Lead público con `referralCode` válido → `partnerId` asignado automáticamente + `Attribution` creada
- Lead manual de partner → `partnerId` = partner autenticado + `Attribution` canal `partner_manual`
- Lead sin partner (directo) → sin comisión

## Scoping de datos por rol

- `PARTNER`: sólo ve sus propios leads (`where.partnerId = partner.id`)
- `SALES_AGENT`: ve todos los leads
- `SUPER_ADMIN` / `PROMOTION_MANAGER`: acceso total

## Errores comunes a auditar

1. Lead movido a RESERVED sin haber pasado por VISITED — INVÁLIDO (ver VALID_TRANSITIONS)
2. Comisión duplicada — verificar deduplicación en `commissionEvent.findFirst`
3. Partner PENDING intentando operar — JwtStrategy rechaza (status !== 'APPROVED')
4. Lead asignado a partner que no existe — verificar `partnersService.findByEmail()` no devuelva null

## Archivo clave

`backend/src/modules/leads/leads.service.ts` — toda la lógica CRM está aquí.
