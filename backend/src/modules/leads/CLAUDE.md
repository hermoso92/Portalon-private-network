# Leads Module - CLAUDE.md

## Purpose

Core CRM pipeline. Manages the full lead lifecycle from initial capture (public form or partner referral) through qualification, visits, reservation, and sale/loss. Integrates with AI scoring, commission processing, and attribution tracking.

---

## Files

```
leads/
├── leads.module.ts          # Imports: AiModule, CommissionsModule (forwardRef), PartnersModule
├── leads.controller.ts      # REST endpoints
├── leads.service.ts         # Business logic + pipeline validation
└── dto/
    ├── create-lead-public.dto.ts  # Public form (includes UTM, referralCode)
    ├── create-lead.dto.ts         # Authenticated creation (partner/agent)
    ├── update-lead.dto.ts         # Partial update
    ├── change-status.dto.ts       # Status transition + optional note
    └── filter-leads.dto.ts        # Query filters (search, status, source, pagination)
```

---

## Pipeline Transitions

```
NEW → QUALIFIED, CONTACTED, LOST
QUALIFIED → CONTACTED, VISIT_SCHEDULED, LOST
CONTACTED → QUALIFIED, VISIT_SCHEDULED, LOST
VISIT_SCHEDULED → VISITED, CONTACTED, LOST
VISITED → RESERVED, QUALIFIED, LOST
RESERVED → WON, VISITED, LOST
WON → (terminal, no transitions)
LOST → NEW (reactivation only)
```

Invalid transitions throw `BadRequestException(400)`. Validated in `leads.service.ts` via `VALID_TRANSITIONS` map before any DB write.

---

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/leads/public` | Public | Create lead from landing form |
| POST | `/leads` | PARTNER/AGENT+ | Create lead manually |
| GET | `/leads` | PARTNER/AGENT+ | List leads (scoped for PARTNER) |
| GET | `/leads/:id` | PARTNER/AGENT+ | Lead detail + timeline |
| PATCH | `/leads/:id` | AGENT+ | Update lead fields |
| PATCH | `/leads/:id/status` | AGENT+ | Pipeline transition |
| POST | `/leads/:id/score` | AGENT+ | Manual AI re-score |

---

## Partner Scoping (Security)

In `findAll()`, if `userRole === 'PARTNER'`, the query adds `where.partnerId = partnerId`. Partners are physically restricted to their own leads via SQL - there is no client-side filtering.

---

## AI Scoring

Triggered via `triggerAiScore()` private method:
- Called fire-and-forget after `createPublic`, `create`, and `score` endpoints
- Uses `Promise.all([classifyLead, summarizeLead, detectRiskFlags])`
- Updates `lead.score`, `lead.aiSummary`, `lead.aiRiskFlags` via `updateAiScore()`
- Failures are caught and logged; never propagate to the caller

---

## Commission Trigger

In `changeStatus()` controller:
```typescript
if (dto.status === 'RESERVED' || dto.status === 'WON') {
  this.commissionsService.processLeadEvent(id, dto.status).catch(() => {});
}
```

Fire-and-forget. Deduplication is in `CommissionsService.processLeadEvent()`.

---

## Activity Log

Every state change creates a `LeadActivity` record:
- `STATUS_CHANGE` with `{ previousStatus, newStatus, note }`
- `NOTE_ADDED` when `dto.notes` is provided in an update
- `STATUS_CHANGE` on creation (source: `public_form`, `partner_manual`, `agent_manual`)

Timeline is returned in `findOne()` via `include.activities`.

---

## Attribution Flow

Public form:
1. If `referralCode` present → find `Partner` by referralCode
2. If partner found and APPROVED → set `lead.partnerId` + create `Attribution` record
3. Lead `sourceType` = `PARTNER_REFERRAL` if partner, `LANDING_PUBLIC` otherwise

Partner manual creation:
1. Creates `Attribution` with `sourceChannel: 'partner_manual'`
2. `sourceType` = `PARTNER_MANUAL`

---

## Module Dependencies

```
LeadsModule
  imports:
    - AiModule (AiService)
    - CommissionsModule (forwardRef - circular dep prevention)
    - PartnersModule (PartnersService for findByEmail)
  exports:
    - LeadsService
```

The `forwardRef` on CommissionsModule is necessary because CommissionsModule imports LeadsModule for recalculation.
