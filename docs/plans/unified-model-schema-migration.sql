-- Unified Data Model Schema Migration
-- Tickets: #024 (Log anonymous user quiz answers), #025 (Log all exercise attempt data)
--
-- Run this in Supabase SQL Editor BEFORE deploying code changes
-- This extends exercise_sessions to support all exercise types and enables anonymous user tracking

-- ============================================================================
-- Step 1: Extend exercise_sessions table
-- ============================================================================

-- Add article_id if not already present (should exist from weight-training, but verify)
ALTER TABLE exercise_sessions
  ADD COLUMN IF NOT EXISTS article_id text REFERENCES articles(id);

-- Add metadata column for flexible future extensions
ALTER TABLE exercise_sessions
  ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Update CHECK constraint on kind to include 'article-quiz'
ALTER TABLE exercise_sessions
  DROP CONSTRAINT IF EXISTS exercise_sessions_kind_check;

ALTER TABLE exercise_sessions
  ADD CONSTRAINT exercise_sessions_kind_check
  CHECK (kind IN ('regular', 'revision', 'weight-training', 'dse-training', 'article-quiz'));

-- ============================================================================
-- Step 2: Create exercise_answers table if not exists
-- ============================================================================

CREATE TABLE IF NOT EXISTS exercise_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES exercise_sessions(id) ON DELETE CASCADE,
  question_id text NOT NULL,  -- Supports both UUID strings and legacy numeric IDs
  user_answer text,
  is_correct boolean NOT NULL,
  points_earned integer NOT NULL DEFAULT 1,
  answered_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_exercise_answers_session ON exercise_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_exercise_answers_question ON exercise_answers(question_id);

-- ============================================================================
-- Step 3: Update RLS policies for anonymous users
-- ============================================================================

-- Allow anonymous users to read/write their own sessions
DROP POLICY IF EXISTS "own exercise sessions" ON exercise_sessions;

CREATE POLICY "own exercise sessions" ON exercise_sessions
  FOR ALL
  USING (
    auth.uid() = user_id
    OR (auth.uid() IS NULL AND user_id IS NULL)  -- Allow anon users
  );

-- Allow anonymous users to read/write their own answers
DROP POLICY IF EXISTS "own exercise answers" ON exercise_answers;

CREATE POLICY "own exercise answers" ON exercise_answers
  FOR ALL
  USING (
    session_id IN (
      SELECT id FROM exercise_sessions
      WHERE user_id = auth.uid()
         OR (auth.uid() IS NULL AND user_id IS NULL)
    )
  );

-- Enable RLS on exercise_answers if not already enabled
ALTER TABLE exercise_answers ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Verification queries
-- ============================================================================

-- Verify schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'exercise_sessions'
ORDER BY ordinal_position;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'exercise_answers'
ORDER BY ordinal_position;

-- Verify CHECK constraint
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'exercise_sessions_kind_check';

-- Verify RLS policies
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('exercise_sessions', 'exercise_answers');

-- ============================================================================
-- Expected Results:
-- ============================================================================
-- exercise_sessions should have: article_id (text, nullable), metadata (jsonb, nullable)
-- exercise_answers should exist with all 7 columns
-- CHECK constraint should allow: 'regular', 'revision', 'weight-training', 'dse-training', 'article-quiz'
-- RLS policies should allow: (auth.uid() = user_id OR (auth.uid() IS NULL AND user_id IS NULL))
