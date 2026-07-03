# Sitemap & Information Architecture — Jiān Design System Revamp

**Document Purpose:** This document maps the proposed navigation structure and information architecture from the Jiān design system HTML mockups to the current app structure, highlighting hierarchy changes, page consolidations, and UX reorganization.

**Date Created:** 2026-07-03  
**Design Source:** `/docs/design/ui-revamp-html-mock-up/` (42 HTML files)  
**Current App Structure:** Expo Router with `(tabs)` layout + stack screens

---

## 1. Navigation Structure Comparison

### Current App (5-tab bottom navigation)

```
Bottom Tabs:
├─ 首頁 (Home)
├─ DSE文章 (DSE Articles) 
├─ 其他文章 (Other Articles)
├─ DSE操練 (DSE Training)
└─ 帳戶 (Account)

Stack Screens (pushed over tabs):
├─ /read (Article Reader)
├─ /quiz (Quiz)
├─ /account (Account/History)
├─ /attempt (Attempt Detail)
├─ /revision (Revision - general with toggle)
├─ /revision-article (Revision - article-only)
├─ /revision-part (Revision - part-only)
└─ /exercise-history (Full exercise history)
```

### Proposed Design (4-tab bottom navigation)

```
Bottom Tabs:
├─ 首頁 (Home)
├─ 篇章 (Chapters) — CONSOLIDATED
├─ 操練 (Practice Hub) — RENAMED & RESTRUCTURED
└─ 帳戶 (Account)

Stack Screens:
├─ Article Reader (2-tab: 原文 / 白話語譯)
├─ Quiz (with article viewer)
├─ Score Result
├─ 詳細報告 (Detailed Analysis Report)
├─ 文章錯題重溫 (Article-based Mistakes Review)
├─ 語基能力錯題重溫 (Grammar-based Mistakes Review)
└─ 針對性難題訓練 (Weight Training)
```

---

## 2. Major Hierarchy Changes

### Change #1: Tab Consolidation (5 → 4 tabs)

**Current:**
- Tab 2: DSE文章 (dse-learner.tsx)
- Tab 3: 其他文章 (extra-articles.tsx)

**Proposed:**
- **Single Tab: 篇章 (Chapters)** with segmented control for filtering
- 3-segment control: `甲部指定` | `高中課文` | `其他範文`

**Impact:**
- Eliminates one tab from bottom navigation
- Uses in-page segmented control instead of separate tabs
- Simplifies mental model: "all articles live in one place"

**Files Affected:**
- `app/(tabs)/dse-learner.tsx` → merge into new `chapters.tsx`
- `app/(tabs)/extra-articles.tsx` → merge into new `chapters.tsx`
- New file: `app/(tabs)/chapters.tsx`

---

### Change #2: DSE Training → Practice Hub (操練)

**Current (dse-training.tsx):**
- Primarily DSE mock exam lobby
- Links to revision exercises
- Weight training (greyed out in current, active in design)

**Proposed (11-practice-hub.html):**
- **Renamed to "操練" (Practice Hub)**
- Clear visual hierarchy with 4 distinct sections:
  1. **DSE 模擬考題** (primary card with ink background)
  2. **文章錯題重溫** (card with icon)
  3. **語基能力錯題重溫** (card with icon) 
  4. **針對性難題訓練** (card with icon)

**Impact:**
- Tab label changes from "DSE操練" to "操練"
- Removes DSE-specific branding from this tab
- Elevates weight training to same visual priority as other modes
- Each mode gets dedicated landing page (not inline expansion)

**Files Affected:**
- `app/(tabs)/dse-training.tsx` → rename/restructure to `practice.tsx`
- Current revision routes may be consolidated

---

### Change #3: Home Screen UX Simplification

**Current (index.tsx):**
- Greeting + user stats
- DSE操練 banner (single large card)
- DSE文章 preview (3 articles + "更多")
- 其他文章 preview (3 articles + "更多") 
- Recent quiz history (3 attempts + "更多")

**Proposed (01-home-logged-in.html):**
- **Daily task system ("今日課業")** with checklist progress
- Countdown to DSE exam date
- Streak indicator (連續練習 6 天 🔥)
- "接下來" next recommended task (large CTA)
- **"繼續篇章"** section (3 articles with progress) — replaces dual preview
- **"能力分析"** weakness highlight (single card)

