-- Portalon Private Network - Database initialization
-- This script runs on first PostgreSQL startup

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search

-- Set timezone
SET timezone = 'Europe/Madrid';
