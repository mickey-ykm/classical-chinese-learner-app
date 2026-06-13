# Marked as completed on 13 June 2026


# Quiz Sampling Feature Design

_Created 2026-06-02 — Phase 2 planning for dynamic question sampling_
_Revised 2026-06-12 — switched from type/format rules to part-based sampling_
_Status: **COMPLETE** — implemented and deployed 2026-06-12_

## Goal

Enable dynamic question sampling from a large question pool (~50-100 questions) to deliver varied quiz experiences (~22 questions per attempt) with the following constraints:

1. **Random sampling** — Each attempt should feel different
2. **MC option shuffling** — Implemented client-side (Fisher-Yates in QuizShell); options re-keyed A,B,C,D after shuffle
3. **Avoid repeats** — Same user + same article should get different questions on subsequent attempts
4. **Part-based distribution** — Sample questions according to fixed part quotas
5. **Authenticated users only** — Pool progress and repeat avoidance require a logged-in user; anonymous users get random sampling with no progress tracking

## Architecture: Dynamic API Sampling

Sampling happens server-side via API call at quiz start time:
- `GET /api/quiz/:articleId/sample` — public endpoint (no admin session), mounted before auth guard in `server.js`
- Mobile client: `lib/sampleQuiz.ts` fetches from `https://ccladmin.mickey-calligraphy.art`
- Admin tester: `https://ccladmin.mickey-calligraphy.art/test-sampling.html`

## Key Design Decisions

### 1. Sampling Rules

**Hardcoded part-based quotas (`admin/lib/sampling.js`):**

| Part | Questions to sample |
|------|-------------------|
| 1    | 6                 |
| 2    | 2                 |
| 3    | 4                 |
| 4    | 2                 |
| 5    | 2                 |
| 6    | 6                 |
| **Total** | **22**       |

### 2. Repeat Avoidance Algorithm (per part)

1. Query seen questions with last-answered timestamp:
   ```sql
   SELECT qa.question_id, MAX(qat.completed_at) AS last_seen_at
   FROM quiz_answers qa
   JOIN quiz_attempts qat ON qa.attempt_id = qat.id
   WHERE qat.user_id = ? AND qat.article_id = ?
   GROUP BY qa.question_id
   ORDER BY last_seen_at ASC
   ```

2. For each part:
   - Take all unseen questions first (random order)
   - If unseen < quota: fill remainder from seen, sorted by `last_seen_at ASC` (least recently seen first)
   - Cap at `allForPart.length`

3. Questions returned grouped by part (part 1 first), shuffled within each part

**Key properties:**
- Users always see unseen questions first
- When a part cycles through, it fills seamlessly from least-recently-seen — no hard reset
- Anonymous users: pure random sampling, no repeat avoidance, no pool progress shown

### 3. API Response

```json
{
  "articleId": "...",
  "totalQuestions": 22,
  "poolProgress": {
    "totalInPool": 100,
    "seenCount": 44,
    "attemptNumber": 2,
    "estimatedAttemptsToComplete": 3
  },
  "questions": [...]
}
```

- `poolProgress` only meaningful for logged-in users; mobile app hides "已見過 X/Y 題" for anonymous users
- `totalQuestions` is the actual count returned (may be < 22 if a part has fewer questions than quota)
- Pool progress refreshes in `app/quiz.tsx` when user returns to the quiz entry screen after completing a quiz (`useFocusEffect` + `needsProgressRefresh` flag)

### 4. Question.id type

`Question.id` is typed as `string | number`:
- Legacy bundled questions use numeric IDs
- Supabase-sourced questions use UUID strings
- `answers` state in `QuizShell` is `Record<string | number, QuizAnswer>`

### 5. Database

No new tables. Uses existing `quiz_attempts` + `quiz_answers`:
- `quiz_attempts.completed_at` — populated by DB default (`DEFAULT now()`) at insert time
- `quiz_answers.question_id` — `text` column; stores UUID strings for new questions

## Files