**Impact:**
- Introduces daily task/goal system (new feature)
- Removes duplicate article preview sections
- Single "繼續篇章" replaces both DSE + 其他 previews
- Focuses on personalized next action vs browsing

**New Features Required:**
- Daily task generation logic
- Task completion tracking
- DSE exam countdown calculator
- Weakness detection algorithm

**Files Affected:**
- `app/(tabs)/index.tsx` — major restructure

---

### Change #4: Account Page Reorganization

**Current (account.tsx):**
- User info card
- Stats (accuracy, attempts, streak)
- Ability analysis card (最弱 part)
- Recent exercise history (inline list, can be long)
- Settings section (sync buttons, about, logout)

**Proposed (15-account-profile.html):**
- User info + stats (same structure)
- **Ability analysis with CTA** ("詳細報告 →")
- **Upgrade card** (for free users)
- **Recent practice (3 items only)** with "全部紀錄 →" link
- Settings section (same)

**Impact:**
- History moved to separate page (already exists as `/exercise-history`)
- Ability analysis becomes clickable → detailed report page
- Upgrade prompt more prominent

**New Pages Required:**
- Detailed analysis report page (18-report-detail-analysis.html)

**Files Affected:**
- `app/account.tsx` — shorten history section
- New: `app/report.tsx` (detailed analysis)

---

### Change #5: Revision System Consolidation

**Current (3 separate pages):**
- `/revision` — general with article/part toggle
- `/revision-article` — article-only list
- `/revision-part` — part-only list

**Proposed (2 dedicated pages from Practice Hub):**
- `/review-mistakes-article` — 文章錯題重溫 (article-based)
- `/review-mistakes-basics` — 語基能力錯題重溫 (grammar-based, parts 7-8)

**Impact:**
- Removes toggle pattern from general revision
- Clear separation: article mistakes vs grammar basics
- Both accessed via Practice Hub, not home screen
- More explicit naming (錯題重溫 instead of 溫故知新)

**Files Affected:**
- `app/revision.tsx` → may be deprecated or repurposed
- `app/revision-article.tsx` → rename to `review-article.tsx`
- `app/revision-part.tsx` → rename to `review-basics.tsx`

---

## 3. New Features & Pages

### 3.1 Daily Task System

**Mockups:** 01-home-logged-in.html, 02-home-tasks-done.html

**Features:**
- 3-task daily plan with progress (1/3 完成)
- Task types: 重溫錯題, 模擬一篇, 難題訓練
- Visual states: ✓ done, ● in progress, ○ todo
- Task completion triggers celebration state

**Implementation Needs:**
- Backend: daily task generation logic
- Frontend: checklist component with state management
- Celebration screen for completing all tasks

---

### 3.2 Detailed Analysis Report

**Mockup:** 18-report-detail-analysis.html

**Features:**
- Weakest skill highlight (red card with mascot)
- Strongest skill highlight (green card with mascot)
- 8-part accuracy breakdown with progress bars
- Per-article accuracy list
- CTAs: "針對「一詞多義」操練", "查看全部錯題"

**Implementation Needs:**
- New route: `/report`
- Analytics aggregation backend
- Mascot animations (already have SVG mascots)

---

### 3.3 Chapter List Enhancements

**Mockup:** 05-chapters-category-a.html

**Features:**
- **Progress tracking per article** (28/50 seen questions)
- **Smart CTAs**: "再練" vs "開始" vs "衝刺" (based on progress)
- **Visual progress bars** on each article card
- **Estimated attempts**: "約再 2 次覆蓋全部題庫"
- **Locked state** with upgrade prompt (ink background)
- **Near-completion state** (amber highlight)

**Implementation Needs:**
- Progress calculation per article
- Smart CTA logic (progress thresholds)
- Visual state variants for cards

---

### 3.4 Quiz Improvements

**Mockups:** 20-27 (quiz states)

**Features:**
- Article viewer in quiz header ("查看原文" button)
- Timer display (⏱ 18:24)
- Progress bar + question counter (07 / 22)
- Part label badge ("第一部分 · 字詞解釋（單選）")
- Mascot illustrations for different states

**Implementation Needs:**
- Enhanced quiz header component
- Part label display logic
- Article popup integration (already exists)

---

### 3.5 Reader Enhancements

