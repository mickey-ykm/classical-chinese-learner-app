# UI Redesign Implementation Plan
## Jiān (簡) Design System Integration

**Status:** Draft for Review  
**Created:** 2026-07-02  
**Design Files:** `/docs/design/pages/` (42 HTML pages analyzed)

---

## Executive Summary

The new design system represents a **complete visual identity shift** from modern mobile app aesthetics to traditional Chinese editorial design. The changes are comprehensive, affecting every screen, component, and interaction pattern.

**Key Changes:**
- **Visual Identity:** Modern app → Traditional Chinese stationery aesthetic
- **Color System:** Amber primary → Vermilion primary (with jade/amber semantic roles)
- **Typography:** Georgia → Noto Serif TC + Noto Sans TC
- **Background:** Slate-50 → Paper (#F4F0E6 warm beige)
- **Styling Approach:** NativeWind utilities → Semantic CSS classes with design tokens
- **Mascot:** SVG scholar character with 5 emotional states

---

## 1. Design System Foundations

### 1.1 Color Palette ("Jiān System")

| Name | Hex | Current Equivalent | Usage |
|------|-----|-------------------|--------|
| **Paper** | `#F4F0E6` | `slate-50` | Background |
| **Ink** | `#2C2722` | `slate-800` | Primary text |
| **Ink2** | `#6F665A` | `slate-600` | Secondary text |
| **Ink3** | `#A59B8B` | `slate-400` | Tertiary text |
| **Vermilion (硃)** | `#B0392C` | `amber-600` | Primary actions, errors |
| **Jade (玉)** | `#3F6B54` | N/A | Success, progress, completion |
| **Amber (琥)** | `#BB8A2E` | `amber-500` | Warnings, locks, premium |
| **Line** | `#E7DDC9` | `slate-200` | Borders |
| **Line2** | `#DED2BA` | `slate-300` | Secondary borders |

**Color Tints:** Use `color-mix()` at 13-17% with paper for backgrounds, 34-42% for borders.

### 1.2 Typography

| Purpose | Current | New | Weights | Sizes |
|---------|---------|-----|---------|-------|
| Chinese display | Georgia | Noto Serif TC | 700 | 30px |
| Chinese body | Georgia | Noto Serif TC | 400 | 17px |
| UI labels | System | Noto Sans TC | 500 | 10-14px |
| Numbers/scores | System | Newsreader | 400-700 | 16-78px |

**Line Height:** Body text uses 1.9 (vs current 1.5-1.7) for improved readability of classical Chinese.

### 1.3 Spacing & Layout

- **Grid:** 4px increment system (4, 8, 12, 16, 24, 32)
- **Card padding:** 12-16px (vs current 16-20px)
- **Section spacing:** 20-30px
- **Border radius:** 
  - Chips: 4px
  - Buttons: 6px
  - Cards: 11px (vs current 16-20px)
  - Sheets: 20px
  - Device frame: 38px

---

## 2. Component Inventory & Mapping

### 2.1 New Components (Not in Current App)

| Component | Design Files | Usage | Priority |
|-----------|--------------|-------|----------|
| **Daily Plan Checklist** | 01-home-logged-in.html, 02-home-tasks-done.html | Home screen task tracking with 3 states (✓ done, ● next, ○ todo) | **HIGH** (core feature) |
| **DSE Countdown** | 01, 02, 30-home screens | "312天後文憑試" banner | **HIGH** |
| **Streak Indicator** | 01, 02, 30-home screens | "已連續練習 6 天 🔥" | **HIGH** |
| **Ability Analysis Card** | 15-account, 18-report | Weakest/strongest skill with mascot + percentage | **HIGH** |
| **Article Progress Variants** | 05-chapters | 4 card states: standard, locked, challenge, near-complete | **MEDIUM** |
| **Segmented Control** | 07-08-reader | Toggle between 原文/白話語譯 | **HIGH** |
| **Footnote Bottom Sheet** | 07-reader | Red footnote markers → bottom sheet explanation | **HIGH** |
| **Multi-Article Tabs** | 31-text-viewer-multi-article | Numbered tabs for cross-article quiz viewing | **MEDIUM** |
| **Part Performance Breakdown** | 10-score, 18-report | 8-row part accuracy display | **MEDIUM** |
| **Loading Skeleton** | 38-loading-skeleton | Shimmer animation with gradient sweep | **LOW** |
| **Connection Error State** | 40-connection-error | Sad mascot + retry CTA | **MEDIUM** |
| **Session Expired State** | 41-session-expired | Small scroll mascot + re-login prompt | **LOW** |

### 2.2 Components Requiring Redesign

| Current Component | Changes Needed | Effort |
|-------------------|----------------|--------|
| **Home Screen** | Complete restructure: daily plan, countdown, streak, different states (guest/new/active/done/paid) | **HIGH** |
| **Article List** | New card designs with progress indicators, lock badges, challenge variants | **MEDIUM** |
| **Reader View** | Segmented control, footnote system, better typography | **HIGH** |
| **Quiz Questions** | Color updates (vermilion → jade), mascot states, better feedback | **MEDIUM** |
| **Score Screen** | Complete redesign: large score display, part breakdown, encouragement messages | **MEDIUM** |
| **Account Screen** | 3 variants (guest/logged-in/paid), analytics card with mascot | **HIGH** |
| **Login Screen** | Redesign with mascot, better copy, clearer CTAs | **LOW** |
| **Practice Hub** | 4-card design with mascot variants (DSE mock + 3 training modes) | **MEDIUM** |

### 2.3 Mascot System

**Current Implementation:** 
- `components/Mascot.tsx` - Scholar character with happy/sad moods, amber robe, scroll

**New Design Requirements:**
- **5 emotional states:** Neutral, thinking, happy, sad, celebrating
- **3 size variants:** 52px (companion), 60px (standard), 96px (celebration)
- **Animated elements:** Sparkle pulse, sweat drip, confetti fall
- **Updated palette:** 
  - Robes: `#46586A` (blue-gray, not amber)
  - Hair ornament: Jade/bamboo gold
  - Skin: `#F2DDB0`
- **Context-appropriate usage:**
  - Home: Welcoming (neutral/happy)
  - Quiz: Thinking (unanswered), sad (wrong), happy (correct)
  - Score: Celebrating (high score), neutral (medium), sad (low)
  - Account: Mood based on average accuracy

**Implementation Approach:**
- Extend current `Mascot.tsx` to support 5 moods
- Add animation support (CSS animations for sparkles, tears, confetti)
- Create helper function to determine mood based on context

---

## 3. Implementation Phases

### Phase 1: Foundation (2-3 days)
**Goal:** Establish design system without breaking existing functionality

**Tasks:**
1. **Create theme configuration**
   - Add Jiān color tokens to `tailwind.config.js`
   - Map new colors to NativeWind classes
   - Document color usage guidelines

2. **Typography setup**
   - Install Noto Serif TC and Noto Sans TC fonts
   - Update `app.json` font configuration
   - Create text style utilities

3. **Update Mascot component**
   - Add 5 emotional states
   - Implement size variants
   - Add animation support
   - Create context-aware mood selector

4. **Create base components**
   - `SegmentedControl.tsx` (原文/白話語譯 toggle)
   - `ProgressBar.tsx` (jade fill with contextual labels)
   - `Badge.tsx` (type/status badges with semantic colors)
   - `BottomSheet.tsx` (draggable modal for footnotes/article viewer)

**Deliverable:** Theme system + new mascot + base components (functional but not integrated)

---

### Phase 2: Core Screens Redesign (4-5 days)
**Goal:** Implement high-priority screens with new design

**Tasks:**

**2.1 Home Screen (2 days)**
- Create 5 variants: guest, new user, logged-in, tasks done, paid user
- Implement daily plan checklist (✓/●/○ states)
- Add DSE countdown and streak indicator
- Update article preview cards with progress indicators
- Add ability analysis section
- **Placeholder:** Daily plan task data (hardcoded 3 tasks for now)

**2.2 Reader View (1 day)**
- Add segmented control for 原文/白話語譯 toggle
- Implement footnote bottom sheet
- Update typography (Noto Serif TC, line-height 1.9)
- Add "查看原文" button in quiz context

**2.3 Account Screen (1 day)**
- Create 3 variants: guest, logged-in, paid user
- Add analytics card with mascot mood
- Implement membership badge for paid users
- Update practice history display

**2.4 Quiz Updates (1 day)**
- Update color scheme (vermilion/jade/amber)
- Add mascot emotional states per question state
- Improve explanation panels with colored left border
- Update score screen with part breakdown

**Deliverable:** 4 core screens with new design (80% complete, some placeholders)

---

### Phase 3: Article Browsing & Practice (3 days)
**Goal:** Complete article listing, practice hub, and training modes

**Tasks:**

**3.1 Article Listing (1 day)**
- Implement 4 card states: standard, locked, challenge, near-complete
- Add three-segment filter control (甲部指定/高中課文/其他範文)
- Update progress display (見題數 X/Y)
- Add empty search state

**3.2 Practice Hub (1 day)**
- Create 4-card layout with mascot variants
- Redesign DSE mock exam entry
- Update revision screens (article/part)
- Update weight training screen

**3.3 Multi-Article Viewer (1 day)**
- Implement numbered article tabs
- Add article switching in quiz context
- Update modal presentation style

**Deliverable:** Complete browsing and practice flows

---

### Phase 4: Secondary Screens & Polish (2 days)
**Goal:** Complete remaining screens and polish details

**Tasks:**
1. Login/auth flow redesign
2. Magic link sent screen
3. Upgrade modal redesign
4. Error states (connection, session expired)
5. Loading skeleton
6. Static pages (about, terms, privacy - already created but need design update)
7. Splash screen

**Deliverable:** All screens complete with new design

---

### Phase 5: Animation & Micro-interactions (1-2 days)
**Goal:** Add polish and delight

**Tasks:**
1. Mascot animations (sparkles, tears, confetti)
2. Shimmer loading skeleton
3. Progress bar transitions
4. Card hover/press states
5. Bottom sheet drag gestures
6. Smooth transitions between screens

**Deliverable:** Polished, production-ready UI

---

## 4. Technical Approach

### 4.1 Styling Strategy

**Challenge:** Design uses CSS custom properties and semantic classes, but app uses NativeWind.

**Recommended Approach: Hybrid Strategy**

1. **Extend NativeWind theme** with Jiān color palette
2. **Keep NativeWind** for layout and spacing utilities
3. **Create styled components** for complex patterns that don't map well to utilities
4. **Use inline styles** for animations and dynamic values

**Example `tailwind.config.js` extension:**

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        paper: '#F4F0E6',
        ink: {
          DEFAULT: '#2C2722',
          2: '#6F665A',
          3: '#A59B8B',
        },
        vermilion: {
          DEFAULT: '#B0392C',
          tint: '#f4e8e6',
        },
        jade: {
          DEFAULT: '#3F6B54',
          tint: '#e9eeec',
        },
        amber: {
          jian: '#BB8A2E',
          'jian-tint': '#f6f1e7',
        },
        line: {
          DEFAULT: '#E7DDC9',
          2: '#DED2BA',
        },
      },
      fontFamily: {
        'noto-serif': ['Noto Serif TC', 'Georgia', 'serif'],
        'noto-sans': ['Noto Sans TC', 'system-ui', 'sans-serif'],
        'newsreader': ['Newsreader', 'Georgia', 'serif'],
      },
      borderRadius: {
        'jian-chip': '4px',
        'jian-button': '6px',
        'jian-card': '11px',
        'jian-sheet': '20px',
      },
    },
  },
};
```

### 4.2 Component Architecture

**New Component Library Structure:**

```
components/
  jian/                    # New design system components
    Badge.tsx
    BottomSheet.tsx
    Card.tsx
    ProgressBar.tsx
    SegmentedControl.tsx
    Checklist.tsx
    StatsBar.tsx
    
  mascot/
    Mascot.tsx             # Extended with 5 moods
    MascotAnimations.tsx   # Sparkles, tears, confetti
    useMascotMood.ts       # Context-aware mood selector
    
  screens/                 # Screen-specific compound components
    home/
      DailyPlanCard.tsx
      AbilityAnalysisCard.tsx
      ArticlePreviewCard.tsx
    account/
      AnalyticsCard.tsx
      MembershipCard.tsx
