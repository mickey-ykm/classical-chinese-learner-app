# Implementation Plan — Phase 7 Unblock + New Exercise Modes
_Date: 2026-05-24 | Extends: `auth-membership-llm-plan.md`_

## Context

The team reviewed `feature-ideas-20260523.md` which defines a richer question type taxonomy, new exercise modes (DSE Training, Weight Training), and four UX activity flows. Phase 7 of `auth-membership-llm-plan.md` was blocked pending team sign-off on the final question type list and format set. This document provides that sign-off and captures the full implementation plan.

---

## Key Decisions (Locked)

| Decision | Resolution |
|---|---|
| **mc-multi scoring** | All-or-nothing — full points only if all correct options selected and no wrong ones |
| **sentence-order scoring** | Exact match only — full points only if entire token sequence is correct |
| **DSE core articles** | `is_dse_core` flag in DB; team marks the 12 articles in admin portal this week |
| **short-answer / long-answer** | Dropped from MVP — grading and marketing complexity |
| **Weight Training** | Placeholder entry point only this phase; full implementation deferred |
| **Admin portal question management** | Full CRUD UI required — JSON editor is not sufficient |

---

## Status Snapshot (2026-05-24)

| Phase | Status |
|---|---|
| 1–6 | ✅ Complete |
| 7 | ⏸ **Unblocked by this document** |
| 8 | ✅ Complete |
| 9 | Revision Chapter ✅; Weight Training ⏸ deferred (placeholder this phase) |
| 10, 11 | ✅ Complete |
| 12–14 | ⬜ Pending |

---

## Section 1 — Question Types (Confirmed)

| Code | Chinese | Format | Selection | Scoring |
|---|---|---|---|---|
| `mc-single` | 選擇題（單選）| `mc` | 1 of 4 | Correct = full points |
| `mc-multi` | 選擇題（多選）| `mc` | 2 of 4 / 3 of 6 / 4 of 6 / 5 of 8 | All-or-nothing |
| `true-false` | 是非題 | `mc` | 1 of 2 | Correct = full points |
| `fill-blank` | 填充題 | `fill-blank` | text input | Exact match (normalised) |
| `sentence-order` | 重組句子/語序 | `sentence-order` | drag-to-arrange | Exact sequence only |

Short-answer and long-answer are **excluded from MVP**.

### Question type examples (from feature-ideas-20260523.md)

**選擇題1 (mc-single, easier)**
> 「須臾」在白話文的意思是︰
> A 經常 B 一會兒 C 不久 D 漫長 → 答案：B

**選擇題3 (mc-multi, 四選二)**
> 「無違」和「不違」分別指什麼？
> A/B/C/D with 2 correct answers → 答案：A、C

**選擇題4 (mc-multi, 六選三)**
> 蘇洵《六國論》中，以下三者為正確描述？
> A–F with 3 correct → 答案：A、C、E

**是非題**
> 《六國論》中，作者曾提出過六國戰勝秦國的可行策略。→ 是

**填充題**
> 子曰：「君子不重則不威；＿＿＿＿。＿＿＿。＿＿＿＿＿＿。＿＿＿＿＿。」
> → 學則不固。主忠信。無友不如己者。過則勿憚改。

**重組句子**
> 泉｜照｜上｜月｜明｜清｜石｜松｜流｜間
> → 明>月>松>間>照>清>泉>石>上>流

---

## Section 2 — Four UX Activity Flows

| Flow | Entry Point | Description |
|---|---|---|
| 1a. My Performance | Top-right avatar | Login/Register → account dashboard with completed exercises, scores, time |
| 1b. DSE Training | Prominent CTA on home screen | 2–3 articles randomly from DSE pool; X questions drawn per `exercise_template` |
| 1c. Extra-Curricular | Article list / journey map | Single article + its question pool (existing flow) |
| 1d. Weight Training | Home screen entry (placeholder) | Multi-article question drill by type — **deferred** |

**DSE Training is the priority flow** and should be the most prominent entry point on the home screen.

---

## Section 3 — DB Schema Additions

Run these migrations in Supabase once before implementation:

```sql
-- 1. DSE core article flag
ALTER TABLE articles ADD COLUMN IF NOT EXISTS is_dse_core boolean NOT NULL DEFAULT false;

-- 2. New question columns
ALTER TABLE questions ADD COLUMN IF NOT EXISTS select_count int NOT NULL DEFAULT 1;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS sequence_tokens jsonb;

-- 3. Add sentence-order format (drop and re-add CHECK)
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_format_check;
ALTER TABLE questions ADD CONSTRAINT questions_format_check
  CHECK (format IN ('mc','fill-blank','sentence-order'));

-- 4. Add dse-training session kind
ALTER TABLE exercise_sessions DROP CONSTRAINT IF EXISTS exercise_sessions_kind_check;
ALTER TABLE exercise_sessions ADD CONSTRAINT exercise_sessions_kind_check
  CHECK (kind IN ('regular','revision','weight-training','dse-training'));
```

---

## Section 4 — Implementation Steps

### 4a. `shared/schema.ts`

- `QUESTION_TYPES`: `['mc-single', 'mc-multi', 'true-false', 'fill-blank', 'sentence-order']`
- `QUESTION_FORMATS`: `['mc', 'fill-blank', 'sentence-order']`
- `QuestionSchema`: add `select_count: z.number().int().min(1).default(1)` and `sequence_tokens: z.array(z.string()).optional()`
- `correct_answer` for `mc-multi`: stored as comma-separated keys e.g. `"A,C,E"`
- `correct_answer` for `sentence-order`: stored as `>`-delimited correct token sequence e.g. `"明>月>松>間>照>清>泉>石>上>流"`

### 4b. `lib/quiz.ts` — Scoring extensions

- **`mc-single` / `true-false`**: existing logic unchanged
- **`mc-multi`**: parse `correct_answer` as comma-separated set; compare to user's selected set; equal → full points, else 0
- **`fill-blank`**: normalise both sides (trim, lowercase); compare against each `|`-separated accepted answer; any match → full points
- **`sentence-order`**: parse `correct_answer` as `>`-separated token array; compare to user's submitted token array; exact match → full points, else 0

### 4c. Mobile — New Question Components

**`components/quiz/MCQuestion.tsx`** (new, replaces inline logic)
- `select_count = 1`: tap-to-select, auto-advance after reveal delay (existing behaviour)
- `select_count > 1`: checkbox multi-select; "提交" submit button (no auto-advance); all-or-nothing grading; shows count hint e.g. "選擇 3 個答案"
- Handles `mc-single`, `mc-multi`, `true-false`

**`components/quiz/FillBlankQuestion.tsx`** (new)
- Renders stem with `___` replaced by inline `TextInput`
- "提交" submit button; on reveal shows correct answer alongside user input
- Grading: exact normalised match

**`components/quiz/SentenceOrderQuestion.tsx`** (new)
- Displays shuffled `sequence_tokens` as draggable chips (source area + answer slots)
- Uses `react-native-reanimated` + `react-native-gesture-handler`
- "提交" submit button; on reveal shows correct sequence with colour-coded feedback
- Grading: exact token sequence match

**`components/quiz/QuizShell.tsx`** (modify)
- Add format router: `switch (question.format) { case 'mc': ... case 'fill-blank': ... case 'sentence-order': ... }`

### 4d. DSE Training Exercise

**`app/dse-training.tsx`** (new)
- On load: fetch `is_dse_core = true` articles from `contentStore`
- Randomly pick 2–3 articles; for each, sample questions via `exercise_template`
- Merge question lists; render via `QuizShell` (multi-article mode, `articleId = undefined`)
- On complete: save as `exercise_sessions.kind = 'dse-training'`

**`app/index.tsx`** (modify)
- Add "DSE 備試練習" card as the top/primary CTA on the home screen
- Add "文言用字訓練" card (Weight Training placeholder — locked state)

### 4e. Weight Training — Placeholder

**`app/weight-training.tsx`** (new, placeholder only)
- Shows "即將推出 — 文言用字訓練" message
- Full implementation deferred; home screen entry point visible but tapping shows this screen

### 4f. Admin Portal — Question CRUD

Replaces the existing JSON quiz editor with a structured question management UI.

