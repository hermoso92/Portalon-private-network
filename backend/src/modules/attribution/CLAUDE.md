# Attribution Module - CLAUDE.md

## Purpose

Tracks the source attribution for each lead - specifically which partner (if any) gets credit for bringing in a lead. Used by the commission system to identify which partner receives commission events.

---

## Data Model

### Attribution
- One-to-one with `Lead` (unique `leadId`)
- `partnerId` - the partner who gets credit
- `sourceChannel` - e.g., `'referral_link'`, `'partner_manual'`, `'landing'`
- `utmSource`, `utmMedium`, `utmCampaign`, `clickId` - marketing attribution data
- `attributionStatus`: `ACTIVE` | `OVERRIDDEN` | `DISPUTED` | `RESOLVED`

---

## Attribution Creation

Attribution records are created in `leads.service.ts`:

**Public form** (`createPublic`):
- If `referralCode` in form → find partner → create Attribution with `sourceChannel: 'referral_link'`
- UTM data from form is stored in both `lead.attributionData` (JSON) and `Attribution` record

**Partner manual** (`createByPartner`):
- Always creates Attribution with `sourceChannel: 'partner_manual'`

**Agent/direct** (`createByAgent`):
- No Attribution record created (no partner credit)

---

## Commission Integration

`CommissionsService.processLeadEvent()` uses attribution as a fallback for partnerId:
```typescript
const partnerId = lead.partnerId || lead.attribution?.partnerId;
```

This means if a lead was created without `partnerId` directly set, but has an Attribution record, the commission still flows to the attributed partner.

---

## AttributionService

`attribution.service.ts` provides helper methods (primarily used by future admin dispute resolution):
- Query attributions by partner
- Update attribution status (e.g., DISPUTED → RESOLVED)
- Attribution analytics

---

## Module

```
AttributionModule
  providers: [AttributionService]
  exports: [AttributionService]
```

No controller - attribution is managed indirectly through leads and commissions. Direct REST endpoints for attribution management can be added if dispute resolution UI is needed.
