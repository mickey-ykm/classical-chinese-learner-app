# Question Type Labels Feature — 2026-06-02

## Overview

Added a question type labeling system to categorize questions by their pedagogical purpose. Each question can have multiple labels from 5 predefined types.

## Question Type Labels

1. **字詞解釋** (Word/Phrase Explanation) — Questions about word or phrase meanings
2. **語句背誦** (Sentence Recitation) — Questions requiring memorization of original text
3. **語句翻譯** (Sentence Translation) — Questions requiring translation to modern Chinese
4. **修辭手法** (Rhetorical Devices) — Questions about rhetorical techniques
5. **內容重點** (Content Focus) — Questions about content focus (causes, reasoning, ideas)

## Database Schema

**Option A: Array column (IMPLEMENTED)**

```sql
ALTER TABLE questions ADD COLUMN question_types text[] DEFAULT '{}';

ALTER TABLE questions ADD CONSTRAINT valid_question_types 
  CHECK (
    question_types <@ ARRAY[
      '字詞解釋',
      '語句背誦',
      '語句翻譯',
      '修辭手法',
      '內容重點'
    ]::text[]
  );
```

**Why array column over junction table:**
- Simpler queries (no joins needed)
- Easier to include in `quiz_json` output
- Mobile app already handles arrays well
- PostgreSQL array operators (`@>`, `&&`) are efficient
- CHECK constraint enforces valid values

## Implementation

### 1. Database Migration

Run SQL in Supabase dashboard:
```bash
docs/question-types-migration.sql
```

### 2. Backend Changes

**`admin/lib/schemas.js`:**
- Added `VALID_QUESTION_TYPES` constant
- Added `question_types` field to `QuestionUpsertSchema` (optional, nullable)
- Added `questionTypes` field to `QuizQuestionSchema` (for quiz JSON validation)

**`admin/lib/article-helpers.js`:**
- Updated `rebuildQuizJson()` to include `questionTypes: q.question_types ?? []` in quiz_json output

**`admin/routes/questions.js`:**
- Imported `VALID_QUESTION_TYPES` constant
- Updated `/import` route to filter invalid question types from AI-generated JSON
- Handles both camelCase (`questionTypes`) and snake_case (`question_types`) from AI output

### 3. Admin Portal UI

**`admin/public/index.html`:**
- Added checkbox group for question type labels after the Status field
- 5 checkboxes with clear labels (Chinese + English)
- Styled with amber accent color for consistency

**`admin/public/js/questions.js`:**
- `openQuestionModal()`: Clears all checkboxes on open, sets checkboxes based on `q.question_types` when editing
- `saveQuestion()`: Collects checked values into `question_types` array before sending to API

### 4. Mobile App Types

**`lib/types.ts`:**
- Added `questionTypes?: string[]` to `Question` interface
- Includes comment documenting the 5 valid values

## Usage

### Admin Portal

1. Open question modal (Add or Edit)
2. Scroll to "Question Type Labels" section
3. Check one or more labels that apply
4. Save question (labels are stored in `question_types` column)
5. Labels are included in `quiz_json` when question is published

### AI Generation

Add to quiz prompt template:

```
For each question, assign appropriate question type labels from:
- 字詞解釋: Questions about word/phrase meanings
- 語句背誦: Questions requiring memorization of original text
- 語句翻譯: Questions requiring translation to modern Chinese
- 修辭手法: Questions about rhetorical devices
- 內容重點: Questions about content focus (causes, reasoning, ideas)

A question can have multiple labels if applicable.

Output format:
{
  "parts": [{
    "questions": [{
      "stem": "...",
      "options": [...],
      "correctAnswer": "...",
      "questionTypes": ["字詞解釋"],  // <-- NEW FIELD
      ...
    }]
  }]
}
```

### Mobile App (Future)

Currently, `questionTypes` is stored but not displayed in the mobile app. Future enhancements could include:
- Display labels as badges on questions
- Filter questions by type
- Analytics on question type performance
- Adaptive learning based on weak question types

## Data Flow

1. **Admin creates/edits question** → `question_types` array stored in `questions` table
2. **Question published** → `rebuildQuizJson()` includes `questionTypes` in `quiz_json`
3. **Mobile app syncs** → `quiz_json` downloaded with `questionTypes` field
4. **Mobile app displays quiz** → `questionTypes` available but not yet used in UI

## Backward Compatibility

- Existing questions without labels: `question_types` defaults to `[]` (empty array)
- `rebuildQuizJson()` uses `q.question_types ?? []` to handle null values
- Mobile app: `questionTypes?: string[]` is optional, won't break existing code
- AI import: Invalid labels are filtered out, valid ones are kept

## Testing Checklist

### Database
- [ ] Run migration SQL in Supabase dashboard
- [ ] Verify `question_types` column exists with default `'{}'`
- [ ] Verify CHECK constraint rejects invalid values
- [ ] Test inserting question with valid labels
- [ ] Test inserting question with invalid label (should fail)

### Admin Portal
- [ ] Create new question with 1 label
- [ ] Create new question with multiple labels
- [ ] Create new question with no labels
- [ ] Edit existing question and add labels
- [ ] Edit existing question and remove labels
- [ ] Verify labels persist after save
- [ ] Verify labels appear in question listing (future enhancement)

### Backend
- [ ] Verify `rebuildQuizJson()` includes `questionTypes` in output
- [ ] Verify `quiz_json` column updated after publishing question with labels
- [ ] Import quiz JSON with `questionTypes` field
- [ ] Import quiz JSON with invalid labels (should filter them out)
- [ ] Verify mobile app receives `questionTypes` in sync

### Mobile App
- [ ] Verify TypeScript compiles without errors
- [ ] Verify quiz data loads correctly with `questionTypes` field
- [ ] Verify app doesn't crash when `questionTypes` is missing (backward compat)

## Files Changed

**Database:**
- `docs/question-types-migration.sql` (new)

**Backend:**
- `admin/lib/schemas.js` — Added `VALID_QUESTION_TYPES`, updated schemas
- `admin/lib/article-helpers.js` — Updated `rebuildQuizJson()` to include `questionTypes`
- `admin/routes/questions.js` — Updated import route to filter invalid labels

**Frontend:**
- `admin/public/index.html` — Added checkbox group for question type labels
- `admin/public/js/questions.js` — Updated modal open/save logic

**Mobile:**
- `lib/types.ts` — Added `questionTypes?: string[]` to `Question` interface

## Next Steps

1. **Run database migration** in Supabase dashboard
2. **Deploy admin portal** to Railway
3. **Create quiz prompt template** with question type instructions
4. **Test** creating questions with labels
5. **Future:** Display labels in mobile app UI
6. **Future:** Add filtering/analytics by question type
