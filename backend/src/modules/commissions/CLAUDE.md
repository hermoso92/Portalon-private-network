# Commissions Module - CLAUDE.md

## Purpose

Manages commission rules (per promotion) and commission events (per lead). Commissions are computed automatically when a lead reaches `RESERVED` or `WON` status. The system is deduplication-safe and audit-friendly.

---

## Data Model

### CommissionRule
- Belongs to a `Promotion`
- `triggerType`: `ON_RESERVATION` | `ON_SALE` | `ON_VISIT` | `ON_LEAD`
- `calculationType`: `PERCENTAGE_OF_SALE` | `FIXED_AMOUNT`
- `amount`: percentage (e.g., `1.5` = 1.5%) or fixed euros
- `isActive`: can be disabled without deleting

### CommissionEvent
- Created automatically by `processLeadEvent()`
- Links `Lead` → `Partner` → `Promotion`
- `status`: `PENDING` → `APPROVED` → `PAID` (or `CANCELLED` / `DISPUTED`)
- Idempotent: one event per `(leadId, triggerType)` combination

---

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/commissions/rules` | SUPER_ADMIN | Create commission rule |
| GET | `/commissions/rules/:promotionId` | ADMIN+ | List rules for promotion |
| GET | `/commissions` | ADMIN+ | List events (filterable) |
| GET | `/commissions/:id` | ADMIN+ | Event detail |
| PATCH | `/commissions/:id/status` | SUPER_ADMIN | Approve/pay/cancel event |
| POST | `/commissions/:leadId/recalculate` | SUPER_ADMIN | Recalculate (if status changed) |
| GET | `/commissions/partner/:id/summary` | ADMIN+ | Partner commission summary |

---

## Auto-Trigger Flow

Called from `LeadsController.changeStatus()`:
```typescript
if (dto.status === 'RESERVED' || dto.status === 'WON') {
  this.commissionsService.processLeadEvent(id, dto.status).catch(() => {});
}
```

`processLeadEvent()` logic:
1. Load lead with `unit` (for price) and `attribution` (for partner fallback)
2. Determine `partnerId` = `lead.partnerId || lead.attribution?.partnerId`
3. If no partner → return (no commission for unattributed leads)
4. Check deduplication: find existing event for `(leadId, triggerType)`
5. If exists → return (idempotent)
6. Find active rules for `(promotionId, triggerType)`
7. Apply first matching rule (only one per trigger type expected)
8. Calculate amount:
   - `PERCENTAGE_OF_SALE`: `(unit.price * rule.amount) / 100`
   - `FIXED_AMOUNT`: `rule.amount`
9. Create `CommissionEvent` with `status: PENDING`

---

## Status Workflow

```
PENDING → APPROVED → PAID
         ↓
      CANCELLED
         ↓
      DISPUTED → RESOLVED (via notes)
```

Status changes via `updateStatus(id, status, notes)` - admin only.

---

## Demo Data Commissions (from seed)

| Lead | Partner | Event | Amount | Status |
|------|---------|-------|--------|--------|
| Michael Davidson (WON) | Carlos García | ON_RESERVATION | €5,175 | PAID |
| Michael Davidson (WON) | Carlos García | ON_SALE | €10,350 | PENDING |
| Sophie Laurent (RESERVED) | Carlos García | ON_RESERVATION | €3,975 | PENDING |

---

## Module Dependencies

```
CommissionsModule
  imports: (none - uses PrismaModule globally)
  exports: CommissionsService
```

Note: `LeadsModule` imports `CommissionsModule` via `forwardRef()` to prevent circular dependency.
