# Migration Plan: Consolidate quiz_attempts into exercise_sessions

**Created:** 2026-06-27  
**Status:** Planning  
**Priority:** Medium (technical debt cleanup)  
**Context:** Pre-launch (development testing data only, can be cleared)

---

## Problem

Currently, quiz history is split across two tables with overlapping purposes:

- **`quiz_attempts`** (legacy) — Used for single-article quizzes only
- **`exercise_sessions`** (new) — Used for DSE Training and Weight Training

This creates:
1. **Split history** — some attempts in one table, some in another
2. **Two code paths** — different save logic for article quizzes vs. other exercise types
3. **Inconsistent queries** — analytics must join both tables to get complete user history
4. **Confusion** — which table is the source of truth?

---

## Goal

**Unify all exercise tracking into `exercise_sessions`** with `kind` distinguishing exercise types:
- `kind = 'article-quiz'` (new writes from article quizzes)
- `kind = 'dse-training'` (already using exercise_sessions)
- `kind = 'weight-training'` (already using exercise_sessions)

**Drop `quiz_attempts` + `quiz_answers` tables entirely** — no migration needed since app hasn't launched yet.

---

## Current State Analysis

### Tables

**quiz_attempts** (legacy):
```sql
id uuid PK
user_id uuid → profiles.id (nullable for anonymous)
article_id text (required)
completed_at timestamptz
score integer
total_points integer
total_seconds integer
expected_seconds integer
```

**quiz_answers** (legacy):
```sql
id uuid PK
attempt_id uuid → quiz_attempts.id
question_id text (UUID strings or numeric strings)
part_number integer
user_choice text
correct_choice text
is_correct boolean
points_earned integer
```

**exercise_sessions** (new):
```sql
id uuid PK
user_id uuid → profiles.id (nullable for anonymous)
article_id text → articles.id (nullable for cross-article)
kind text ('article-quiz' | 'dse-training' | 'weight-training')
question_type text (for weight-training filtering)
question_ids uuid[] (sampled question IDs)
started_at timestamptz
finished_at timestamptz
total_seconds integer
expected_seconds integer
score integer
total_points integer
```

**exercise_answers** (new):
```sql
id uuid PK
session_id uuid → exercise_sessions.id
question_id uuid (cross_article_questions.id for weight-training)
user_answer text
is_correct boolean
points_earned integer
```

### Current Usage

**Mobile app:**
- `lib/quizHistory.ts` → `saveQuizAttempt()` saves to `quiz_attempts` + `quiz_answers`
- `components/quiz/QuizShell.tsx` → calls `saveQuizAttempt()` for article quizzes
- `app/(tabs)/dse-training.tsx` → saves to `exercise_sessions` + `exercise_answers`
- `app/weight-training.tsx` → saves to `exercise_sessions` + `exercise_answers`

**Backend:**
- `admin/routes/quiz.js` → `GET /api/quiz/:articleId/sample` queries `quiz_attempts` for repeat avoidance
- `admin/routes/weight-training.js` → `GET /api/quiz/weight-training/sample` queries `exercise_sessions` for repeat avoidance
- Account screen queries `quiz_attempts` for history display

---

## Simplified Migration Strategy (Pre-Launch)

Since the app hasn't launched yet, we can take a clean-slate approach:

### Phase 1: Update Code to Use exercise_sessions

**Goal:** Rewrite article quiz save/load logic to use `exercise_sessions` + `exercise_answers` exclusively.

**Changes:**

**1. Mobile app — Rewrite `lib/quizHistory.ts`:**
```typescript
// OLD: saveQuizAttempt() writes to quiz_attempts + quiz_answers
// NEW: saveQuizAttempt() writes to exercise_sessions + exercise_answers

async function saveQuizAttempt(
  articleId: string,
  score: number,
  totalPoints: number,
  answers: QuizAnswer[],
  userId?: string,
  totalSeconds?: number,
  expectedSeconds?: number
) {
  const session = {
    user_id: userId || null,
    article_id: articleId,
    kind: 'article-quiz',
    question_ids: answers.map(a => a.questionId),
    finished_at: new Date().toISOString(),
    total_seconds: totalSeconds,
    expected_seconds: expectedSeconds,
    score,
    total_points: totalPoints,
  }
  
  const { data: sessionData, error: sessionError } = await supabase
    .from('exercise_sessions')
    .insert(session)
    .select()
    .single()
  
  if (sessionError) throw sessionError
  
  const answerRows = answers.map(a => ({
    session_id: sessionData.id,
    question_id: a.questionId,
    user_answer: a.userChoice?.toString() || null,
    is_correct: a.isCorrect,
    points_earned: a.pointsEarned || (a.isCorrect ? a.points : 0),
  }))
  
  const { error: answersError } = await supabase
    .from('exercise_answers')
    .insert(answerRows)
  
  if (answersError) throw answersError
  
  return sessionData.id
}
```

**2. Account screen (`app/account.tsx`):**
- Change query: `quiz_attempts` → `exercise_sessions WHERE kind = 'article-quiz'`
- All field names are the same, no mapping needed

**3. Attempt detail screen (`app/attempt.tsx`):**
- Query `exercise_sessions` by ID
- Query `exercise_answers` (join on `session_id`)
- Map fields: `user_choice` → `user_answer`