**Mockup:** 07-reader-original-text.html

**Features:**
- 2-tab interface: `原文` | `白話語譯`
- **Bottom sheet footnote display** (replaces inline tooltip)
- Tap instruction hint ("點擊 ⑴ 查看注釋")
- Prominent CTA: "開始練習 ›"

**Implementation Needs:**
- Bottom sheet component for footnotes
- 2-tab reader interface (already exists, may need refinement)

---

## 4. User State Variations

### 4.1 Home Screen States

**Mockups provide 4 home states:**

1. **01-home-logged-in.html** — Active user with tasks
2. **02-home-tasks-done.html** — Celebration state (all tasks complete)
3. **03-home-new-user.html** — First-time user onboarding
4. **04-home-guest.html** — Anonymous user state
5. **30-home-paid-user.html** — Pro user (no upgrade prompts)

**Implementation Needs:**
- State detection logic
- Celebration animation/screen
- Onboarding flow for new users

---

### 4.2 Account States

1. **15-account-profile.html** — Free logged-in user
2. **28-account-guest.html** — Anonymous user
3. **29-account-paid-user.html** — Pro user

---

## 5. Component Consolidation Opportunities

### 5.1 Reusable Components to Build (`/components/jian/`)

Based on design language (00-design-language.html):

**Buttons:**
- `PrimaryButton` — vermilion CTA
- `InkButton` — ink background variant
- `OutlineButton` — bordered secondary

**Cards:**
- `ArticleCard` — with progress bar, smart CTA, lock state
- `StatCard` — for analytics/stats
- `TaskCard` — for daily tasks with checkbox

**Badges:**
- `TypeBadge` — DSE甲部指定篇章, 高中課文, etc.
- `LockBadge` — ⊘ 付費
- `WeaknessBadge` — ⚠ 最弱

**Controls:**
- `SegmentedControl` — 3-segment for chapter filtering
- `ProgressBar` — with jade/amber/vermilion variants

**Mascots:**
- `MascotGuan` (官) — official/scholar
- `MascotBi` (筆) — brush
- `MascotMo` (墨) — ink stick
- `MascotZhi` (紙) — paper
- `MascotYan` (硯) — inkstone

All mascots have 3 states: happy, thinking, sad (opacity toggle in SVG)

---

## 6. Visual Design System Changes

### 6.1 Color Palette (Jiān System)

**Current:** Amber-based (`amber-500`, `amber-600`, slate backgrounds)

**Proposed:**
```css
--paper: #f4f0e6      (background)
--surface: #fdfbf6    (card background)
--surface2: #faf5ea   (segmented control bg)

--ink: #2c2722        (primary text)
--ink2: #6f665a       (secondary text)
--ink3: #a59b8b       (tertiary text / labels)

--line: #e7ddc9       (borders)
--line2: #ded2ba      (borders secondary)

--verm: #b0392c       (vermilion - primary CTA)
--jade: #3f6b54       (jade - success/progress)
--amber: #bb8a2e      (amber - warning/high progress)
```

**Tint/Border variants use CSS `color-mix()`**

---

### 6.2 Typography

**Fonts:**
- **Noto Serif TC** — titles, body text, buttons (replaces Georgia for headings)
- **Noto Sans TC** — labels, captions, UI text
- **Newsreader** — numbers, timers, scores

**Sizes:**
- Display: 31px / 700
- Title: 21px / 600
- Body: 18px / line-height 2.3 (for classical text)
- Caption: 11-13px

---

### 6.3 Spacing & Radius

**Spacing:** 4px base unit (4, 8, 12, 16, 24, 32)

**Border Radius:**
- Chips/badges: 3-4px
- Buttons: 6-8px
- Cards: 11-12px
- Sheets/modals: 20px
- Full circles: 50%

---

## 7. Navigation Flow Changes

### 7.1 Article → Quiz Flow

**Current:**
```
Chapters Tab → Article Card → /read → "開始練習" → /quiz → Score
```

**Proposed (same, but reader may be optional):**
```
篇章 Tab → Article Card → /read (2-tab) → "開始練習" → /quiz → /score
                       ↘ OR direct → /quiz
```

---

### 7.2 Practice Hub Flow

