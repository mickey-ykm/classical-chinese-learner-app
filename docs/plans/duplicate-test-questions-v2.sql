-- Duplicate cross-article questions for testing
-- Simpler approach: manually insert duplicates with different parts

-- First, let's see what we have
SELECT id, part, LEFT(question_text, 30) as preview FROM cross_article_questions;

-- Duplicate question 1 three times (making 4 total from this question)
-- Original + 3 duplicates, adjusting parts
DO $$
DECLARE
  q1_id uuid := '0e45fcdc-8ca6-4506-bb8e-b4ae3a14042f';
  q2_id uuid := '0084cb94-89d3-41f4-83eb-89f389f2b89a';
  new_q_id uuid;
  i int;
BEGIN
  -- Duplicate question 1: create 3 copies (2 as part 7, 1 as part 8)
  FOR i IN 1..3 LOOP
    INSERT INTO cross_article_questions (
      question_text, format, part, options, correct_answer,
      explanation, select_count, sequence_tokens, question_types, status
    )
    SELECT
      question_text,
      format,
      CASE WHEN i <= 2 THEN 7 ELSE 8 END, -- 2 for part 7, 1 for part 8
      options,
      correct_answer,
      explanation,
      select_count,
      sequence_tokens,
      question_types,
      status
    FROM cross_article_questions
    WHERE id = q1_id
    RETURNING id INTO new_q_id;

    -- Copy related articles
    INSERT INTO cross_article_question_articles (question_id, article_id)
    SELECT new_q_id, article_id
    FROM cross_article_question_articles
    WHERE question_id = q1_id;
  END LOOP;

  -- Duplicate question 2: create 5 copies (3 as part 7, 2 as part 8)
  FOR i IN 1..5 LOOP
    INSERT INTO cross_article_questions (
      question_text, format, part, options, correct_answer,
      explanation, select_count, sequence_tokens, question_types, status
    )
    SELECT
      question_text,
      format,
      CASE WHEN i <= 3 THEN 7 ELSE 8 END, -- 3 for part 7, 2 for part 8
      options,
      correct_answer,
      explanation,
      select_count,
      sequence_tokens,
      question_types,
      status
    FROM cross_article_questions
    WHERE id = q2_id
    RETURNING id INTO new_q_id;

    -- Copy related articles
    INSERT INTO cross_article_question_articles (question_id, article_id)
    SELECT new_q_id, article_id
    FROM cross_article_question_articles
    WHERE question_id = q2_id;
  END LOOP;
END $$;

-- Verify the results
SELECT
  part,
  COUNT(*) as total_count,
  COUNT(CASE WHEN status = 'published' THEN 1 END) as published_count
FROM cross_article_questions
GROUP BY part
ORDER BY part;

-- Show all questions
SELECT id, part, LEFT(question_text, 50) as preview, status
FROM cross_article_questions
ORDER BY part, created_at;
