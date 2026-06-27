-- Fix exercise_answers foreign key constraint
-- Issue: FK constraint points to cross_article_questions only
-- Need: question_id should support both 'questions' and 'cross_article_questions' tables
-- Solution: Drop the FK constraint since question_id needs to be flexible

-- Drop the foreign key constraint
ALTER TABLE exercise_answers
  DROP CONSTRAINT IF EXISTS exercise_answers_question_id_fkey;

-- Verify constraint is gone
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'exercise_answers'::regclass;

-- Expected result: Should NOT see exercise_answers_question_id_fkey anymore
-- session_id FK should still exist (that one is correct)
