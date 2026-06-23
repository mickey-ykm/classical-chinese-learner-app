-- Weight Training Exercise Schema Migration
-- Created: 2026-06-23
-- Task: #026 - Weight training Exercise Logic

-- 1. Create cross_article_questions table
CREATE TABLE cross_article_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text text NOT NULL,
  format text NOT NULL CHECK (format IN ('mc', 'fill-blank', 'sentence-order')),
  part smallint NOT NULL CHECK (part IN (7, 8)),
  options jsonb,  -- MC options array
  correct_answer text NOT NULL,
  explanation text,
  select_count smallint DEFAULT 1,  -- for multi-select MC
  sequence_tokens text[],  -- for sentence-order format
  question_types text[],  -- pedagogical labels (字詞解釋, 語句背誦, 語句翻譯, 修辭手法, 內容重點)
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_cross_article_questions_part ON cross_article_questions(part);
CREATE INDEX idx_cross_article_questions_status ON cross_article_questions(status);

COMMENT ON TABLE cross_article_questions IS 'Cross-article questions for weight training exercise (parts 7-8)';
COMMENT ON COLUMN cross_article_questions.part IS 'Part 7: 一詞多義辨認, Part 8: 文言句式辨認';
COMMENT ON COLUMN cross_article_questions.question_types IS 'Pedagogical categories: 字詞解釋, 語句背誦, 語句翻譯, 修辭手法, 內容重點';

-- 2. Create join table for many-to-many relationship between questions and articles
CREATE TABLE cross_article_question_articles (
  question_id uuid REFERENCES cross_article_questions(id) ON DELETE CASCADE,
  article_id text NOT NULL,
  PRIMARY KEY (question_id, article_id)
);

CREATE INDEX idx_caq_articles_question ON cross_article_question_articles(question_id);
CREATE INDEX idx_caq_articles_article ON cross_article_question_articles(article_id);

COMMENT ON TABLE cross_article_question_articles IS 'Join table: links cross-article questions to their related articles';

-- 3. Create exercise_sessions table for non-article-specific exercises
CREATE TABLE exercise_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_type text NOT NULL CHECK (exercise_type IN ('weight-training', 'revision')),
  score smallint NOT NULL,
  total_questions smallint NOT NULL,
  completed_at timestamptz DEFAULT now()
);

CREATE INDEX idx_exercise_sessions_user ON exercise_sessions(user_id);
CREATE INDEX idx_exercise_sessions_type ON exercise_sessions(exercise_type);
CREATE INDEX idx_exercise_sessions_completed ON exercise_sessions(completed_at);

COMMENT ON TABLE exercise_sessions IS 'Tracks completion of non-article-specific exercises (weight training, revision, etc.)';

-- 4. Create exercise_answers table
CREATE TABLE exercise_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES exercise_sessions(id) ON DELETE CASCADE,
  question_id uuid REFERENCES cross_article_questions(id) ON DELETE CASCADE,
  user_answer text,
  is_correct boolean NOT NULL,
  points_earned smallint DEFAULT 1,
  answered_at timestamptz DEFAULT now()
);

CREATE INDEX idx_exercise_answers_session ON exercise_answers(session_id);
CREATE INDEX idx_exercise_answers_question ON exercise_answers(question_id);
CREATE INDEX idx_exercise_answers_user_question ON exercise_answers(question_id, answered_at);

COMMENT ON TABLE exercise_answers IS 'Individual answers for exercise sessions (linked to cross_article_questions)';

-- 5. Enable RLS (Row Level Security)
ALTER TABLE cross_article_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_article_question_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_answers ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies

-- cross_article_questions: readable by all, writable by service role only (admin portal)
CREATE POLICY "cross_article_questions are viewable by everyone"
  ON cross_article_questions FOR SELECT
  USING (status = 'published');

CREATE POLICY "cross_article_questions are insertable by service role"
  ON cross_article_questions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "cross_article_questions are updatable by service role"
  ON cross_article_questions FOR UPDATE
  USING (true);

CREATE POLICY "cross_article_questions are deletable by service role"
  ON cross_article_questions FOR DELETE
  USING (true);

-- cross_article_question_articles: readable by all, writable by service role only
CREATE POLICY "cross_article_question_articles are viewable by everyone"
  ON cross_article_question_articles FOR SELECT
  USING (true);

CREATE POLICY "cross_article_question_articles are insertable by service role"
  ON cross_article_question_articles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "cross_article_question_articles are deletable by service role"
  ON cross_article_question_articles FOR DELETE
  USING (true);

-- exercise_sessions: users can read their own, insert their own
CREATE POLICY "Users can view their own exercise sessions"
  ON exercise_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exercise sessions"
  ON exercise_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- exercise_answers: users can read their own, insert their own
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

-- 7. Grant necessary permissions
GRANT ALL ON cross_article_questions TO service_role;
GRANT SELECT ON cross_article_questions TO anon, authenticated;

GRANT ALL ON cross_article_question_articles TO service_role;
GRANT SELECT ON cross_article_question_articles TO anon, authenticated;

GRANT SELECT, INSERT ON exercise_sessions TO authenticated;
GRANT SELECT, INSERT ON exercise_answers TO authenticated;
