-- Quick fix: Create exercise_answers table if missing
-- Run this in Supabase SQL Editor

-- Check if table exists first
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'exercise_answers') THEN

    -- Create the table
    CREATE TABLE exercise_answers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id uuid NOT NULL REFERENCES exercise_sessions(id) ON DELETE CASCADE,
      question_id uuid NOT NULL,
      user_answer text,
      is_correct boolean NOT NULL DEFAULT false,
      points_earned integer NOT NULL DEFAULT 0,
      created_at timestamptz DEFAULT now()
    );

    -- Enable RLS
    ALTER TABLE exercise_answers ENABLE ROW LEVEL SECURITY;

    -- RLS Policies
    CREATE POLICY "Users can view their own exercise answers"
      ON exercise_answers FOR SELECT
      USING (
        session_id IN (
          SELECT id FROM exercise_sessions WHERE user_id = auth.uid()
        )
      );

    CREATE POLICY "Users can insert their own exercise answers"
      ON exercise_answers FOR INSERT
      WITH CHECK (
        session_id IN (
          SELECT id FROM exercise_sessions WHERE user_id = auth.uid()
        )
      );

    -- Index
    CREATE INDEX idx_exercise_answers_session_id ON exercise_answers(session_id);
    CREATE INDEX idx_exercise_answers_question_id ON exercise_answers(question_id);

    RAISE NOTICE 'exercise_answers table created successfully';
  ELSE
    RAISE NOTICE 'exercise_answers table already exists';
  END IF;
END $$;
