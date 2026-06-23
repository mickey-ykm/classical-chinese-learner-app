# Weight Training Exercise Implementation Plan

**Task:** #026 — FEATURE: Weight training Exercise Logic  
**Created:** 2026-06-23  
**Status:** Awaiting approval

---

## Overview

Implement a new "Weight Training" exercise mode featuring cross-article questions (parts 7 & 8) with multi-article reference support, intelligent sampling, and progress tracking.

---

## Requirements Summary

1. **Admin Portal**: New "DSE跨文章題題" section with CRUD for cross-article questions
2. **Question Types**: Part 7 (一詞多義辨認) + Part 8 (文言句式辨認)
3. **Related Articles**: Multi-select dropdown, any article type allowed, minimum 1 required
4. **Sampling**: 5 questions from part 7 + 5 from part 8 = 10 per session, with pool-wide repeat avoidance
5. **Progress Tracking**: New `exercise_sessions` table for non-article-specific exercises
6. **UI**: All related articles available via buttons (reuse DSE training pattern)

---

## Phase 1: Database Schema

### 1.1 Create `cross_article_questions` table

```sql
CREATE TABLE cross_article_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text text NOT NULL,
  format text NOT NULL CHECK (format IN ('mc', 'fill-blank', 'sentence-order')),
  part smallint NOT NULL CHECK (part IN (7, 8)),
  options jsonb,  -- MC options array
  correct_answer text NOT NULL,
  explanation text,
  select_count smallint DEFAULT 1,  -- for multi-select MC
  sequence_tokens text[],  -- for sentence-order
  question_types text[],  -- pedagogical labels (字詞解釋, 語句背誦, etc.)
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_cross_article_questions_part ON cross_article_questions(part);
CREATE INDEX idx_cross_article_questions_status ON cross_article_questions(status);
```

### 1.2 Create `cross_article_question_articles` join table

```sql
CREATE TABLE cross_article_question_articles (
  question_id uuid REFERENCES cross_article_questions(id) ON DELETE CASCADE,
  article_id text NOT NULL,
  PRIMARY KEY (question_id, article_id)
);

CREATE INDEX idx_caq_articles_question ON cross_article_question_articles(question_id);
CREATE INDEX idx_caq_articles_article ON cross_article_question_articles(article_id);
```

### 1.3 Create `exercise_sessions` table

```sql
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
```

### 1.4 Create `exercise_answers` table

```sql
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
```

**Deliverable:** SQL migration script in `docs/plans/weight-training-schema.sql`

---

## Phase 2: Admin Backend API

### 2.1 Create helper modules

**File:** `admin/lib/cross-article-helpers.js`

Functions needed:
- `crossArticleQuestionToRow(question)` — convert frontend payload to Supabase row
- `rowToCrossArticleQuestion(row, relatedArticles)` — convert DB row to frontend format
- `upsertCrossArticleQuestion(questionData)` — insert/update with related articles
- `deleteCrossArticleQuestion(id)` — cascade delete

**File:** `admin/lib/weight-training-sampling.js`

Functions needed:
- `sampleWeightTrainingQuestions(userId, partQuotas)` — sample 5 from part 7, 5 from part 8
- `getWeightTrainingProgress(userId)` — return seen count / total pool size
- Reuse repeat avoidance pattern from `admin/lib/sampling.js`

### 2.2 Create API routes

**File:** `admin/routes/cross-article-questions.js`

Routes:
- `GET /api/cross-article-questions` — list all (with filters: status, part)
- `GET /api/cross-article-questions/:id` — get single question with related articles
- `POST /api/cross-article-questions` — create new question
- `PUT /api/cross-article-questions/:id` — update question
- `DELETE /api/cross-article-questions/:id` — delete question
- `POST /api/cross-article-questions/bulk-publish` — bulk publish drafts
- `POST /api/cross-article-questions/bulk-delete` — bulk delete drafts

**File:** `admin/routes/weight-training.js`

Routes:
- `GET /api/quiz/weight-training/sample?userId=<uuid>` — sample 10 questions (PUBLIC, no auth)
- `POST /api/quiz/weight-training/session` — save completed session + answers (PUBLIC)
- `GET /api/quiz/weight-training/progress?userId=<uuid>` — get pool progress (PUBLIC)

**Important:** Mount weight-training routes BEFORE admin auth guard in `server.js` (similar to quiz sampling routes)

### 2.3 Update `server.js`

