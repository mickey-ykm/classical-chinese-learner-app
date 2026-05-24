-- Phase 7 Schema Additions (2026-05-24)
-- Run once in Supabase SQL editor

-- 1. DSE core article flag
ALTER TABLE articles ADD COLUMN IF NOT EXISTS is_dse_core boolean NOT NULL DEFAULT false;

-- 2. New question columns
ALTER TABLE questions ADD COLUMN IF NOT EXISTS select_count int NOT NULL DEFAULT 1;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS sequence_tokens jsonb;

-- 3. Add sentence-order format
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_format_check;
ALTER TABLE questions ADD CONSTRAINT questions_format_check
  CHECK (format IN ('mc','fill-blank','sentence-order'));

-- 4. Add dse-training session kind
ALTER TABLE exercise_sessions DROP CONSTRAINT IF EXISTS exercise_sessions_kind_check;
ALTER TABLE exercise_sessions ADD CONSTRAINT exercise_sessions_kind_check
  CHECK (kind IN ('regular','revision','weight-training','dse-training'));
