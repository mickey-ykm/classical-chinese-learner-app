-- Add points column to cross_article_questions table
ALTER TABLE cross_article_questions
ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 1;

-- Add comment
COMMENT ON COLUMN cross_article_questions.points IS 'Point value for this question (auto-calculated for MC: = number of correct answers)';

-- Update existing MC questions to have correct points based on number of correct answers
UPDATE cross_article_questions
SET points = (LENGTH(correct_answer) - LENGTH(REPLACE(correct_answer, ',', '')) + 1)
WHERE format = 'mc';