- Import and mount new route files
- Ensure public routes come before `requireSupabase` middleware

**Deliverable:** Backend routes functional and testable via curl/Postman

---

## Phase 3: Admin Frontend UI

### 3.1 Create cross-article questions page

**File:** `admin/public/cross-article-questions.html`

Structure:
- Header: "DSE跨文章題題" title + "新增題目" button
- Filters: Status (all/draft/published), Part (all/7/8)
- Table: Question text preview | Part | Related articles count | Status | Actions (Edit/Delete)
- Bulk operations: Checkboxes for draft questions, "Publish Selected" and "Delete Selected" buttons

### 3.2 Create question modal

**File:** `admin/public/js/cross-article-questions.js`

Modal fields:
- Question text (textarea)
- Format (dropdown: MC / Fill-blank / Sentence-order)
- Part (dropdown: 7 / 8)
- Related Articles (multi-select dropdown, fetched from `/api/exercises`, minimum 1 required)
- Question Types (5 checkboxes: 字詞解釋, 語句背誦, 語句翻譯, 修辭手法, 內容重點)
- MC Options (conditional, shown only when format = 'mc')
- Select Count (conditional, shown only when format = 'mc')
- Correct Answer (format-dependent input)
- Explanation (textarea)
- Status (dropdown: draft / published)

Two save buttons:
- "Save Question" (keep current status)
- "Save and Publish" (override to published)

### 3.3 Update navigation

**File:** `admin/public/index.html`

Add new tab/link in the admin portal navigation:
- "文章管理" (existing)
- "題目管理" (existing)
- "跨文章題目" (NEW) → links to `cross-article-questions.html`
- "Prompt管理" (existing)

**Deliverable:** Admin can create, edit, publish, and delete cross-article questions with multi-article selection

---

## Phase 4: Mobile App Backend Integration

### 4.1 Type definitions

**File:** `lib/types.ts`

Add new types:
```typescript
export interface CrossArticleQuestion {
  id: string;
  questionText: string;
  format: 'mc' | 'fill-blank' | 'sentence-order';
  part: 7 | 8;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  selectCount?: number;
  sequenceTokens?: string[];
  relatedArticleIds: string[];  // NEW
}

export interface ExerciseSession {
  id: string;
  userId: string;
  exerciseType: 'weight-training' | 'revision';
  score: number;
  totalQuestions: number;
  completedAt: Date;
}

export interface WeightTrainingProgress {
  totalInPool: number;
  seenCount: number;
  part7Seen: number;
  part7Total: number;
  part8Seen: number;
  part8Total: number;
}
```

### 4.2 API client functions

**File:** `lib/weightTraining.ts` (NEW)

Functions:
```typescript
export async function sampleWeightTraining(userId?: string): Promise<CrossArticleQuestion[]>
export async function saveWeightTrainingSession(session: ExerciseSession, answers: ExerciseAnswer[]): Promise<void>
export async function getWeightTrainingProgress(userId: string): Promise<WeightTrainingProgress>
```

**Deliverable:** Type-safe API client ready for UI integration

---

## Phase 5: Mobile App UI

### 5.1 Update weight-training tab

**File:** `app/(tabs)/weight-training.tsx`

Replace "coming soon" placeholder with:

**Lobby screen:**
- Title: "🎯 重量訓練"
- Description: "跨文章一詞多義 & 文言句式專項訓練"
- Stats card (logged-in users only):
  - "已見過 X / Y 題 (Part 7: A/B, Part 8: C/D)"
  - Refresh on focus using `useFocusEffect`
- "開始訓練" button → launches quiz with sampled questions

**Quiz mode:**
- Reuse `QuizShell` component
- Pass `questions` prop from sampled data
- Pass `relatedArticles` prop (map of articleId → ArticleEntry)
- Display article buttons above question stem (1 button per related article)

### 5.2 Enhance QuizShell for multi-article buttons

**File:** `components/quiz/QuizShell.tsx`

Add support for `relatedArticleIds` per question:
- Check if `currentQuestion.relatedArticleIds` exists
- Render buttons for each related article (similar to DSE mock exam badge, but multiple buttons)
- Button format: "📄 {articleTitle}" (tappable, opens ArticlePopup)
- Reuse existing `ArticlePopup` component

### 5.3 Session persistence

**File:** `app/(tabs)/weight-training.tsx`

After quiz completion:
- Save session via `saveWeightTrainingSession()`
- Show score screen with part breakdown
- "返回" button returns to lobby (refreshes progress)

