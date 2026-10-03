# Implementation Plan: DSE Mock Exam Improvements

**Tasks:** #016, #017, #018

## Analysis

### Current Implementation (`app/(tabs)/dse-training.tsx`)

**How it works now:**
1. Randomly picks 2-3 DSE core articles
2. Fetches ALL published questions for those articles (lines 113-123)
3. Displays all questions in the quiz (no sampling)
4. Article accordion shows only `segments` (raw text with footnote markers), missing the footnote explanations
5. No article context in quiz questions

**Key findings:**
- The sampling logic (`admin/lib/sampling.js`) already exists and works for individual articles
- It samples 22 questions per article (6+2+4+2+2+6 across parts 1-6)
- The sampling API endpoint exists at `GET /api/quiz/:articleId/sample`
- The `ArticlePopup` component (used in QuizShell) properly displays raw article + footnotes

---

## Implementation Approach

### #016 — Apply sampling logic (22 questions per article)

**Backend:** Create new endpoint `GET /api/quiz/dse-mock/sample`

**Why a new endpoint instead of reusing the existing one?**
- The existing `/api/quiz/:articleId/sample` handles one article at a time with repeat-avoidance per article
- DSE mock needs multi-article sampling with global repeat-avoidance across all DSE articles
- Need to return questions with `articleId` field for #018

**Endpoint behavior:**
- Pick 2-3 random DSE core articles (same logic as current client-side)
- For each article, sample 22 questions using `sampleByPart()` from `admin/lib/sampling.js`
- If userId provided: implement cross-article repeat avoidance (prefer unseen questions across all DSE articles)
- Return format:
  ```json
  {
    "articles": [
      {"id": "...", "title": "..."}
    ],
    "questions": [
      {"id": "...", "articleId": "...", "part": 1, "stem": "...", ...}
    ],
    "totalQuestions": 44,
    "totalPoints": 48
  }
  ```

**Frontend changes:**
- Call the new endpoint instead of fetching raw questions
- Remove client-side article picking and question fetching logic
- Store the article list and questions from API response

**Total questions validation:**
- 2 articles → 44 questions (22 × 2)
- 3 articles → 66 questions (22 × 3)

---

### #017 — Fix article accordion to show raw article + footnotes

**Current bug:**
- `ArticleAccordion` component (lines 34-69) only displays `article.article.segments`
- Segments contain text like "孔子曰：「學而時習之¹，不亦說乎²？」" but the footnote explanations are missing

**Fix:**
- The `article.article` already has both `segments` and `footnotes` (it's the full `Article` object from `getArticle()`)
- Refactor `ArticleAccordion` to display both:
  1. Raw article text with footnote markers (from `segments`)
  2. Footnote explanations below (from `footnotes`)
- Match the display pattern in `ArticlePopup.tsx` (lines 50-71) which already shows both correctly

**Implementation:**
- Add a footnotes section below the segments in the expanded accordion
- Use the same styling as `ArticlePopup` for consistency

---

### #018 — Add article label and popup to quiz questions

**Challenge:** QuizShell was designed for single-article quizzes, DSE mock has multiple articles

**Solution 1 (Recommended): Extend QuizShell to support multi-article mode**

**Props changes:**
- Change `articleId?: string` to `articles?: Array<{id: string, title: string}>`
- Add `questionArticleMap?: Record<string | number, string>` (maps question.id → articleId)

**UI changes:**
- When `articles` is provided (multi-article mode):
  - Display article label badge above each question: "📄 {articleTitle}"
  - Make the badge tappable to open article popup
  - Track current question's articleId to load correct article in popup
  - Load article data lazily using `getArticle(articleId)` when popup opens

- When `articleId` is provided (single-article mode):
  - Keep current behavior (one article popup for all questions)

**ArticlePopup behavior:**
- Already works correctly (shows raw article + footnotes)
- In multi-article mode, populate it with `getArticle(currentQuestionArticleId)`

---

## Files to Change

### Backend
1. **`admin/routes/quiz.js`** (new route)
   - Add `GET /api/quiz/dse-mock/sample` endpoint
   - Use `sampleByPart()` for each article
   - Implement cross-article repeat avoidance for logged-in users

2. **`admin/lib/sampling.js`** (may need helper)
   - Possibly add `getSeenDataMultiArticle(userId, articleIds)` helper
   - Or reuse `getSeenData()` per article and merge results

### Frontend
3. **`app/(tabs)/dse-training.tsx`**
   - Replace direct Supabase query with API call to new endpoint
   - Store `articles` array from API response
   - Pass `articles` and `questionArticleMap` to QuizShell
   - Fix `ArticleAccordion` to display footnotes

4. **`components/quiz/QuizShell.tsx`**
   - Add `articles` and `questionArticleMap` props
   - Add article label badge UI above question (when in multi-article mode)
   - Update article popup to load correct article based on current question
   - Keep backward compatibility for single-article mode

5. **`lib/types.ts`** (if needed)
   - Ensure `Question` type can carry `articleId` field (may already be compatible)

---

## Testing Strategy

1. **#016 sampling validation:**
   - Test with 2 articles → verify 44 questions (22 per article, mix of parts 1-6)
   - Test with 3 articles → verify 66 questions
   - Verify questions are sampled per article, not globally concatenated

2. **#017 accordion validation:**
   - Open DSE mock lobby, expand each article accordion
   - Verify both raw text and footnote explanations are visible

3. **#018 article label validation:**
   - Start DSE mock quiz
   - Verify each question shows correct article label badge
   - Tap article badge → verify correct article opens in popup
   - Verify popup shows raw article + footnotes (not just footnotes)

---

## Risk Assessment

**Low risk:**
- #017 is a pure UI fix (add footnotes to accordion)
- #018 extends existing QuizShell props without breaking single-article mode

**Medium risk:**
- #016 requires new backend logic for multi-article sampling
- Cross-article repeat avoidance is complex (needs to track seen questions across all DSE articles)

**Mitigation:**
- Start with #017 (quick win, validates the accordion display pattern)
- Implement #016 backend endpoint with thorough testing
- Add #018 last (depends on #016's `articleId` field in questions)

---

## Execution Order

1. **#017** — Fix accordion (quick, independent)
2. **#016** — Backend sampling endpoint + frontend integration
3. **#018** — Article label + popup (builds on #016)

---

## Estimated Complexity

- **#017:** Small (1 file, UI-only change)
- **#016:** Medium (new endpoint + sampling logic + frontend integration)
- **#018:** Medium (QuizShell prop changes + conditional UI + article loading)

**Total:** ~3-4 hours of implementation + testing
