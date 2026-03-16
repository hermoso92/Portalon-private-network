# Premium Assets Module - CLAUDE.md

## Purpose

Extends the Portalon Private Network platform beyond real estate sales into a full
**Premium Asset Operations** hub. Supports multi-mode asset management:
`SALE | SHORT_STAY | MID_TERM | LONG_TERM`.

This module does NOT replace any existing module. It adds new surface area on top of
the existing `Unit`, `Promotion`, and `Lead` models.

---

## Files

```
premium-assets/
├── premium-assets.module.ts         # Module definition
├── premium-assets.service.ts        # Business logic
├── premium-assets.controller.ts     # REST endpoints (public + admin)
└── dto/
    ├── catalog-filter.dto.ts        # Query params for public catalog
    ├── set-unit-operation.dto.ts    # operationMode + assetStatus patch
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

### Public (no auth - use `@Public()`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/premium-assets/catalog` | Paginated catalog, filter by operationMode / assetStatus |
| GET | `/premium-assets/catalog/:id` | Single asset with pricing + upcoming blocks |
| POST | `/premium-assets/inquiries` | Submit inquiry → creates a Lead |

### Admin (require `JwtAuthGuard` + `RolesGuard`)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| PATCH | `/premium-assets/units/:id/operation` | SUPER_ADMIN, PROMOTION_MANAGER | Set operationMode / assetStatus |
| POST | `/premium-assets/owners` | SUPER_ADMIN, PROMOTION_MANAGER | Create owner |
| GET | `/premium-assets/owners` | SUPER_ADMIN, PROMOTION_MANAGER, SALES_AGENT | List owners with units |
| PUT | `/premium-assets/owners/:id` | SUPER_ADMIN, PROMOTION_MANAGER | Update owner |
| POST | `/premium-assets/units/:id/operator` | SUPER_ADMIN, PROMOTION_MANAGER | Assign operator |
| GET | `/premium-assets/units/:id/availability` | SUPER_ADMIN, PROMOTION_MANAGER, SALES_AGENT | List availability blocks |
| POST | `/premium-assets/units/:id/availability` | SUPER_ADMIN, PROMOTION_MANAGER | Create availability block |
| DELETE | `/premium-assets/availability/:id` | SUPER_ADMIN, PROMOTION_MANAGER | Delete availability block |
| GET | `/premium-assets/units/:id/pricing` | SUPER_ADMIN, PROMOTION_MANAGER, SALES_AGENT | List pricing profiles |
| POST | `/premium-assets/units/:id/pricing` | SUPER_ADMIN, PROMOTION_MANAGER | Create pricing profile |
| PATCH | `/premium-assets/pricing/:id` | SUPER_ADMIN, PROMOTION_MANAGER | Update pricing profile |

---

## Data Model (Prisma)

New enums added to `schema.prisma`:
- `OperationMode`: SALE | SHORT_STAY | MID_TERM | LONG_TERM
- `AssetStatus`: AVAILABLE | RESERVED | OCCUPIED | MAINTENANCE | OFF_MARKET
- `OwnerType`: INDIVIDUAL | COMPANY
- `OperatorAssignmentStatus`: ACTIVE | INACTIVE
- `AvailabilityBlockReason`: BLOCKED | MAINTENANCE | RESERVED | OCCUPIED
- `PriceUnit`: TOTAL | PER_NIGHT | PER_MONTH | PER_YEAR
- `InquiryType`: PURCHASE | SHORT_STAY_BOOKING | MID_TERM_RENTAL | LONG_TERM_RENTAL | INFORMATION

New tables (migration: `20260316000000_premium_assets_extension`):
- `owners` - Asset owners (individual or company)
- `operator_assignments` - Management operator assignments per unit
- `availability_blocks` - Date-range blocks (maintenance, reservation, etc.)
- `pricing_profiles` - Pricing per operation mode per unit

Extended table:
- `units` - Added `operationMode`, `assetStatus`, `ownerId` (FK to owners)

---

## Inquiry → Lead Mapping

`submitInquiry()` maps the public inquiry form to a `Lead` record:
- `unitId` is resolved to find `promotionId` (required by Lead model)
- `referralCode` is resolved to a `Partner` (same flow as `leads.service.createPublic`)
- `inquiryType` is stored in `lead.notes` as a prefix and in `lead.attributionData`
- An `Attribution` record is created if a partner is resolved

This means all inquiries become first-class leads visible in the CRM immediately.

---

## Module Dependencies

```
PremiumAssetsModule
  imports:
    - PrismaModule (global - no explicit import needed)
  exports:
    - PremiumAssetsService
```

No circular dependencies. Does not import LeadsModule or any other feature module.
Operates directly on Prisma models for Lead/Attribution creation to avoid circular refs.
