-- Migration: add avatar and bio fields to users table
-- Issue #26 — User profile routes

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bio"    TEXT;