**Proposed:**
```
操練 Tab (Practice Hub)
├─ DSE 模擬考題 → /quiz (DSE mock) → /score
├─ 文章錯題重溫 → /review-article (list) → select article → /quiz (mistakes) → /score
├─ 語基能力錯題重溫 → /review-basics (list) → select part → /quiz (mistakes) → /score
└─ 針對性難題訓練 → /weight-training (lobby) → /quiz → /score
```

**Current:**
```
DSE操練 Tab
├─ DSE 模擬考題 (inline) → /quiz
├─ 溫故知新 (button) → /revision
└─ 針對性難題訓練 (greyed out)
```

---

## 8. Implementation Roadmap

### Phase 1: Foundation (UX hierarchy changes, no visual changes yet)

**Goal:** Restructure navigation and consolidate pages using existing styling

1. **Consolidate tabs** (5→4)
   - Merge `dse-learner.tsx` + `extra-articles.tsx` → `chapters.tsx`
   - Add segmented control for filtering
   - Test: all articles accessible, filtering works

2. **Restructure Practice Hub**
   - Rename `dse-training.tsx` → `practice.tsx`
   - Add 4-card layout (DSE mock, article mistakes, grammar mistakes, weight training)
   - Link to existing revision pages

3. **Simplify Home**
   - Remove duplicate article previews
   - Single "繼續篇章" section
   - Keep existing stats/analytics

4. **Shorten Account**
   - Limit recent history to 3 items
   - Add "全部紀錄 →" link to `/exercise-history`

**Success Criteria:**
- All existing features accessible via new structure
- No visual design changes yet (keep current amber/slate theme)
- Pass all existing tests

---

### Phase 2: Component Library (Jiān design tokens)

**Goal:** Build reusable Jiān components with new design system

1. **Design tokens setup**
   - CSS variables for Jiān palette
   - Typography scale
   - Spacing/radius constants

2. **Core components** (`/components/jian/`)
   - `Button` variants (primary, ink, outline)
   - `Card` variants (default, locked, near-complete)
   - `Badge` variants (type, lock, weakness)
   - `SegmentedControl`
   - `ProgressBar`

3. **Mascot components**
   - SVG components for 5 mascots
   - State variants (happy/thinking/sad)

**Success Criteria:**
- Storybook/design system page showcasing all components
- Components match design mockups pixel-perfect

---

### Phase 3: Page-by-Page UI Migration

**Goal:** Apply Jiān styling to each page incrementally

**Order (suggested):**
1. Login screen (simple, low risk)
2. Chapters tab (high visibility, clear spec)
3. Article reader (moderate complexity)
4. Quiz interface (preserve existing logic, apply styling)
5. Home screen (complex, depends on new features)
6. Practice Hub (moderate)
7. Account screen (simple)

**Per-page process:**
1. Create new page version with `-jian` suffix (e.g., `chapters-jian.tsx`)
2. Apply Jiān components and styling
3. A/B test or feature flag
4. Swap production route
5. Remove old version

**Success Criteria:**
- Visual parity with design mockups
- No regressions in functionality
- Performance metrics maintained

---

### Phase 4: New Features

**Goal:** Implement new features shown in designs

1. **Daily task system**
   - Backend: task generation API
   - Frontend: home screen task checklist
   - Celebration screen for completion

2. **Detailed analysis report**
   - `/report` page
   - Analytics aggregation logic
   - Weakness/strength detection

3. **Enhanced article cards**
   - Progress tracking per article
   - Smart CTA logic (再練/開始/衝刺)
   - Near-completion state (amber highlight)

4. **User state variations**
   - New user onboarding flow
   - Celebration screens
   - Pro user experience

**Success Criteria:**
- New features tested with real users
- Analytics show engagement improvement

---

## 9. Design Files Reference