#### Question list (in Article Library Detail, new tab or section)
- Table columns: # | Type | Points | Correct answer preview | Status | Edit | Delete
- "新增問題" button → opens Add/Edit modal
- "批量生成" (LLM generate) → generates draft questions for review

#### Add/Edit question modal
Common fields: `type` dropdown, `points` number input, `status` (Draft/Published), `source_excerpt` textarea, `explanation` textarea

**For `mc-single`, `mc-multi`, `true-false`**:
- Option rows (A–H as needed): text input + "✓ 正確答案" checkbox
- `select_count` auto-derived from number of checked options
- Validation: exactly `select_count` boxes checked before save

**For `fill-blank`**:
- Stem textarea (use `___` for blank positions)
- Accepted answers: one per line (stored as `|`-joined string)

**For `sentence-order`**:
- Token input: enter tokens as comma-separated string (e.g. `明,月,松,間,照,清,泉,石,上,流`)
- Correct order: drag-to-reorder the entered tokens OR enter the correct sequence comma-separated
- `sequence_tokens` (shuffled) auto-generated; `correct_answer` stored as `>`-delimited correct order

Save: `POST /api/questions` or `PUT /api/questions/:id` → Zod validate → Supabase upsert

#### LLM bulk generation
- "批量生成" button: calls existing LLM endpoint with **updated prompt** that produces all 5 question types
- Each generated question shown as a draft card: Type badge, stem preview, options/tokens, [Approve] [Edit] [Discard] buttons
- [Approve] → inserts as `status: 'draft'` to Supabase
- Admin reviews all generated drafts before publishing

#### `is_dse_core` checkbox
- Added to Article Library Detail (alongside `is_free` checkbox)
- Saved to `articles.is_dse_core` via existing PUT `/api/exercises` endpoint

#### New admin server routes (`admin/server.js`)
```
GET  /api/questions?articleId=X       list questions for an article
POST /api/questions                   create question (Zod validate → insert)
PUT  /api/questions/:id               update question (Zod validate → upsert)
DELETE /api/questions/:id             delete question
```

---

## Section 5 — Files to Create/Modify

| File | Action | Notes |
|---|---|---|
| `shared/schema.ts` | MODIFY | Confirmed QUESTION_TYPES, new formats, `select_count`, `sequence_tokens` |
| `lib/quiz.ts` | MODIFY | Scoring for mc-multi, fill-blank, sentence-order |
| `components/quiz/MCQuestion.tsx` | CREATE | Generalised MC — single + multi-select + true-false |
| `components/quiz/FillBlankQuestion.tsx` | CREATE | Fill-in-the-blank |
| `components/quiz/SentenceOrderQuestion.tsx` | CREATE | Drag-to-arrange |
| `components/quiz/QuizShell.tsx` | MODIFY | Format router |
| `app/index.tsx` | MODIFY | DSE Training CTA + Weight Training placeholder |
| `app/dse-training.tsx` | CREATE | DSE Training exercise screen |
| `app/weight-training.tsx` | CREATE | Weight Training placeholder screen |
| `admin/server.js` | MODIFY | Question CRUD routes; `is_dse_core`; updated LLM prompt |
| `admin/public/index.html` | MODIFY | Question CRUD UI; `is_dse_core` checkbox |

---

## Section 6 — Verification

1. **mc-multi grading**: 六選三 with 2 correct + 1 wrong → 0 pts; all 3 correct → full pts
2. **sentence-order grading**: correct token order → full pts; any wrong position → 0 pts
3. **fill-blank grading**: correct answer with different casing/whitespace → full pts
4. **DSE Training**: tap entry → 2–3 `is_dse_core` articles randomly selected; exercise runs; session saved as `kind = 'dse-training'`
5. **Weight Training placeholder**: entry visible on home; tapping shows "coming soon" screen
6. **Admin question CRUD**: add mc-multi question via form → appears in list → mobile fetches after sync → renders with correct checkbox UI
7. **Admin bulk generate**: "批量生成" → LLM draft cards shown; approve one → saved as draft in Supabase
8. **Admin is_dse_core**: tick checkbox → `is_dse_core = true` in DB → next mobile sync, article appears in DSE pool
9. `npm test` — all existing quiz tests pass