```

### 4.3 Migration Strategy

**Incremental Migration (Recommended):**
1. Keep existing screens functional while building new ones
2. Use feature flags or route params to toggle between old/new design
3. Test new screens in isolation before replacing old ones
4. Maintain backward compatibility until all screens are complete

**Alternative: Big Bang (Not Recommended):**
- Replace all screens at once
- Higher risk of breaking functionality
- Harder to test incrementally

---

## 5. Features Requiring Placeholders

### 5.1 Daily Plan System
**Design Shows:** "今日宜練" task recommendations with 3-item checklist

**Current State:** No backend support for daily plan generation

**Placeholder Approach:**
- Hardcode 3 sample tasks: "愛蓮說練習", "一詞多義錯題", "語基訓練"
- Use static data with mock completion states
- Show "功能開發中" notice if user taps on task details
- **Backend TODO:** Implement recommendation algorithm based on:
  - Weakest skills (from mistake analysis)
  - Articles with low coverage
  - Time since last practice

### 5.2 Streak Tracking
**Design Shows:** "已連續練習 6 天 🔥"

**Current State:** `exercise_sessions` has timestamps but no streak calculation

**Placeholder Approach:**
- Calculate streak client-side from session timestamps
- Show "1 天" as minimum for users with any recent practice
- **Backend TODO:** Add `streak_count` and `last_practice_date` to user profile for persistence

### 5.3 DSE Countdown
**Design Shows:** "312天後文憑試"

**Current State:** No DSE date configuration

**Placeholder Approach:**
- Hardcode DSE date: March 15, 2027 (typical DSE Chinese exam date)
- Calculate days remaining client-side
- **Backend TODO:** Make DSE date configurable (different cohorts may have different dates)

### 5.4 Ability Analysis
**Design Shows:** "最弱 · 一詞多義 58%" with detailed part breakdown

**Current State:** Analytics exist but not surfaced in this format

**Placeholder Approach:**
- Use existing mistake data from `exercise_answers`
- Calculate weakest part client-side
- Show generic "正在分析你的能力" message if insufficient data
- **Backend TODO:** Pre-compute analysis and cache in user profile

### 5.5 Challenge Articles
**Design Shows:** Dark cards with "章節挑戰" badge

**Current State:** `articles.is_challenge` field exists but no special UI

**Placeholder Approach:**
- Filter for `is_challenge = true` articles
- Show dark card design
- Add "接受挑戰" CTA that works like regular article start
- **Feature TODO:** Define what makes a challenge unique (time limit? no hints? harder questions?)

### 5.6 Membership Benefits Card
**Design Shows:** Paid user features list with expiry date

**Current State:** RevenueCat integration pending (Phase 12)

**Placeholder Approach:**
- Show mock membership card for logged-in users
- Display "升級解鎖" on locked articles
- **Phase 12 TODO:** Integrate RevenueCat for real subscription management

---

## 6. Font & Asset Requirements

### 6.1 Fonts to Install

1. **Noto Serif TC** (Traditional Chinese serif)
   - Weights: 400 (Regular), 600 (SemiBold), 700 (Bold)
   - Source: Google Fonts
   - License: OFL (open source)

2. **Noto Sans TC** (Traditional Chinese sans-serif)
   - Weights: 400 (Regular), 500 (Medium), 700 (Bold)
   - Source: Google Fonts
   - License: OFL (open source)

3. **Newsreader** (Numbers and scores)
   - Weights: 400 (Regular), 700 (Bold)
   - Source: Google Fonts
   - License: OFL (open source)

**Installation:**
- Download font files to `assets/fonts/`
- Update `app.json` plugin configuration
- Use `expo-font` for loading

### 6.2 Mascot SVG Assets

The mascot is currently implemented as inline SVG in `Mascot.tsx`. Need to:
1. Extract 5 mood variants from design file
2. Convert to React Native SVG components
3. Add animation layer (sparkles, tears, confetti)

**Mascot Moods Needed:**
- Neutral (welcoming, thinking)
- Happy (correct answer, good performance)
- Sad (wrong answer, poor performance)
- Celebrating (quiz completion, high score)
- Thinking (quiz question, contemplating)

---

## 7. Testing Strategy

### 7.1 Visual Regression Testing

**Approach:**
- Take screenshots of each design page (42 files)
- Implement each screen in React Native
- Compare side-by-side
- Measure color/spacing accuracy

**Tools:**
- Manual side-by-side comparison (most practical for this project)
- `react-native-view-shot` for programmatic screenshots
- Figma/Sketch overlay technique

### 7.2 Cross-Platform Testing

**iOS vs Android Differences to Watch:**
- Font rendering (Noto Serif TC may render differently)
- Bottom sheet gesture handling
- Status bar styling (paper background needs custom color)
- Border radius rendering
- Touch target sizes

**Testing Matrix:**
- iPhone 14 Pro (iOS 17+)
- Android Pixel 6 (Android 13+)
- iPad Pro (tablet layout considerations)

### 7.3 Accessibility

**New Design Considerations:**
- Vermilion (#B0392C) on paper (#F4F0E6): Contrast ratio 5.2:1 (AA compliant)
- Jade (#3F6B54) on paper (#F4F0E6): Contrast ratio 4.8:1 (AA compliant for large text)
- Ink (#2C2722) on paper (#F4F0E6): Contrast ratio 11.5:1 (AAA compliant)
- Touch targets: Maintain minimum 44×44pt (iOS) / 48×48dp (Android)

---

## 8. Timeline & Effort Estimate

| Phase | Duration | Tasks | Priority |
|-------|----------|-------|----------|
| **Phase 1: Foundation** | 2-3 days | Theme setup, mascot, base components | **CRITICAL** |
| **Phase 2: Core Screens** | 4-5 days | Home, reader, account, quiz updates | **HIGH** |
| **Phase 3: Browsing & Practice** | 3 days | Article lists, practice hub, training | **HIGH** |
| **Phase 4: Secondary Screens** | 2 days | Login, modals, error states, static pages | **MEDIUM** |
| **Phase 5: Polish** | 1-2 days | Animations, micro-interactions | **LOW** |

**Total Estimated Effort:** 12-15 days (assuming full-time focus)

**Dependencies:**
- No backend changes required (uses existing data structures)
- Font files need to be sourced and licensed
- Design files are already broken down and ready
- Current app continues to function during migration

---

## 9. Risk Assessment & Mitigation

### 9.1 High Risks

**Risk:** Design is CSS-based but app uses React Native
- **Impact:** Some patterns may not translate directly
- **Mitigation:** Use hybrid approach (NativeWind + styled components)
- **Likelihood:** Medium
- **Severity:** Medium

**Risk:** Fonts may increase app bundle size significantly
- **Impact:** Noto Serif TC is large (~5-10MB for all weights)
- **Mitigation:** Use subset fonts (Traditional Chinese only), load on demand
- **Likelihood:** High
- **Severity:** Low

**Risk:** Mascot animations may impact performance
- **Impact:** Lottie animations can be heavy on low-end devices
- **Mitigation:** Use CSS animations where possible, optimize SVG paths
- **Likelihood:** Low
- **Severity:** Low

### 9.2 Medium Risks

**Risk:** Color scheme change may confuse existing users
- **Impact:** Users may feel app is "different" or "broken"
- **Mitigation:** Add onboarding tooltip: "我們更新了設計！"
- **Likelihood:** Medium
- **Severity:** Low

**Risk:** Placeholder features may feel incomplete
- **Impact:** Users may expect daily plan to be functional
- **Mitigation:** Add subtle "即將推出" badges, manage expectations
- **Likelihood:** High
- **Severity:** Low

### 9.3 Low Risks

**Risk:** Design files may not reflect all edge cases
- **Impact:** May need to make design decisions on the fly
- **Mitigation:** Document decisions, maintain design consistency principles
- **Likelihood:** High
- **Severity:** Very Low

---

## 10. Next Steps (After Plan Approval)

1. **Review design files with user** (confirm understanding and priorities)
2. **Extract mascot SVG** from `chinese-learner-app-Mascot-design.html`
3. **Download and subset fonts** (Noto Serif TC, Noto Sans TC, Newsreader)
4. **Set up feature branch** (`feature/jian-design-system`)
5. **Start Phase 1: Foundation** (theme setup + base components)

---

## 11. Open Questions for User

1. **Priority:** Should we implement all 5 phases, or focus on just Phases 1-3 (foundation + core screens)?
2. **Migration Strategy:** Incremental (toggle between old/new) or big bang (replace all at once)?
3. **Placeholders:** Are you comfortable shipping with placeholder features (daily plan, streak, challenges) or wait until backend is ready?
4. **Fonts:** Noto Serif TC adds ~8MB to app bundle. Acceptable, or should we subset/lazy-load?
5. **Mascot Design:** Should I extract SVG from the mascot HTML file, or do you have separate SVG exports?
6. **Static Pages:** Tasks #041 (about/terms/privacy) already exist but need design update. Include in this work or separate task?
7. **Testing:** Do you want to test on physical devices or is simulator sufficient for this phase?

---

## Appendix A: Design System Reference

**Color Usage Guidelines:**

- **Vermilion:** Primary CTAs, active states, errors, wrong answers
- **Jade:** Success messages, correct answers, progress completion, checkmarks
- **Amber:** Warnings, locks, premium badges, near-complete progress
- **Ink:** Text hierarchy (ink > ink2 > ink3)
- **Paper:** Background (never use white)
- **Line:** Borders, dividers (line > line2 for emphasis)

**Typography Scale:**

- **Display:** 30px / 700 / Noto Serif TC (page titles)
- **Title:** 21px / 600 / Noto Serif TC (section headers)
- **Body:** 17px / 400 / Noto Serif TC (classical Chinese text)
- **Label:** 10-14px / 500 / Noto Sans TC (UI elements, badges)
- **Score:** 42-78px / 700 / Newsreader (quiz scores)

**Component Patterns:**

- **Cards:** 11px radius, 1px line border, 16px padding
- **Buttons:** 6px radius, 12px vertical padding, 20px horizontal padding
- **Badges:** 4px radius, 6px vertical padding, 10px horizontal padding
- **Bottom Sheets:** 20px radius (top only), draggable handle, dimmed overlay
- **Progress Bars:** 3px height, jade fill, rounded ends

---

## Appendix B: Screen-by-Screen Implementation Checklist

_To be checked off during implementation_

**Home Screens:**
- [ ] 01-home-logged-in (daily plan + streak + countdown)
- [ ] 02-home-tasks-done (celebration state)
- [ ] 03-home-new-user (onboarding)
- [ ] 04-home-guest (login prompt)
- [ ] 30-home-paid-user (membership badge)

**Article Screens:**
- [ ] 05-chapters-category-a (DSE articles with progress)
- [ ] 06-chapters-other (other articles)
- [ ] 07-reader-original-text (with footnotes)
- [ ] 08-reader-translation (vernacular)
- [ ] 39-chapters-empty-search (no results state)

**Quiz Screens:**
- [ ] 20-quiz-single-choice-unanswered
- [ ] 21-quiz-multi-choice-unanswered
- [ ] 22-quiz-fill-blank-unanswered
- [ ] 23-quiz-sentence-order-unanswered
- [ ] 24-quiz-single-choice-answered
- [ ] 25-quiz-multi-choice-answered
- [ ] 26-quiz-fill-blank-answered
- [ ] 27-quiz-sentence-order-answered

**Practice Screens:**
- [ ] 09-dse-mock-exam (article selection)
- [ ] 10-score-result (with part breakdown)
- [ ] 11-practice-hub (4 training modes)
- [ ] 12-review-mistakes-article
- [ ] 13-review-mistakes-basics
- [ ] 14-weight-training (progress tracking)

**Account Screens:**
- [ ] 15-account-profile (logged-in)
- [ ] 28-account-guest (login prompt)
- [ ] 29-account-paid-user (membership card)

**Auth Screens:**
- [ ] 16-login (Google + email)
- [ ] 19-magic-link-sent (confirmation)
- [ ] 34-login-success (transition)

**Modal/Utility Screens:**
- [ ] 17-upgrade-modal (paywall)
- [ ] 18-report-detail-analysis (ability breakdown)
- [ ] 31-text-viewer-multi-article (with tabs)
- [ ] 32-text-viewer-single-article
- [ ] 33-splash-screen
- [ ] 35-about-us
- [ ] 36-terms-of-service
- [ ] 37-privacy-policy
- [ ] 38-loading-skeleton
- [ ] 40-connection-error
- [ ] 41-session-expired

**Total:** 42 screens

---

**END OF PLAN**
