-- Fix RLS policies for exercise_answers
-- Issue: exercise_answers not being saved for revision and DSE training
-- Root cause: Complex RLS policy may be failing on INSERT

-- Drop existing policies
DROP POLICY IF EXISTS "own exercise answers" ON exercise_answers;
DROP POLICY IF EXISTS "Users can view their own exercise answers" ON exercise_answers;
DROP POLICY IF EXISTS "Users can insert their own exercise answers" ON exercise_answers;

-- Create separate policies for INSERT and SELECT for clarity
-- INSERT policy: Allow if user owns the session (checked via FK + session ownership)
-- We can use a simpler policy since the session_id FK already enforces ownership
CREATE POLICY "insert own exercise answers" ON exercise_answers
  FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM exercise_sessions
      WHERE user_id = auth.uid()
         OR (auth.uid() IS NULL AND user_id IS NULL)
    )
  );

-- SELECT policy: Same logic for reading
CREATE POLICY "select own exercise answers" ON exercise_answers
  FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM exercise_sessions
      WHERE user_id = auth.uid()
         OR (auth.uid() IS NULL AND user_id IS NULL)
    )
  );

-- UPDATE/DELETE policies (for completeness)
CREATE POLICY "update own exercise answers" ON exercise_answers
  FOR UPDATE
  USING (
    session_id IN (
      SELECT id FROM exercise_sessions
      WHERE user_id = auth.uid()
         OR (auth.uid() IS NULL AND user_id IS NULL)
    )
  );

CREATE POLICY "delete own exercise answers" ON exercise_answers
  FOR DELETE
  USING (
    session_id IN (
      SELECT id FROM exercise_sessions
      WHERE user_id = auth.uid()
         OR (auth.uid() IS NULL AND user_id IS NULL)
    )
  );

-- Verify policies
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'exercise_answers'
ORDER BY cmd, policyname;