### 5.4 Progress tracking

**File:** `lib/weightTrainingProgress.ts` (NEW)

Similar to `lib/articleProgress.ts`:
- In-memory cache for progress data
- `refreshWeightTrainingProgress(userId)` — fetch from API
- `clearWeightTrainingProgress()` — invalidate cache after session completion

**Deliverable:** Functional weight training exercise in mobile app with progress tracking

---

## Phase 6: Testing & Validation

### 6.1 Admin portal testing

- [ ] Create cross-article questions with multiple related articles
- [ ] Verify multi-select dropdown shows all articles (any type)
- [ ] Verify minimum 1 article validation
- [ ] Test bulk publish and bulk delete
- [ ] Verify question modal handles all 3 formats (MC, fill-blank, sentence-order)

### 6.2 Backend API testing

- [ ] Verify sampling returns 5 from part 7 + 5 from part 8
- [ ] Verify repeat avoidance (seen questions avoided until pool exhausted)
- [ ] Verify progress endpoint returns correct counts
- [ ] Verify session persistence saves to `exercise_sessions` and `exercise_answers`

### 6.3 Mobile app testing

- [ ] Verify lobby shows correct progress for logged-in users
- [ ] Verify "開始訓練" samples 10 questions
- [ ] Verify all related article buttons appear and open correct article
- [ ] Verify quiz flow (answer → reveal → next) for all question formats
- [ ] Verify score screen shows part 7 and part 8 breakdown
- [ ] Verify progress refreshes after completing a session
- [ ] Test on both iOS and Android

### 6.4 Anonymous user testing

- [ ] Verify anonymous users can play weight training (no progress display)
- [ ] Verify session still saves (with `user_id = NULL` or anonymous user ID)

**Deliverable:** All test cases passing, feature ready for production

---

## Phase 7: Documentation

### 7.1 Update CLAUDE.md

Add sections:
- Weight training exercise data flow
- `cross_article_questions` table schema
- `exercise_sessions` table schema
- Sampling logic (5+5 from parts 7-8)
- Admin portal cross-article questions section

### 7.2 Update TASKS.md

Move #026 to "Done" with completion summary and lessons learned

**Deliverable:** Documentation updated and accurate

---

## Implementation Order

1. **Phase 1** (Database) — foundation for everything
2. **Phase 2** (Backend API) — testable independently via curl
3. **Phase 3** (Admin UI) — allows content creation
4. **Phase 4** (Mobile types) — prepares mobile integration
5. **Phase 5** (Mobile UI) — user-facing feature
6. **Phase 6** (Testing) — validation across all layers
7. **Phase 7** (Docs) — knowledge capture

Each phase should be completed and validated before moving to the next.

---

## Key Design Decisions

1. **Separate table** — `cross_article_questions` independent of `questions` table for cleaner separation
2. **Join table** — `cross_article_question_articles` for normalized many-to-many relationship
3. **Generic exercise tracking** — `exercise_sessions` table can support future exercise types (not just weight-training)
4. **Pool-wide repeat avoidance** — simpler than per-part tracking, still provides good user experience
5. **Public API endpoints** — weight-training routes must be accessible without admin auth (similar to quiz sampling)
6. **Reuse existing components** — `QuizShell`, `ArticlePopup`, `ScoreScreen` with minor enhancements

---

## Risks & Mitigations

**Risk:** Express route order conflicts (like #016)  
**Mitigation:** Mount `/weight-training/sample` before any `/:articleId/*` routes in `admin/routes/quiz.js`

**Risk:** Multi-article button layout overflow on small screens  
**Mitigation:** Use horizontal `ScrollView` for article buttons if more than 3 articles

**Risk:** Admin creates question with 0 related articles  
**Mitigation:** Frontend validation + backend validation (minimum 1 required)

**Risk:** Part 7/8 quota not met during sampling (e.g., only 3 published part 7 questions)  
**Mitigation:** API should return error if quota cannot be met, prompt admin to publish more questions

---

## Future Enhancements (Out of Scope)

- Part filtering (practice only part 7 or only part 8)
- Difficulty levels for questions
- Admin analytics (which questions have low correct rates)
- Article-specific filtering in sampling (e.g., only questions related to article X)

---

## Questions for User

None — all clarifications received.

---

## Approval

**Ready for implementation:** ⏸️ Awaiting user approval

Once approved, implementation will proceed phase-by-phase with validation at each step.
