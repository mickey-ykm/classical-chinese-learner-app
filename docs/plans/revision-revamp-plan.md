# Revision Exercise Revamp Plan

## Current Status
- Existing `/app/revision.tsx` uses old `fetchRevisionQuestions()` from `lib/revisionSession.ts`
- Only tracks mistakes from `questions` table (Parts 1-6)
- Missing weight training mistakes (Parts 7-8 from `cross_article_questions`)
- No statistics or smart prioritization

## Implementation Plan

### Phase 1: Backend API (admin/routes/revision.js)

Create new endpoints:

```javascript
// GET /api/revision/summary?userId=<uuid>
// Returns: overall stats + byArticle + byPart grouping

// GET /api/revision/sample?userId=<uuid>&articleId=<id>&limit=10
// Returns: 10 questions from specific article

// GET /api/revision/sample?userId=<uuid>&part=<N>&limit=10
// Returns: 10 questions from specific part

// GET /api/revision/sample?userId=<uuid>&limit=15
// Returns: 15 mixed questions (smart sampling)
```

### Phase 2: Backend Logic (admin/lib/revision-helpers.js)

**Key functions:**
1. `getMistakeQuestions(userId)` - Query both tables, track correction status
2. `getRevisionSummary(userId)` - Group by article and part, find weakest part
3. `sampleRevisionQuestions(userId, options)` - Smart sampling with priority scoring

**Correction Logic:**
- Question is "corrected" when answered correctly AFTER last wrong answer
- Track `lastWrongAt` and `lastCorrectAt` timestamps
- Filter to only show uncorrected mistakes

**Smart Sampling Algorithm:**
```
score = (mistakeCount * 3) + (recentBonus) + (neverCorrectedBonus)
- Recent (< 7 days): +10
- Recent (7-30 days): +5  
- Never corrected: +15
```

### Phase 3: Mobile UI (app/revision.tsx)

**Lobby Screen Structure:**
```
📊 整體統計
- 總計：X 題待重溫
- 最弱部分：Part N (Y 題)

[Tab: 文章檢視 | 部分檢視]

--- Article View (default) ---
📚 文章錯題 (X 題)
  [Article Card]
  - Title
  - Part breakdown: Part 1: 3 題 | Part 2: 2 題
  - [開始重溫] button

💪 重量訓練錯題 (Y 題)
  - Part 7: 5 題 | Part 8: 3 題
  - [開始重溫] button

--- Part View (tab 2) ---
第 1 部分：字詞句譯 (X 題)
  - 論仁論孝君子: 3 題
  - 廉頗藺相如: 2 題
  - [練習這部分] button
```

**Navigation:**
- Tap article card → `/revision?articleId=<id>`
- Tap part card → `/revision?part=<N>`
- Tap "全部重溫" → `/revision` (mixed)

### Phase 4: Quiz Integration

Reuse existing `QuizShell` with `kind='revision'`:
- Fetch questions via new API
- Convert to `Question[]` format
- Pass to QuizShell
- Save results (existing `saveRevisionSession` logic)

### Implementation Steps

**Step 1: Replace revision-helpers.js (already created)**
- Delete SQL function references
- Implement direct SQL queries via Supabase client
- Track correction status properly

**Step 2: Create admin/routes/revision.js**
```javascript
const router = require("express").Router()
const { getRevisionSummary, sampleRevisionQuestions } = require("../lib/revision-helpers")

router.get("/summary", async (req, res) => {
  const { userId } = req.query
  if (!userId) return res.status(400).json({ error: "userId required" })
  
  const summary = await getRevisionSummary(userId)
  res.json(summary)
})

router.get("/sample", async (req, res) => {
  const { userId, articleId, part, limit } = req.query
  if (!userId) return res.status(400).json({ error: "userId required" })
  
  const questions = await sampleRevisionQuestions(userId, {
    articleId,
    part: part ? parseInt(part) : undefined,
    limit: limit ? parseInt(limit) : 15
  })
  
  res.json(questions)
})

module.exports = router
```

**Step 3: Mount router in admin/server.js**
```javascript
app.use("/api/revision", require("./routes/revision"))
```

**Step 4: Replace app/revision.tsx**
- Fetch `/api/revision/summary` on mount
- Display article view + part view tabs
- Handle navigation to quiz with filters

**Step 5: Update QuizShell (if needed)**
- Ensure `kind='revision'` works for both question sources
- Handle null `article_id` for weight training questions

### Testing Checklist

- [ ] Get wrong answers from article quiz → appears in revision
- [ ] Get wrong answers from weight training → appears in revision
- [ ] Answer a mistake correctly → disappears from revision
- [ ] Article view shows correct grouping
- [ ] Part view shows correct grouping
- [ ] Weakest part recommendation is accurate
- [ ] Smart sampling prioritizes recent + frequent mistakes
- [ ] Sample by article returns 10 questions
- [ ] Sample by part returns 10 questions
- [ ] Mixed sample returns 15 questions

### Estimated Time: 3-4 hours total

- Backend (revision-helpers.js + routes): 1 hour
- Mobile UI (revision.tsx): 1.5 hours
- Testing + polish: 1 hour