| File | Screen | Notes |
|------|--------|-------|
| 00-design-language.html | Design System | Color palette, typography, component library |
| 01-home-logged-in.html | Home (Active User) | Daily tasks, countdown, next action CTA |
| 02-home-tasks-done.html | Home (Tasks Complete) | Celebration state |
| 03-home-new-user.html | Home (New User) | Onboarding state |
| 04-home-guest.html | Home (Guest) | Anonymous user |
| 05-chapters-category-a.html | Chapters (甲部指定) | Progress bars, smart CTAs |
| 06-chapters-other.html | Chapters (其他) | Same structure, different filter |
| 07-reader-original-text.html | Reader (原文) | Bottom sheet footnotes |
| 08-reader-translation.html | Reader (白話語譯) | Translation tab |
| 09-dse-mock-exam.html | DSE Mock Lobby | Article accordion (not used in current flow) |
| 10-score-result.html | Score Screen | Part breakdown, mascot states |
| 11-practice-hub.html | Practice Hub | 4-section layout |
| 12-review-mistakes-article.html | Article Mistakes | List with part breakdown |
| 13-review-mistakes-basics.html | Grammar Mistakes | Parts 7-8 focus |
| 14-weight-training.html | Weight Training Lobby | Progress display |
| 15-account-profile.html | Account (Free User) | Upgrade prompt |
| 16-login.html | Login | Google + Magic Link |
| 17-upgrade-modal.html | Upgrade Modal | Pricing, benefits |
| 18-report-detail-analysis.html | Detailed Report | 8-part breakdown, per-article stats |
| 19-magic-link-sent.html | Login Confirmation | Email sent state |
| 20-27 | Quiz States | Single/multi choice, fill-blank, sentence order (answered/unanswered) |
| 28-account-guest.html | Account (Guest) | Anonymous state |
| 29-account-paid-user.html | Account (Pro User) | No upgrade prompt |
| 30-home-paid-user.html | Home (Pro User) | No locks on articles |
| 31-text-viewer-multi-article.html | Article Viewer (Multi) | For DSE mock |
| 32-text-viewer-single-article.html | Article Viewer (Single) | For single quiz |
| 33-splash-screen.html | Splash | App logo |
| 34-login-success.html | Login Success | Transition screen |
| 35-about-us.html | About Us | Info page |
| 36-terms-of-service.html | Terms | Legal |
| 37-privacy-policy.html | Privacy | Legal |
| 38-loading-skeleton.html | Loading State | Skeleton screen |
| 39-chapters-empty-search.html | Empty State | No results |
| 40-connection-error.html | Error State | Network error |
| 41-session-expired.html | Error State | Auth expired |

---

## 10. Key Decisions — ✅ CONFIRMED (2026-07-03)

### 10.1 Tab Labels ✅

**Decision:** ACCEPTED — Use "操練" (Practice)

**Rationale:** Makes tab less DSE-specific, better reflects that it includes weight training and mistake review beyond DSE.

---

### 10.2 Revision System Naming ✅

**Decision:** ACCEPTED — Use "錯題重溫" (Mistake Review)

**Rationale:** More explicit terminology, especially for new users who may not understand the traditional idiom "溫故知新".

---

### 10.3 Daily Task System ✅

**Decision:** DEFER to Phase 4

**Rationale:** Complete UX hierarchy changes (Phase 1) and visual migration (Phase 3) first. Daily tasks require backend logic and may need user research to validate. Home screen will temporarily show simplified layout without daily tasks.

---

### 10.4 Chapter Preview on Home ✅

**Decision:** Show most recent exercise history

**Implementation:** Use existing exercise history data, sorted by most recent. Show 3 articles the user recently practiced.

---

### 10.5 Weight Training Visibility ✅

**Decision:** Weight training IS the "針對性難題訓練" feature, already implemented

**Action:** Update Practice Hub to show weight training as active (not greyed out). Feature is complete as of 2026-06-23.

---

## 11. Summary of Major Changes

| Aspect | Current | Proposed | Impact |
|--------|---------|----------|--------|
| **Bottom Tabs** | 5 tabs | 4 tabs | Consolidation |
| **Articles** | 2 separate tabs | 1 tab with segments | Simplification |
| **Practice** | DSE-branded | Generic "操練" hub | Rebranding |
| **Home** | Dual article previews | Single continue section | Simplification |
| **Revision** | 3 pages with toggle | 2 dedicated pages | Clarity |
| **Daily Tasks** | None | 3-task checklist | New feature |
| **Analysis** | Basic card | Detailed report page | New feature |
| **Design System** | Amber/Slate | Jiān (Paper/Ink/Vermilion) | Complete overhaul |

---

## End of Document

**Next Steps:**
1. Review this sitemap with stakeholders
2. Prioritize hierarchy changes vs visual changes
3. Decide on phasing approach (recommended 4 phases above)
4. Begin Phase 1 implementation (UX hierarchy)
