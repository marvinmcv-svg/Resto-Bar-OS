-- Add noShowCount to Guest model
ALTER TABLE "Guest" ADD COLUMN IF NOT EXISTS "noShowCount" INTEGER NOT NULL DEFAULT 0;
