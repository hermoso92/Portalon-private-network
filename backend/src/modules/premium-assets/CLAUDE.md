# Premium Assets Module - CLAUDE.md

## Purpose

Extends Portalon Private Network into a **Premium Asset Operations** hub.
Supports multi-mode asset management: `SALE | SHORT_STAY | MID_TERM | LONG_TERM`.

This module does NOT replace any existing module. It adds new surface area on top of
the existing `Unit`, `Promotion`, `Lead`, and `Partner` models.

---

## Files

```
premium-assets/
├── premium-assets.module.ts         # Module definition
├── premium-assets.service.ts        # Business logic
├── premium-assets.controller.ts     # REST endpoints (public + admin)
└── dto/
    ├── catalog-filter.dto.ts        # Query params: operationMode, assetStatus, promotionId, page, limit
    ├── set-unit-operation.dto.ts    # operationMode + assetStatus patch (at least one required)
    ├── submit-inquiry.dto.ts        # Public inquiry form (maps to Lead)
    ├── create-owner.dto.ts          # Create Owner record
    ├── update-owner.dto.ts          # Partial update (PartialType)
    ├── assign-operator.dto.ts       # Assign management operator to unit
    ├── create-availability-block.dto.ts  # Block dates for a unit
    ├── create-pricing-profile.dto.ts     # Pricing profile per mode
    └── update-pricing-profile.dto.ts     # Partial update (PartialType)
```

---

## Endpoints

### Public (no auth — `@Public()`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/premium-assets/catalog` | Paginated catalog, filters: operationMode / assetStatus / promotionId. OFF_MARKET excluded by default. |
| GET | `/premium-assets/catalog/:id` | Single asset with active pricing + upcoming availability blocks |
| POST | `/premium-assets/inquiries` | Submit inquiry → creates a Lead in CRM |

### Admin (require `JwtAuthGuard + RolesGuard`)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/premium-assets/units/:id/summary` | SUPER_ADMIN, PROMOTION_MANAGER, SALES_AGENT | Full unit: owner, active operator, pricing, upcoming blocks |
| PATCH | `/premium-assets/units/:id/operation` | SUPER_ADMIN, PROMOTION_MANAGER | Set operationMode / assetStatus |
| POST | `/premium-assets/owners` | SUPER_ADMIN, PROMOTION_MANAGER | Create owner |
| GET | `/premium-assets/owners` | SUPER_ADMIN, PROMOTION_MANAGER, SALES_AGENT | List owners with units |
| PUT | `/premium-assets/owners/:id` | SUPER_ADMIN, PROMOTION_MANAGER | Update owner |
| GET | `/premium-assets/units/:id/operators` | SUPER_ADMIN, PROMOTION_MANAGER, SALES_AGENT | List operator assignments |
| POST | `/premium-assets/units/:id/operator` | SUPER_ADMIN, PROMOTION_MANAGER | Assign operator |
| GET | `/premium-assets/units/:id/availability` | SUPER_ADMIN, PROMOTION_MANAGER, SALES_AGENT | List availability blocks |
| POST | `/premium-assets/units/:id/availability` | SUPER_ADMIN, PROMOTION_MANAGER | Create availability block |
| DELETE | `/premium-assets/availability/:id` | SUPER_ADMIN, PROMOTION_MANAGER | Delete availability block |
| GET | `/premium-assets/units/:id/pricing` | SUPER_ADMIN, PROMOTION_MANAGER, SALES_AGENT | List pricing profiles |
| POST | `/premium-assets/units/:id/pricing` | SUPER_ADMIN, PROMOTION_MANAGER | Create pricing profile |
| PATCH | `/premium-assets/pricing/:id` | SUPER_ADMIN, PROMOTION_MANAGER | Update pricing profile |

---

## Data Model (Prisma)

New enums (migration `20260316000000_premium_assets_extension`):
- `OperationMode`: SALE | SHORT_STAY | MID_TERM | LONG_TERM
- `AssetStatus`: AVAILABLE | RESERVED | OCCUPIED | MAINTENANCE | OFF_MARKET
- `OwnerType`: INDIVIDUAL | COMPANY (use COMPANY for family offices too)
- `OperatorAssignmentStatus`: ACTIVE | INACTIVE
- `AvailabilityBlockReason`: BLOCKED | MAINTENANCE | RESERVED | OCCUPIED
- `PriceUnit`: TOTAL | PER_NIGHT | PER_MONTH | PER_YEAR
- `InquiryType`: PURCHASE | SHORT_STAY_BOOKING | MID_TERM_RENTAL | LONG_TERM_RENTAL | INFORMATION

New tables:
- `owners` — email is unique, type is INDIVIDUAL or COMPANY
- `operator_assignments` — commissionRate stored as decimal (0.18 = 18%)
- `availability_blocks` — date range + reason per unit
- `pricing_profiles` — priceUnit must match operationMode semantically

Extended:
- `units` — added `operationMode` (default SALE), `assetStatus` (default AVAILABLE), `ownerId` (nullable FK)

---

## Behavior Invariants

1. **Public catalog excludes OFF_MARKET** unless `assetStatus=OFF_MARKET` is explicitly passed
2. **`setUnitOperation` requires at least one field** — empty body returns 400
3. **Date validation** uses `new Date()` conversion before comparison — no string comparison
4. **Inquiry → Lead** mapping uses `unit.promotionId` to find the required `promotionId`
5. **No circular dependency** — PremiumAssetsService writes to Lead/Attribution tables directly via PrismaService, never imports LeadsService

---

## Module Dependencies

```
PremiumAssetsModule
  imports:
    - PrismaModule (global — no explicit import needed)
  exports:
    - PremiumAssetsService
```

No circular dependencies. PrismaModule is declared global in `app.module.ts`.
