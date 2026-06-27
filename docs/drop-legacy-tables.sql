-- Phase 2: Drop Legacy Tables
-- Execute this in Supabase SQL Editor after verifying Phase 1 works correctly

-- Step 1: Clear all data from legacy tables (optional safety step)
DELETE FROM quiz_answers;
DELETE FROM quiz_attempts;

-- Step 2: Drop the tables
DROP TABLE IF EXISTS quiz_answers CASCADE;
DROP TABLE IF EXISTS quiz_attempts CASCADE;

-- Verification queries (run after dropping):
-- These should return "relation does not exist" errors, confirming tables are dropped
-- SELECT * FROM quiz_answers LIMIT 1;
-- SELECT * FROM quiz_attempts LIMIT 1;

-- Expected result: All legacy tables removed
-- exercise_sessions and exercise_answers now contain all quiz history
