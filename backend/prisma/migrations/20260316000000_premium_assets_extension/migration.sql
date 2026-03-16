-- Migration: premium_assets_extension
-- Adds Premium Asset Operations models to the Portalon Private Network platform.
-- New enums: OperationMode, AssetStatus, OwnerType, OperatorAssignmentStatus,
--            AvailabilityBlockReason, PriceUnit, InquiryType
-- New tables: owners, operator_assignments, availability_blocks, pricing_profiles
-- Altered table: units (operationMode, assetStatus, ownerId columns + FK)

-- ============================================================
-- NEW ENUMS
-- ============================================================

CREATE TYPE "OperationMode" AS ENUM ('SALE', 'SHORT_STAY', 'MID_TERM', 'LONG_TERM');

CREATE TYPE "AssetStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'OCCUPIED', 'MAINTENANCE', 'OFF_MARKET');

CREATE TYPE "OwnerType" AS ENUM ('INDIVIDUAL', 'COMPANY');

CREATE TYPE "OperatorAssignmentStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TYPE "AvailabilityBlockReason" AS ENUM ('BLOCKED', 'MAINTENANCE', 'RESERVED', 'OCCUPIED');

CREATE TYPE "PriceUnit" AS ENUM ('TOTAL', 'PER_NIGHT', 'PER_MONTH', 'PER_YEAR');

CREATE TYPE "InquiryType" AS ENUM ('PURCHASE', 'SHORT_STAY_BOOKING', 'MID_TERM_RENTAL', 'LONG_TERM_RENTAL', 'INFORMATION');

-- ============================================================
-- NEW TABLE: owners
-- ============================================================

CREATE TABLE "owners" (
    "id"        TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "email"     TEXT NOT NULL,
    "phone"     TEXT,
    "type"      "OwnerType" NOT NULL,
    "taxId"     TEXT,
    "notes"     TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owners_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "owners_email_key" ON "owners"("email");
CREATE INDEX "owners_email_idx" ON "owners"("email");
CREATE INDEX "owners_type_idx" ON "owners"("type");

-- ============================================================
-- ALTER TABLE: units - add premium asset columns
-- ============================================================

ALTER TABLE "units"
    ADD COLUMN "operationMode" "OperationMode" DEFAULT 'SALE',
    ADD COLUMN "assetStatus"   "AssetStatus"   DEFAULT 'AVAILABLE',
    ADD COLUMN "ownerId"       TEXT;

CREATE INDEX "units_ownerId_idx" ON "units"("ownerId");
CREATE INDEX "units_operationMode_idx" ON "units"("operationMode");
CREATE INDEX "units_assetStatus_idx" ON "units"("assetStatus");

ALTER TABLE "units"
    ADD CONSTRAINT "units_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "owners"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- NEW TABLE: operator_assignments
-- ============================================================

CREATE TABLE "operator_assignments" (
    "id"             TEXT NOT NULL,
    "unitId"         TEXT NOT NULL,
    "operatorName"   TEXT NOT NULL,
    "operatorEmail"  TEXT NOT NULL,
    "operatorPhone"  TEXT,
    "startDate"      TIMESTAMP(3) NOT NULL,
    "endDate"        TIMESTAMP(3),
    "commissionRate" DECIMAL(5,4) NOT NULL,
    "notes"          TEXT,
    "status"         "OperatorAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operator_assignments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "operator_assignments_unitId_idx" ON "operator_assignments"("unitId");
CREATE INDEX "operator_assignments_status_idx" ON "operator_assignments"("status");
CREATE INDEX "operator_assignments_operatorEmail_idx" ON "operator_assignments"("operatorEmail");

ALTER TABLE "operator_assignments"
    ADD CONSTRAINT "operator_assignments_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "units"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- NEW TABLE: availability_blocks
-- ============================================================

CREATE TABLE "availability_blocks" (
    "id"        TEXT NOT NULL,
    "unitId"    TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate"   TIMESTAMP(3) NOT NULL,
    "reason"    "AvailabilityBlockReason" NOT NULL,
    "notes"     TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "availability_blocks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "availability_blocks_unitId_idx" ON "availability_blocks"("unitId");
CREATE INDEX "availability_blocks_startDate_endDate_idx" ON "availability_blocks"("startDate", "endDate");

ALTER TABLE "availability_blocks"
    ADD CONSTRAINT "availability_blocks_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "units"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- NEW TABLE: pricing_profiles
-- ============================================================

CREATE TABLE "pricing_profiles" (
    "id"            TEXT NOT NULL,
    "unitId"        TEXT NOT NULL,
    "operationMode" "OperationMode" NOT NULL,
    "basePrice"     DECIMAL(12,2) NOT NULL,
    "currency"      TEXT NOT NULL DEFAULT 'EUR',
    "priceUnit"     "PriceUnit" NOT NULL,
    "minStay"       INTEGER,
    "maxStay"       INTEGER,
    "notes"         TEXT,
    "isActive"      BOOLEAN NOT NULL DEFAULT true,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_profiles_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "pricing_profiles_unitId_idx" ON "pricing_profiles"("unitId");
CREATE INDEX "pricing_profiles_operationMode_idx" ON "pricing_profiles"("operationMode");
CREATE INDEX "pricing_profiles_isActive_idx" ON "pricing_profiles"("isActive");

ALTER TABLE "pricing_profiles"
    ADD CONSTRAINT "pricing_profiles_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "units"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