| File | Purpose |
|------|---------|
| `admin/lib/sampling.js` | Core sampling logic: `sampleByPart()`, `getSeenData()` |
| `admin/routes/quiz.js` | `GET /api/quiz/:articleId/sample` route |
| `admin/tests/sampling.test.js` | 5 unit tests for sampling algorithm |
| `admin/public/test-sampling.html` | Admin tester UI |
| `lib/sampleQuiz.ts` | Mobile fetch client |
| `app/quiz.tsx` | Quiz entry screen — loads sampled questions, shows pool progress |
| `components/quiz/QuizShell.tsx` | Shuffles + re-keys MC options; fires `onFinished` after save |


## Goal

Enable dynamic question sampling from a large question pool (~50-100 questions) to deliver varied quiz experiences (~22 questions per attempt) with the following constraints:

1. **Random sampling** — Each attempt should feel different
2. **MC option shuffling** — Already implemented client-side (Fisher-Yates in QuizShell)
3. **Avoid repeats** — Same user + same article should get different questions on subsequent attempts
4. **Part-based distribution** — Sample questions according to fixed part quotas
5. **Support both authenticated and anonymous users**

## Architecture: Option C (Dynamic API Sampling)

Sampling happens server-side via API call at quiz start time, enabling:
- Central sampling logic (easier to maintain)
- Access to user history for repeat avoidance
- Dynamic rule changes without app updates
- Consistent sampling across all clients

## Key Design Decisions

### 1. Sampling Rules Definition

**Decision: Hardcoded part-based quotas (no per-article configuration)**

| Part | Questions to sample |
|------|-------------------|
| 1    | 6                 |
| 2    | 2                 |
| 3    | 4                 |
| 4    | 2                 |
| 5    | 2                 |
| 6    | 6                 |
| **Total** | **22**       |

**Hardcoded default in `admin/lib/sampling.js`:**
```js
const DEFAULT_PART_QUOTAS = [
  { part: 1, count: 6 },
  { part: 2, count: 2 },
  { part: 3, count: 4 },
  { part: 4, count: 2 },
  { part: 5, count: 2 },
  { part: 6, count: 6 },
];
```

**Edge case: insufficient questions in a part**
- If a part has fewer available questions than the quota, return however many are available (no backfill from other parts)
- Example: part 2 only has 1 question → return 1, not 2

### 2. Part Structure

The DB `questions.part` column already supports values 1–6. Sampling groups published questions by `part` and applies quotas independently per group.

**Impact on existing data:**
- Questions with `part` 1–4 already exist
- Recently generated questions include parts 5 and 6
- No schema changes needed

### 3. Anonymous User Handling

**Decision: Anonymous users get random sampling, no repeat avoidance**

- API accepts optional `userId` parameter
- If userId is null/undefined → pure random sampling per part quota
- If userId exists → filter out previously seen questions before sampling
- Mobile app: show "登入以避免重複題目" hint on quiz start for anonymous users

### 4. API Endpoint Design

**Endpoint:** `GET /api/quiz/:articleId/sample`

**Query parameters:**
- `userId` (optional UUID) — for authenticated users
- `seed` (optional string) — for deterministic sampling (testing/debugging)

**Response:**
```json
{
  "articleId": "wang-rong-he-jiao",
  "attemptId": "uuid-generated-here",
  "totalQuestions": 22,
  "poolProgress": {
    "totalInPool": 100,
    "seenCount": 44,
    "attemptNumber": 2,
    "estimatedAttemptsToComplete": 3
  },
  "questions": [
    {
      "id": "question-uuid-1",
      "part": 1,
      "type": "字詞解釋",
      "format": "mc",
      "points": 1,
      "stem": "「賈」字的意思是？",
      "options": [
        {"key": "A", "text": "買賣"},
        {"key": "B", "text": "價格"},
        {"key": "C", "text": "商人"},
        {"key": "D", "text": "貨物"}
      ],
      "correctAnswer": "C",
      "explanation": "...",
      "sourceExcerpt": "..."
    }
    // ... remaining questions
  ]
}
```

**Notes:**
- Returns full question objects (not just IDs)
- MC options are NOT shuffled server-side (client already does this)
- Questions are grouped by part (all part 1 first, then part 2, etc.); within each part they are shuffled
- `totalQuestions` reflects the actual count returned (may be < 22 if any part is short)
- Score displays as "X / totalQuestions" not "X / 22"
- `attemptId` is pre-generated to link answers later

### 5. Repeat Avoidance Strategy

**Algorithm (per part):**

