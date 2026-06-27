-- Verify points column has values
SELECT
  id,
  question_text,
  part,
  correct_answer,
  points,
  format,
  select_count
FROM cross_article_questions
WHERE status = 'published'
ORDER BY part, id
LIMIT 10;
