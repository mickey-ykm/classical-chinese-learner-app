# Bulk Publish & Save-and-Publish Features — 2026-06-01

## Overview

Added two new features to the admin portal for faster question publishing workflow:

1. **"Publish Selected" button** — bulk publish multiple draft questions at once
2. **"Save and Publish" button** — save and publish a question in one click from the edit modal

## Feature 1: Bulk Publish Selected Questions

**UI Changes:**
- Added "Publish Selected" button next to "Delete Selected" in the draft questions section
- Button appears only when there are draft questions
- Uses existing checkboxes for selection

**Backend:**
- New route: `POST /api/questions/bulk-publish`
- Accepts `{ ids: string[] }` in request body
- Filters to only draft questions (skips already published ones)
- Updates all selected drafts to `status = "published"` in one query
- Calls `rebuildQuizJson()` once per affected article (not once per question)
- Returns `{ success: true, published: number }`

**Frontend:**
- `bulkPublishDraftQuestions()` function in `admin/public/js/questions.js`
- Validates that at least one question is selected
- Shows confirmation dialog before publishing
- Displays success toast with count of published questions
- Refreshes question list after success

**Bug Prevention:**
- ✅ Filters to only draft questions (already published questions are skipped)
- ✅ Validates non-empty selection before sending request
- ✅ Groups by article_id and rebuilds quiz_json once per article (not N times)
- ✅ Handles partial failures gracefully (reports count of successfully published questions)
- ✅ Uses transaction-safe bulk update (single UPDATE query with IN clause)

## Feature 2: Save and Publish Button

**UI Changes:**
- Added "Save and Publish" button next to "Save Question" in the question modal
- "Save Question" button changed to gray (stone-600) to differentiate from publish action
- "Save and Publish" button is green (green-600) to indicate publish action

**Backend:**
- Fixed `POST /api/questions` route to call `rebuildQuizJson()` when creating a published question
- Previously only the `PUT` route called `rebuildQuizJson` for published questions
- Now both POST and PUT routes check `status === "published"` and rebuild accordingly

**Frontend:**
- `saveAndPublishQuestion()` function in `admin/public/js/questions.js`
- Temporarily sets status dropdown to "published" before calling `saveQuestion()`
- Restores original status if save fails (modal stays open)
- Reuses all validation logic from `saveQuestion()`

**Bug Prevention:**
- ✅ POST route now calls `rebuildQuizJson()` when status is "published" (was missing before)
- ✅ All validation from `saveQuestion()` is reused (stem required, correct answer required, etc.)
- ✅ Status is explicitly set to "published" before saving
- ✅ Original status is restored if save fails (prevents confusion if user retries)
- ✅ Success message is appropriate for both create and update operations

## Testing Checklist

### Bulk Publish
- [ ] Select multiple draft questions and click "Publish Selected"
- [ ] Verify all selected questions move to "Published" section
- [ ] Verify quiz_json is updated on the articles table
- [ ] Verify mobile app sees the new questions after sync
- [ ] Try clicking "Publish Selected" with no selection (should show error toast)
- [ ] Try selecting already published questions (should skip them)

### Save and Publish
- [ ] Create a new question and click "Save and Publish"
- [ ] Verify question appears in "Published" section immediately
- [ ] Verify quiz_json is updated on the articles table
- [ ] Edit an existing draft question and click "Save and Publish"
- [ ] Verify question moves from "Draft" to "Published" section
- [ ] Try clicking "Save and Publish" with missing required fields (should show validation error)

## Files Changed

**Backend:**
- `admin/routes/questions.js`
  - Fixed POST route to call `rebuildQuizJson()` when status is "published"
  - Added `POST /api/questions/bulk-publish` route

**Frontend:**
- `admin/public/index.html`
  - Added "Save and Publish" button to question modal
  - Changed "Save Question" button color to gray
- `admin/public/js/questions.js`
  - Added `bulkPublishDraftQuestions()` function
  - Added `saveAndPublishQuestion()` function
  - Updated button layout in draft section to include "Publish Selected"
  - Exported new functions to window object
