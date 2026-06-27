-- Check for multi-select cross-article questions
SELECT
  id,
  question_text,
  part,
  select_count,
  correct_answer,
  status
FROM cross_article_questions
WHERE select_count > 1
  AND status = 'published'
ORDER BY part;
