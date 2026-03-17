-- Migration: P0 fixes — 2026-03-17
-- 1. @@unique([leadId, triggerType]) on CommissionEvent — eliminates race condition
-- 2. Compound indexes on leads and commission_events for query performance
-- 3. PartnerRefreshToken model for partner session management

-- ------------------------------------------------------------
-- 1. UNIQUE constraint: one commission event per (lead, trigger)
-- ------------------------------------------------------------
ALTER TABLE "commission_events"
  ADD CONSTRAINT "commission_events_leadId_triggerType_key"
  UNIQUE ("leadId", "triggerType");

-- ------------------------------------------------------------
-- 2. Compound + missing indexes on leads
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "leads_email_idx" ON "leads"("email");
CREATE INDEX IF NOT EXISTS "leads_promotionId_status_idx" ON "leads"("promotionId", "status");
CREATE INDEX IF NOT EXISTS "leads_partnerId_status_idx" ON "leads"("partnerId", "status");
CREATE INDEX IF NOT EXISTS "leads_partnerId_createdAt_idx" ON "leads"("partnerId", "createdAt");

-- ------------------------------------------------------------
-- 3. Compound index on commission_events
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "commission_events_partnerId_status_idx"
  ON "commission_events"("partnerId", "status");

-- ------------------------------------------------------------
-- 4. PartnerRefreshToken table
-- ------------------------------------------------------------
CREATE TABLE "partner_refresh_tokens" (
    "id"        TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "token"     TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "partner_refresh_tokens_token_key"
  ON "partner_refresh_tokens"("token");

CREATE INDEX "partner_refresh_tokens_token_idx"
  ON "partner_refresh_tokens"("token");

CREATE INDEX "partner_refresh_tokens_partnerId_idx"
  ON "partner_refresh_tokens"("partnerId");

ALTER TABLE "partner_refresh_tokens"
  ADD CONSTRAINT "partner_refresh_tokens_partnerId_fkey"
  FOREIGN KEY ("partnerId")
  REFERENCES "partners"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
