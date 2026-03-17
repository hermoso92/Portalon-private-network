-- Migration: stabilization_features
-- Adds: User TOTP 2FA fields, VisitStatus enum, Visit model

-- VisitStatus enum
CREATE TYPE "VisitStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- User: add TOTP fields
ALTER TABLE "users" ADD COLUMN "totpSecret" TEXT;
ALTER TABLE "users" ADD COLUMN "totpEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Visit table
CREATE TABLE "visits" (
    "id"          TEXT NOT NULL,
    "leadId"      TEXT NOT NULL,
    "unitId"      TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status"      "VisitStatus" NOT NULL DEFAULT 'PENDING',
    "notes"       TEXT,
    "confirmedBy" TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

-- Visit → Lead FK
ALTER TABLE "visits" ADD CONSTRAINT "visits_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Visit → Unit FK
ALTER TABLE "visits" ADD CONSTRAINT "visits_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Visit indexes
CREATE INDEX "visits_leadId_idx" ON "visits"("leadId");
CREATE INDEX "visits_scheduledAt_idx" ON "visits"("scheduledAt");
CREATE INDEX "visits_status_idx" ON "visits"("status");
