-- Check for orphaned weight-training sessions (sessions without answers)
SELECT
  es.id as session_id,
  es.user_id,
  es.kind,
  es.finished_at,
  (SELECT COUNT(*) FROM exercise_answers WHERE session_id = es.id) as answer_count
FROM exercise_sessions es
WHERE es.kind = 'weight-training'
  AND es.user_id = 'ca376691-e69d-4495-9eb4-b6a42ca4eaf4';

-- If you see sessions with answer_count = 0, delete them:
-- DELETE FROM exercise_sessions
-- WHERE kind = 'weight-training'
--   AND user_id = 'ca376691-e69d-4495-9eb4-b6a42ca4eaf4'
--   AND id NOT IN (SELECT DISTINCT session_id FROM exercise_answers);
