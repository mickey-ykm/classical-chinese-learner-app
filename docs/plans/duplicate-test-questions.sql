-- Duplicate cross-article questions for testing
-- This will create 8 more questions (4 duplicates of each original)
-- Adjusting parts to ensure 5 for part 7 and 5 for part 8

-- First, let's see what we have
SELECT id, part, LEFT(question_text, 30) as preview FROM cross_article_questions;

-- Duplicate question 1 (0e45fcdc-8ca6-4506-bb8e-b4ae3a14042f) - 4 times
-- We'll make 2 as part 7, 2 as part 8
INSERT INTO cross_article_questions (question_text, format, part, options, correct_answer, explanation, select_count, sequence_tokens, question_types, status, created_at, updated_at)
SELECT
  question_text,
  format,
  CASE
    WHEN ROW_NUMBER() OVER () <= 2 THEN 7
    ELSE 8
  END as part,
  options,
  correct_answer,
  explanation,
  select_count,
  sequence_tokens,
  question_types,
  status,
  NOW() as created_at,
  NOW() as updated_at
FROM cross_article_questions
WHERE id = '0e45fcdc-8ca6-4506-bb8e-b4ae3a14042f'
CROSS JOIN generate_series(1, 4);

-- Get the IDs of the newly created questions to link articles
WITH new_questions AS (
  SELECT id FROM cross_article_questions
  WHERE created_at > NOW() - INTERVAL '1 minute'
  ORDER BY created_at
  LIMIT 4
)
INSERT INTO cross_article_question_articles (question_id, article_id)
SELECT nq.id, caqa.article_id
FROM new_questions nq
CROSS JOIN cross_article_question_articles caqa
WHERE caqa.question_id = '0e45fcdc-8ca6-4506-bb8e-b4ae3a14042f';

-- Duplicate question 2 (0084cb94-89d3-41f4-83eb-89f389f2b89a) - 4 times
-- We'll make 3 as part 7, 1 as part 8 (to balance out to 5+5 total)
INSERT INTO cross_article_questions (question_text, format, part, options, correct_answer, explanation, select_count, sequence_tokens, question_types, status, created_at, updated_at)
SELECT
  question_text,
  format,
  CASE
    WHEN ROW_NUMBER() OVER () <= 3 THEN 7
    ELSE 8
  END as part,
  options,
  correct_answer,
  explanation,
  select_count,
  sequence_tokens,
  question_types,
  status,
  NOW() as created_at,
  NOW() as updated_at
FROM cross_article_questions
WHERE id = '0084cb94-89d3-41f4-83eb-89f389f2b89a'
CROSS JOIN generate_series(1, 4);

-- Link related articles for the second batch
WITH new_questions AS (
  SELECT id FROM cross_article_questions
  WHERE created_at > NOW() - INTERVAL '1 minute'
  ORDER BY created_at
  LIMIT 4
  OFFSET 4
)
INSERT INTO cross_article_question_articles (question_id, article_id)
SELECT nq.id, caqa.article_id
FROM new_questions nq
CROSS JOIN cross_article_question_articles caqa
WHERE caqa.question_id = '0084cb94-89d3-41f4-83eb-89f389f2b89a';

-- Verify the results
SELECT
  part,
  COUNT(*) as count,
  COUNT(CASE WHEN status = 'published' THEN 1 END) as published_count
FROM cross_article_questions
GROUP BY part
ORDER BY part;

-- Show all questions
SELECT id, part, LEFT(question_text, 40) as preview, status
FROM cross_article_questions
ORDER BY part, created_at;