**4. Quiz sampling (`admin/routes/quiz.js`):**
- Query `exercise_sessions WHERE article_id = X AND kind = 'article-quiz'` for repeat avoidance
- Already uses `finished_at` (same column name)

**5. Progress endpoint (`admin/routes/quiz.js`):**
- Update `GET /api/quiz/progress` to query `exercise_sessions`
- Benefit: can now get stats across ALL exercise types in one query

**Validation:**
- [ ] Complete article quiz → verify saved to `exercise_sessions`
- [ ] Account screen displays quiz history correctly
- [ ] Attempt detail screen shows answers correctly
- [ ] Quiz sampling avoids repeating questions
- [ ] Anonymous user quiz works (user_id = NULL)

**Estimated effort:** 4-5 hours

---

### Phase 2: Clear Old Data & Drop Tables

**Goal:** Remove development testing data and drop legacy tables.

**SQL to run in Supabase:**
```sql
-- Clear all development testing data from legacy tables
DELETE FROM quiz_answers;
DELETE FROM quiz_attempts;

-- Drop the tables
DROP TABLE IF EXISTS quiz_answers CASCADE;
DROP TABLE IF EXISTS quiz_attempts CASCADE;
```

**Update documentation:**
- Remove `quiz_attempts` / `quiz_answers` from `docs/project-specification.md`
- Update `docs/database-schema.dbml` to remove legacy tables
- Update `CLAUDE.md` to reflect single source of truth: `exercise_sessions`

**Estimated effort:** 30 minutes

---

## Benefits After Migration

1. **Single source of truth** — all exercise history in `exercise_sessions`
2. **Unified analytics** — one query for all exercise types (no JOIN needed)
3. **Consistent code paths** — same save/load logic for all quiz types
4. **Better schema** — `kind` enum makes exercise types explicit
5. **Anonymous user support** — already built into `exercise_sessions` (nullable `user_id`)
6. **Future-proof** — easy to add new exercise types (e.g., `kind = 'revision'`)

---

## Risks & Mitigation (Pre-Launch)

**Risk 1: Testing data lost**
- **Impact:** Low — all data is development testing only
- **Mitigation:** None needed; this is intentional cleanup

**Risk 2: Sampling logic breaks (repeat avoidance stops working)**
- **Mitigation:** Test sampling endpoint after Phase 1. Verify with fresh quiz attempts after code update.

**Risk 3: Code paths missed (some query still references old tables)**
- **Mitigation:** Search codebase for `quiz_attempts` and `quiz_answers` strings before Phase 2. Ensure all references updated.

---

## Testing Checklist (Pre-Launch)

**Phase 1 (Update code):**
- [ ] Complete article quiz on mobile → verify saved to `exercise_sessions` with `kind = 'article-quiz'`
- [ ] Check `exercise_answers` table has all answers
- [ ] Anonymous user quiz → verify `user_id = NULL` works
- [ ] Account screen displays quiz history correctly
- [ ] Attempt detail screen shows answers correctly (map `user_answer` field)
- [ ] Quiz sampling avoids repeating questions (query `exercise_sessions`)
- [ ] Progress endpoint returns correct stats

**Phase 2 (Drop tables):**
- [ ] Grep codebase for `quiz_attempts` → no references remain
- [ ] Grep codebase for `quiz_answers` → no references remain
- [ ] Run SQL to drop tables in Supabase
- [ ] Update documentation (project-specification.md, database-schema.dbml, CLAUDE.md)

---

## Rollback Plan (Pre-Launch)

**If issues found after Phase 1:** 
- Revert `lib/quizHistory.ts` changes (git revert)
- Legacy tables still exist, can continue using them

**If issues found after Phase 2 (tables dropped):**
- Recreate tables with original schema (SQL in archive docs)
- Redeploy old code
- Development continues as before (no production data at risk)

---

## Timeline Estimate (Pre-Launch Version)

| Phase | Effort | Dependencies |
|---|---|---|
| Phase 1: Update code to use exercise_sessions | 4-5 hours | None |
| Phase 2: Clear old data & drop tables | 30 minutes | Phase 1 complete + tested |

**Total:** ~5 hours (can be done in a single work session).

---

## Implementation Notes

1. **`question_ids` array:**
   - Populated for all new article quiz attempts
   - Contains the sampled question IDs in the order they were presented
   - Enables future "replay exact quiz" feature

2. **`started_at` timestamp:**
   - Can be set when quiz starts (first question displayed)
   - Or left NULL if only tracking completion time
   - **Recommendation:** Leave NULL for now, add later if needed

3. **Anonymous user handling:**
   - `user_id = NULL` for anonymous users (already supported in `exercise_sessions`)
   - RLS policy allows anonymous reads/writes (same as before)

---

## Success Criteria

✅ All new article quiz attempts write to `exercise_sessions` only  
✅ Account screen displays unified history across all exercise types  
✅ Sampling logic correctly avoids repeating questions from `exercise_sessions`  
✅ Zero data loss (all `quiz_attempts` rows migrated successfully)  
✅ Analytics queries simplified (single table, no JOIN)  
✅ Documentation updated to reflect new schema