1. Query all question IDs the user has seen for this article, with the timestamp of when each was last answered:
   ```sql
   SELECT qa.question_id, MAX(qat.completed_at) AS last_seen_at
   FROM quiz_answers qa
   JOIN quiz_attempts qat ON qa.attempt_id = qat.id
   WHERE qat.user_id = ? AND qat.article_id = ?
   GROUP BY qa.question_id
   ORDER BY last_seen_at ASC
   ```

2. Get all published questions for article, grouped by part:
   ```sql
   SELECT * FROM questions 
   WHERE article_id = ? AND status = 'published'
   ORDER BY part
   ```

3. For each part:
   - `unseen = allForPart.filter(q => !seenIds.includes(q.id))`
   - If `unseen.length >= quota` → randomly sample `quota` from unseen
   - If `unseen.length < quota`:
     - Take all unseen (random order)
     - Fill remainder from seen questions sorted by `last_seen_at ASC` (least recently seen first)
     - Combined count = min(allForPart.length, quota)

4. Combine all parts in order (part 1 first, then 2, etc.), shuffle within each part

**Key properties:**
- Users always encounter unseen questions first
- When a part cycles through, it refills seamlessly from least-recently-seen — no hard reset, no empty parts
- A part with fewer questions than quota → all questions returned (unseen + seen fill-up), capped at actual pool size
- Part has no questions at all → skip silently

**Edge Cases:**
- New article (no seen questions) → pure random sampling per quota
- User has seen all questions in a part → entire sample for that part comes from least-recently-seen
- Anonymous user → no seen-ID filtering, pure random sampling per quota

**Prerequisite:** `quiz_attempts.completed_at` must be populated when the user finishes a quiz. This column needs to exist and be written on attempt completion.

### 6. Database Schema Changes

No new tables required. We query `quiz_answers` and `quiz_attempts` directly (no denormalized cache).

**Rationale:** Direct query is simpler and always correct. A cache table adds denormalization risk. Performance is acceptable given quiz start is a one-time operation per session.

## Implementation Plan

### Phase 3: Backend Implementation (2 parallel agents)

**Agent A: Sampling Algorithm + API Route**
- `admin/lib/sampling.js` — core sampling logic
  - `DEFAULT_PART_QUOTAS` — hardcoded part quotas
  - `sampleByPart(questions, quotas, seenIds)` — main sampling function
  - `getSeenQuestionIds(userId, articleId)` — queries quiz_answers/quiz_attempts
- `admin/routes/quiz.js` — new route file
  - `GET /api/quiz/:articleId/sample`
  - Error handling, input validation
- Unit tests: `admin/tests/sampling.test.js`

**Agent B: Mobile App Integration**
- Update `lib/contentStore.ts`:
  - `sampleQuiz(articleId: string, userId?: string): Promise<SampledQuiz>`
  - Fetch from `/api/quiz/:articleId/sample`
- Update quiz entry screens to call `sampleQuiz()` instead of loading full `quiz_json`
- Show "登入以避免重複題目" hint for anonymous users
- Update `components/quiz/QuizShell.tsx` to accept flat question list

### Phase 4: Admin Portal Testing UI

- New page: "Test Sampling" (`admin/public/test-sampling.html`)
- Input: article_id, user_id (optional)
- Output: sampled questions with part distribution breakdown
- Useful for verifying quotas are met

### Phase 5: Testing

- Unit tests: sampling algorithm edge cases (insufficient part questions, no history, full history)
- Integration tests: API endpoint with different users/articles
- Manual testing:
  - New article (no history)
  - User retries article (repeat avoidance)
  - Anonymous user
  - Part with fewer questions than quota

### Phase 6: Documentation and Deployment

- Update `CLAUDE.md` with sampling conventions
- Git commit + push
- Railway deployment (admin API)
- Verify in production

## Timeline Estimate

- Phase 3 (Backend + Mobile): 3-4 hours (parallel agents)
- Phase 4 (Admin Test UI): 1-2 hours
- Phase 5 (Testing): 2 hours
- Phase 6 (Deploy): 1 hour

**Total: ~7-9 hours of active work**

## Next Steps

1. Start Phase 3 implementation with 2 parallel agents
2. Test in development
3. Deploy to production (Railway + mobile build)
