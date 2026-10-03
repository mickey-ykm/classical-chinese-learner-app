# UI Redesign Implementation Plan (APPROVED)
## Jiān (簡) Design System Integration

**Status:** Approved for Implementation  
**Created:** 2026-07-02  
**Scope:** Phases 1-3 (Foundation + Core Screens)  
**Strategy:** Big Bang (Replace all at once)  
**Design Files:** `/docs/design/pages/` (42 screens) + `/docs/design/mascot-svgs/` (5 characters × 5 states)

---

## Implementation Decisions (Approved)

✅ **Scope:** Phases 1-3 only (Foundation + Core Screens)  
✅ **Migration:** Big Bang - Replace all screens at once  
✅ **Placeholders:** Ship with placeholder features + "即將推出" popup for unready features  
✅ **Fonts:** Noto Serif TC (~8MB) - Acceptable  
✅ **Mascots:** Use provided SVGs from `/docs/design/mascot-svgs/`  
✅ **Static Pages:** Include about/terms/privacy redesign in this work  
✅ **Primary Mascot:** 小文 (Xiaowen) as main, others as companions (incremental)

---

## User Personas & Funnel Mapping

### Persona Definitions

**1. Guest User (Anonymous) 👤**
- **Status:** No account, no login
- **Data Access:** Full article reading + quiz attempts (no history saved)
- **Limitations:** No progress tracking, no analytics, no mistake review
- **Goal:** Try the app before committing to sign up

**2. New User (Just Logged In) 🌱**
- **Status:** Logged in, 0-2 quiz attempts
- **Data Access:** Basic analytics (insufficient data)
- **Limitations:** No streak, minimal history, no identified weaknesses
- **Goal:** Understand the app, complete first few quizzes

**3. Active Free User (Regular) 📚**
- **Status:** Logged in, 3+ quiz attempts, has analytics data
- **Data Access:** Full analytics, mistake review, progress tracking
- **Limitations:** Locked premium articles, no advanced features
- **Goal:** Consistent practice, improve weak areas, consider upgrade

**4. Active Free User (Tasks Complete) ✅**
- **Status:** Same as Active Free, but completed daily plan for today
- **Data Access:** Same as Active Free
- **Special State:** Celebration mode, encourage continued practice
- **Goal:** Feel accomplished, motivated to maintain streak

**5. Paid User (Premium Member) 👑**
- **Status:** Active subscription via RevenueCat
- **Data Access:** All articles unlocked, all features enabled
- **Benefits:** No paywalls, priority features (future)
- **Goal:** Maximize learning, prepare for DSE efficiently

### User Journey Funnel

```
ACQUISITION
    ↓
Guest User → Browse articles → Try quiz → See value
    ↓
ACTIVATION
    ↓
Login Prompt → Google/Email auth → New User onboarding
    ↓
ENGAGEMENT
    ↓
New User → Complete 3+ quizzes → Active Free User
    ↓
    ├─→ Daily practice → Tasks Complete state → Maintain streak
    │
    └─→ See locked content → Upgrade prompt → Paid User
         ↓
MONETIZATION
    ↓
Paid User → Full access → Advanced features (future)
```

---

## Screen-by-Screen Component Mapping

### Home Screen (`app/(tabs)/index.tsx`)

| Component | Guest | New User | Active Free | Tasks Complete | Paid User |
|-----------|-------|----------|-------------|----------------|-----------|
| **Header** |
| Logo | ✓ | ✓ | ✓ | ✓ | ✓ |
| Account/Login button | "登入" | "帳戶" | "帳戶" | "帳戶" | "帳戶" |
| Profile avatar | ✗ | ✓ (red border) | ✓ (red border) | ✓ (red border) | ✓ (amber border) |
| **Greeting** |
| 小文 mascot | ✓ (greeting) | ✓ (greeting) | ✓ (greeting) | ✓ (celebrating) | ✓ (greeting) |
| Greeting text | "你好。" | "歡迎來到文言教室。" | "你好！" | "今天辛苦了。" | "你好！" |
| Subtext | "歡迎回到文言文練習平台" | Onboarding explanation | "歡迎回到文言文練習平台" | "今日課業 · 3/3 已完成" | "歡迎回到文言文練習平台" |
| **DSE Section** |
| DSE countdown | ✗ | ✗ | ✓ "312天後文憑試" | ✓ | ✓ |
| Streak indicator | ✗ | ✗ | ✓ "已連續練習 6 天 🔥" | ✓ | ✓ |
| **Daily Plan** |
| Daily plan card | ✗ | ✗ | ✓ "接下來 · 今日第 2/3 項" | ✓ "今日課業 · 3/3 已完成" (jade) | ✓ |
| Task checklist | ✗ | ✗ | ✓ (✓/●/○ states) | ✓ (all ✓) | ✓ |
| "加練一篇" button | ✗ | ✗ | ✗ | ✓ (dark ink button) | ✗ |
| **Ability Analysis** |
| "最弱" card | ✗ | ✗ | ✓ (if ≥5 quizzes) | ✓ | ✓ |
| Part breakdown | ✗ | ✗ | ✓ (8 parts with %) | ✓ | ✓ |
| **Article Previews** |
| DSE 文章 section | ✓ (3 cards) | ✓ (3 cards) | ✓ (3 cards with progress) | ✓ | ✓ |
| Lock badges | ✓ (on premium) | ✓ (on premium) | ✓ (on premium) | ✓ (on premium) | ✗ (all unlocked) |
| Challenge cards | ✗ | ✗ | ✓ (dark ink style) | ✓ | ✓ |
| Progress indicators | ✗ | ✗ | ✓ "28/50 題" | ✓ | ✓ |
| 其他文章 section | ✓ (3 cards) | ✓ (3 cards) | ✓ (3 cards with progress) | ✓ | ✓ |
| **Recent Practice** |
| Section visible | ✗ | ✓ (if 0 attempts) | ✓ (if ≥1 attempt) | ✓ | ✓ |
| Login prompt | ✓ | ✗ | ✗ | ✗ | ✗ |
| Empty state | ✗ | ✓ "尚未有練習記錄" | ✗ | ✗ | ✗ |
| Attempt cards | ✗ | ✗ | ✓ (last 3) | ✓ (last 3) | ✓ (last 3) |
| **Promotional** |
| "免費註冊" card | ✓ (large card) | ✗ | ✗ | ✗ | ✗ |
| "免費試做" list | ✓ (sample articles) | ✗ | ✗ | ✗ | ✗ |

### Account Screen (`app/account.tsx`)

| Component | Guest | New User | Active Free | Paid User |
|-----------|-------|----------|-------------|-----------|
| **Profile Section** |
| Profile avatar | ✗ | ✓ (red border) | ✓ (red border) | ✓ (amber border) |
| Email display | ✗ | ✓ | ✓ | ✓ |
| Membership badge | ✗ | "免費版 · 以電郵登入" | "免費版" | "付費版 · 會員至 2027年6月" |
| Logout button | ✗ | ✓ | ✓ | ✓ |
| **Promotional/CTA** |
| Guest login prompt | ✓ (large amber card) | ✗ | ✗ | ✗ |
| Feature benefits list | ✓ (3 locked features) | ✗ | ✗ | ✗ |
| "免費註冊\|登入" button | ✓ | ✗ | ✗ | ✗ |
| "升級付費版" card | ✗ | ✗ | ✓ (black card) | ✗ |
| Membership benefits | ✗ | ✗ | ✗ | ✓ (with expiry) |
| "管理訂閱" link | ✗ | ✗ | ✗ | ✓ |
| **Analytics Card** |
| 小文 mascot | ✗ | ✓ (greeting) | ✓ (mood by accuracy) | ✓ (mood by accuracy) |
| Stats bar | ✗ | ✓ (minimal) | ✓ (full) | ✓ (full) |
| - 平均準確 | ✗ | "—" (insufficient) | "82%" | "82%" |
| - 累計練習 | ✗ | "1" | "19" | "19" |
| - 連續天數 | ✗ | "1" | "6" (jade) | "6" (jade) |
| Ability analysis | ✗ | ✗ | ✓ "最弱 · 一詞多義 58%" | ✓ |
| "詳細報告 →" | ✗ | ✗ | ✓ | ✓ |
| **Practice History** |
| Section visible | ✗ | ✓ (if 0 attempts) | ✓ | ✓ |
| Empty state | ✗ | ✓ | ✗ | ✗ |
| Recent attempts | ✗ | ✗ | ✓ (last 3-5) | ✓ (last 3-5) |
| "全部紀錄 →" link | ✗ | ✗ | ✓ | ✓ |
| **Settings** |
| 檢查更新 | ✗ | ✓ | ✓ | ✓ |
| 清除快取並重新同步 | ✗ | ✓ | ✓ | ✓ |
| 關於我們 | ✓ | ✓ | ✓ | ✓ |
| 服務條款 | ✓ | ✓ | ✓ | ✓ |
| 私隱政策 | ✓ | ✓ | ✓ | ✓ |

### Article Listing (`app/(tabs)/dse-learner.tsx`, `app/(tabs)/extra-articles.tsx`)

| Component | Guest | New User | Active Free | Paid User |
|-----------|-------|----------|-------------|-----------|
| **Filters** |
| Three-segment control | ✓ | ✓ | ✓ | ✓ |
| Article count header | ✓ "26 篇" | ✓ | ✓ "26 篇 · 題庫 1,200+ 題" | ✓ |
| **Article Cards** |
| Standard card | ✓ | ✓ | ✓ | ✓ |
| Progress indicator | ✗ | ✗ | ✓ "28/50" | ✓ |
| Practice count | ✗ | ✗ | ✓ "3 次練習" | ✓ |
| Progress bar | ✗ | ✗ | ✓ | ✓ |
| Contextual text | ✗ | ✗ | ✓ "約再 2 次覆蓋全部題庫" | ✓ |
| CTA button | "開始" | "開始" | "再練" | "再練" |
| **Locked Cards** |
| Lock badge | ✓ "⊘ 付費" | ✓ | ✓ | ✗ (none locked) |
| "升級解鎖" button | ✓ | ✓ | ✓ | ✗ |
| **Challenge Cards** |
| Dark ink style | ✗ | ✗ | ✓ | ✓ |
| "章節挑戰" badge | ✗ | ✗ | ✓ (red) | ✓ |
| "接受挑戰" button | ✗ | ✗ | ✓ | ✓ |
| **Near-Complete Cards** |
| Amber tint | ✗ | ✗ | ✓ (if 91%+) | ✓ |
| "衝刺" button | ✗ | ✗ | ✓ | ✓ |

### Quiz Screen (`components/quiz/QuizShell.tsx`)

| Component | All Users (identical experience) |
|-----------|----------------------------------|
| Exit button | ✓ "‹ 離開" |
| Article badge | ✓ (article type + title) |
| Timer | ✓ "⏱ 18:24" |
| Progress bar | ✓ (vermilion fill) |
| Progress counter | ✓ "15 / 22" |
| Section badge | ✓ "第 1 部分・字詞解釋" |
| "查看原文" button | ✓ (opens article modal) |
| Question stem | ✓ |
| 小文 mascot | ✓ (mood by question state) |
| Options/input | ✓ |
| Submit button | ✓ |
| Explanation panel | ✓ (after answer) |
| "下一題 ›" button | ✓ (after answer) |

**Note:** Quiz experience is identical for all user types. The only difference is:
- **Guest:** Progress not saved, no pool tracking
- **Logged-in:** Progress saved, pool tracking ("已見過 X/Y 題")

### Score Screen (inside `QuizShell.tsx`)

| Component | Guest | Logged-In Users |
|-----------|-------|-----------------|
| Session label | ✓ "第 X 次練習完成" | ✓ "愛蓮說 · 第 3 次練習完成" |
| Large score | ✓ "34 / 40" (Newsreader 78px) | ✓ |
| Encouragement | ✓ (by score tier) | ✓ |
| 小文 mascot | ✓ (finish-exercise mood) | ✓ |
| Stats row | ✓ "85% · 18:24" | ✓ |
| Part breakdown | ✓ (8 rows) | ✓ |
| Info card | ✓ "隨機抽題說明" | ✓ |
| "再次挑戰此篇章" | ✓ | ✓ |
| "查看答題記錄" | ✗ | ✓ (links to attempt detail) |
| "返回首頁" | ✓ | ✓ |

### Practice Hub (`app/(tabs)/dse-training.tsx`)

| Component | Guest | Logged-In Users |
|-----------|-------|-----------------|
| **Hero Card - DSE Mock** |
| Dark ink background | ✓ | ✓ |
| 小文 mascot | ✓ | ✓ |
| "隨機抽選 3 篇 · 22 題" | ✓ | ✓ |
| "開始模擬" button | ✓ | ✓ |
| **Training Mode Cards** |
| 文章錯題重溫 | ✗ (login prompt) | ✓ |
| 語基能力錯題重溫 | ✗ (login prompt) | ✓ |
| 針對性難題訓練 | ✗ (login prompt) | ✓ |

**Guest behavior:** Tapping mistake review/weight training shows login modal with explanation of why login is needed.

### Reader View (`app/read.tsx`)

| Component | All Users (identical) |
|-----------|----------------------|
| Back button | ✓ "‹ 返回" |
| Article header | ✓ (type badge + title + author) |
| 小文 mascot | ✓ (greeting, small) |
| Segmented control | ✓ "原文 / 白話語譯" |
| Article text | ✓ (Noto Serif TC, line-height 1.9) |
| Footnote markers | ✓ (red superscript) |
| Footnote bottom sheet | ✓ (on tap) |
| "開始練習 ›" button | ✓ |

### Login Flow (`app/login.tsx`)

| Component | All Screens |
|-----------|-------------|
| **Login Screen** |
| 小文 mascot | ✓ (greeting, large 96px) |
| "開始記錄你的文言文學習歷程" | ✓ |
| Google OAuth button | ✓ |
| "或" divider | ✓ |
| Email input | ✓ |
| "傳送登入連結" button | ✓ |
| Terms agreement text | ✓ |
| "以訪客身份繼續" link | ✓ |
| **Magic Link Sent** |
| 小文 with envelope | ✓ (custom pose) |
| "登入連結已寄出" | ✓ |
| User's email display | ✓ (amber highlight) |
| "連結 15 分鐘內有效" | ✓ |
| "開啟郵件 App" button | ✓ |
| "59 秒後可重新發送" | ✓ (countdown) |
| "使用其他電郵地址" link | ✓ |
| **Login Success** |
| 小文 celebrating | ✓ (finish-exercise mood) |
| "登入成功" | ✓ |
| "已同步你的學習進度與錯題紀錄" | ✓ |
| "進入主頁 →" button | ✓ |
| "3 秒後自動跳轉" | ✓ (timer) |

---

## Conditional Logic Reference

### Home Screen Display Logic

```typescript
// Pseudo-code for home screen component selection

function getHomeScreenVariant(user, sessions, taskStatus) {
  if (!user) return 'guest';
  if (sessions.length <= 2) return 'new-user';
  if (taskStatus.completed === taskStatus.total) return 'tasks-done';
  if (user.isPaidMember) return 'paid-user';
  return 'logged-in';
}

function shouldShowDSECountdown(user) {
  return user && user.sessions.length >= 3;
}

function shouldShowStreak(user) {
  return user && user.sessions.length >= 1;
}

function shouldShowDailyPlan(user) {
  return user && user.sessions.length >= 3;
}

function shouldShowAbilityAnalysis(user, sessions) {
  return user && sessions.length >= 5;
}
```

### Account Screen Display Logic

```typescript
function getAccountScreenVariant(user) {
  if (!user) return 'guest';
  if (user.isPaidMember) return 'paid-user';
  return 'logged-in';
}

function getAnalyticsCardVisibility(user) {
  return user !== null;
}

function getMascotMood(user, averageAccuracy) {
  if (!user) return 'greeting';
  if (averageAccuracy >= 80) return 'finish-exercise';
  if (averageAccuracy >= 60) return 'greeting';
  return 'wrong-answer';
}
```

### Article Card Display Logic

```typescript
function getArticleCardVariant(article, user, progress) {
  if (article.isFree === false && !user?.isPaidMember) {
    return 'locked';
  }
  if (article.isChallenge && user && progress?.seenCount >= 5) {
    return 'challenge';
  }
  if (progress?.percentage >= 91) {
    return 'near-complete';
  }
  return 'standard';
}
```

### Quiz Mascot Mood Logic

```typescript
function getQuizMascotMood(questionState, isCorrect) {
  if (questionState === 'unanswered') return 'thinking';
  if (questionState === 'answered' && isCorrect) return 'correct-answer';
  if (questionState === 'answered' && !isCorrect) return 'wrong-answer';
  if (questionState === 'completed') return 'finish-exercise';
  return 'greeting';
}
```

---

## Mascot Family System

### Characters & Assignments

**五寶 · Five Treasures Mascot Family:**

1. **小文 (Xiaowen)** - Scholar Boy 📚 **[PRIMARY - Phase 1]**
   - **Usage:** Main character, appears on most screens
   - **Contexts:**
     - Home screen (greeting, daily plan)
     - Account screen (analytics mood)
     - Quiz general context
     - Login/onboarding screens
     - Default fallback for all screens

2. **阿宣 (A-Xuan)** - Paper Scroll 📜 **[Phase 3]**
   - **Usage:** Article/reading related
   - **Contexts:**
     - Article listing screens
     - Reader view (footnote helper)
     - "文章錯題重溫" (Article mistakes review)
     - DSE mock exam article selection

3. **小毫 (Xiaohao)** - Writing Brush ✒️ **[Phase 3]**
   - **Usage:** Writing/practice related
   - **Contexts:**
     - Fill-blank questions
     - Sentence-order questions
     - Weight training mode
     - Practice hub

4. **阿墨 (A-Mo)** - Ink Stick 🖤 **[Phase 3]**
   - **Usage:** Knowledge/basics related
   - **Contexts:**
     - MC questions (Parts 1-6)
     - "語基能力錯題重溫" (Basics mistakes review)
     - Ability analysis screens

5. **老硯 (Lao-Yan)** - Ink Stone with Glasses 👓 **[Phase 3]**
   - **Usage:** Wisdom/analysis related
   - **Contexts:**
     - Score/results screens
     - Detailed analysis reports
     - Streak/achievement celebrations
     - Empty states and error guidance

### Emotional States (All Characters)

Each mascot has 5 SVG states:
- **greeting.svg** → Welcoming, neutral, home screen
- **thinking.svg** → Quiz unanswered, loading states
- **correct-answer.svg** → Correct answer celebration (sparkles)
- **wrong-answer.svg** → Wrong answer comfort (tear/sweat)
- **finish-exercise.svg** → Completion celebration (confetti)

### Component Architecture

```typescript
// components/mascot/MascotFamily.tsx
type MascotCharacter = 'xiaowen' | 'a-xuan' | 'xiaohao' | 'a-mo' | 'lao-yan';
type MascotMood = 'greeting' | 'thinking' | 'correct-answer' | 'wrong-answer' | 'finish-exercise';

interface MascotProps {
  character?: MascotCharacter; // defaults to 'xiaowen'
  mood: MascotMood;
  size?: number; // defaults to 60
}

// Auto-select character based on context
function useMascotContext(screen: string, context?: object): MascotCharacter {
  // Phase 1: Always return 'xiaowen'
  // Phase 3: Add smart selection logic
}
```

---

## Phase 1: Foundation (3 days) ✅ APPROVED

**Goal:** Establish design system + 小文 mascot without breaking existing functionality

### 1.1 Theme Configuration (Day 1 Morning)

**File:** `tailwind.config.js`

```javascript
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
          tint: '#F4E8E6',
          border: '#E7D2CF',
        },
        jade: {
          DEFAULT: '#3F6B54',
          tint: '#E9EEEC',
          border: '#D4DDD8',
        },
        amber: {
          jian: '#BB8A2E',
          'jian-tint': '#F6F1E7',
          'jian-border': '#EDE4D0',
        },
        line: {
          DEFAULT: '#E7DDC9',
          2: '#DED2BA',
        },
      },
      fontFamily: {
        'noto-serif': ['NotoSerifTC-Regular', 'NotoSerifTC-SemiBold', 'NotoSerifTC-Bold'],
        'noto-sans': ['NotoSansTC-Regular', 'NotoSansTC-Medium', 'NotoSansTC-Bold'],
        newsreader: ['Newsreader-Regular', 'Newsreader-Bold'],
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

**Tasks:**
- [ ] Update `tailwind.config.js` with Jiān color palette
- [ ] Test color rendering on iOS/Android
- [ ] Document color usage guidelines in `/docs/design/color-usage.md`

### 1.2 Typography Setup (Day 1 Afternoon)

**Tasks:**
- [ ] Download Noto Serif TC (weights: 400, 600, 700) from Google Fonts
- [ ] Download Noto Sans TC (weights: 400, 500, 700) from Google Fonts  
- [ ] Download Newsreader (weights: 400, 700) from Google Fonts
- [ ] Place font files in `assets/fonts/`
- [ ] Update `app.json` font configuration
- [ ] Create text style utilities in `components/jian/Text.tsx`

**Font Files Structure:**
```
assets/fonts/
  NotoSerifTC-Regular.otf
  NotoSerifTC-SemiBold.otf
  NotoSerifTC-Bold.otf
  NotoSansTC-Regular.otf
  NotoSansTC-Medium.otf
  NotoSansTC-Bold.otf
  Newsreader-Regular.ttf
  Newsreader-Bold.ttf
```

### 1.3 Mascot Implementation - 小文 Only (Day 2)

**Component Structure:**
```
components/mascot/
  Xiaowen.tsx              # 小文 with 5 moods
  MascotAnimations.tsx     # Sparkles, tears, confetti
  useMascotMood.ts         # Context-aware mood selector
  svgs/
    xiaowen-greeting.svg
    xiaowen-thinking.svg
    xiaowen-correct-answer.svg
    xiaowen-wrong-answer.svg
    xiaowen-finish-exercise.svg
```

**Tasks:**
- [ ] Convert 小文 SVGs to React Native SVG components
- [ ] Implement mood prop with 5 states
- [ ] Add size variants (52px, 60px, 96px)
- [ ] Implement animations:
  - Sparkle pulse (correct-answer, finish-exercise)
  - Tear drip (wrong-answer)
  - Confetti fall (finish-exercise)
- [ ] Create `useMascotMood` hook with smart defaults
- [ ] Test rendering on iOS/Android

**Example Usage:**
```tsx
import { Xiaowen } from '@/components/mascot/Xiaowen';

<Xiaowen mood="greeting" size={60} />
<Xiaowen mood="thinking" size={52} />
<Xiaowen mood="correct-answer" size={96} /> // with sparkles
```

### 1.4 Base Components (Day 3)

**Components to Create:**

**1. SegmentedControl** (`components/jian/SegmentedControl.tsx`)
- Two-segment toggle (原文 / 白話語譯)
- Vermilion active state
- Smooth transition animation

**2. ProgressBar** (`components/jian/ProgressBar.tsx`)
- Jade fill for progress
- Contextual labels ("約再 2 次覆蓋全部題庫")
- Fractional display (28/50)

**3. Badge** (`components/jian/Badge.tsx`)
- Type badges (DSE 甲部, 高中課文, etc.)
- Status badges (付費, 已解鎖, 章節挑戰)
- Color variants (vermilion, jade, amber)

**4. BottomSheet** (`components/jian/BottomSheet.tsx`)
- Draggable modal for footnotes/article viewer
- Dimmed overlay background
- 20px top radius
- Gesture handling

**5. Card** (`components/jian/Card.tsx`)
- Standard card (11px radius, 1px line border)
- 4 variants: standard, locked, challenge, near-complete
- Hover/press states

**6. Button** (`components/jian/Button.tsx`)
- Primary (vermilion), secondary (ink), bordered
- 6px radius, proper padding
- Active state opacity

**Tasks:**
- [ ] Implement 6 base components
- [ ] Create Storybook-style test screens for each
- [ ] Test touch targets (minimum 44×44pt)
- [ ] Document props and usage

---

## Phase 2: Core Screens Redesign (5 days) ✅ APPROVED

**Goal:** Implement high-priority screens with new design

### 2.1 Home Screen (2 days)

**Files to Modify:**
- `app/(tabs)/index.tsx`

**Features to Implement:**

**Day 1 - Layout & Structure:**
- [ ] Create 5 variant layouts (guest, new user, logged-in, tasks done, paid user)
- [ ] Add DSE countdown component
  - Hardcode DSE date: March 15, 2027
  - Calculate days remaining client-side
  - "312天後文憑試" display
- [ ] Add streak indicator
  - Calculate from `exercise_sessions` timestamps
  - "已連續練習 6 天 🔥" display
  - Client-side calculation

**Day 2 - Daily Plan & Content:**
- [ ] Implement daily plan checklist (placeholder)
  - Hardcode 3 tasks: "愛蓮說練習", "一詞多義錯題", "語基訓練"
  - Three states: ✓ done, ● current, ○ todo
  - Add "即將推出" popup when tapped
- [ ] Update article preview cards
  - New progress indicators (見題數 X/Y)
  - 4 card states (standard, locked, challenge, near-complete)
  - Amber "幾乎覆蓋全部" indicator for 91%+
- [ ] Add ability analysis section (placeholder)
  - Show "最弱 · 一詞多義 58%" from existing data
  - Calculate client-side from `exercise_answers`
  - Show "正在分析你的能力" if insufficient data
- [ ] Integrate 小文 mascot
  - Greeting mood on load
  - Mood based on overall performance in analytics section

**Placeholder Modal:**
```tsx
// components/jian/ComingSoonModal.tsx
// "即將推出" popup for unready features
<Modal>
  <Text>此功能即將推出</Text>
  <Text>敬請期待！</Text>
  <Button>確定</Button>
</Modal>
```

### 2.2 Reader View (1 day)

**Files to Modify:**
- `app/read.tsx`
- `components/reading/ArticleText.tsx`
- `components/reading/FootnotePanel.tsx`

**Tasks:**
- [ ] Add segmented control (原文 / 白話語譯)
- [ ] Implement footnote bottom sheet
  - Red superscript markers (⑴, ⑸)
  - Bottom sheet with explanation
  - Draggable gesture
- [ ] Update typography
  - Noto Serif TC for Chinese text
  - Line-height 1.9 (vs current 1.5)
  - Font size 18px for classical text
- [ ] Add "查看原文" button in quiz context
- [ ] Add 小文 mascot in header (greeting mood)

### 2.3 Account Screen (1 day)

**Files to Modify:**
- `app/account.tsx`

**Tasks:**
- [ ] Create 3 variants: guest, logged-in, paid user
- [ ] Add analytics card with 小文 mascot
  - Mascot mood based on average accuracy
  - Stats bar: "82% 平均準確", "19 累計練習", "6 連續天數"
  - "最弱 · 一詞多義 58%" display
  - "詳細報告 →" link
- [ ] Add membership badge for paid users
  - "付費版 · 會員至 2027年6月"
  - Amber border on avatar
- [ ] Update practice history display
  - Recent 3 attempts
  - Article title, date, score, progress bar
- [ ] Update static page links (about/terms/privacy)
  - Styled as subtle text links in ink3

**Guest Variant:**
- Large "記錄你的學習進度" promotion card
- Benefits list with lock icons
- "免費註冊 | 登入 →" CTA

**Logged-In Variant:**
- Analytics card with 小文
- "升級付費版" dark card (placeholder - RevenueCat pending)
- Practice history list

**Paid User Variant:**
- Same analytics card
- Membership row with "管理訂閱 →" (placeholder)
- No upgrade card

### 2.4 Quiz Updates (1 day)

**Files to Modify:**
- `components/quiz/QuizShell.tsx`
- `components/quiz/QuizQuestion.tsx`
- `components/quiz/MCQuestion.tsx`
- `components/quiz/FillBlankQuestion.tsx`
- `components/quiz/SentenceOrderQuestion.tsx`

**Tasks:**
- [ ] Update color scheme throughout
  - Correct: vermilion → jade
  - Wrong: keep vermilion
  - Active/selected: vermilion
- [ ] Integrate 小文 mascot with quiz states
  - Thinking mood: unanswered questions
  - Correct-answer mood: right answer (with sparkles)
  - Wrong-answer mood: wrong answer (with tear)
  - Finish-exercise mood: quiz completion
- [ ] Improve explanation panels
  - 2px colored left border (jade for correct, vermilion for wrong)
  - Better spacing and typography
- [ ] Update score screen
  - Large Newsreader font for scores (78px)
  - Part breakdown (8 rows with performance)
  - Encouragement messages based on score
  - 小文 finish-exercise mood (celebrating if 80%+)

---

## Phase 3: Article Browsing & Practice (3 days) ✅ APPROVED

**Goal:** Complete article listing, practice hub, and training modes

### 3.1 Article Listing (1 day)

**Files to Modify:**
- `app/(tabs)/dse-learner.tsx`
- `app/(tabs)/extra-articles.tsx`

**Tasks:**
- [ ] Implement 4 card states
  - **Standard:** White card with progress bar
  - **Locked:** Amber lock badge "⊘ 付費" + "升級解鎖" button
  - **Challenge:** Dark ink background + red "章節挑戰" badge + "接受挑戰" button
  - **Near-complete:** Amber tint + amber progress bar + "衝刺" button
- [ ] Add three-segment filter control
  - "甲部指定" / "高中課文" / "其他範文"
  - Vermilion active state
- [ ] Update progress display
  - "見題數 28/50" in jade (seen) + ink3 (total)
  - Contextual labels: "約再 2 次覆蓋全部題庫", "幾乎覆蓋全部"
- [ ] Add empty search state
  - 小文 with confused expression (thinking mood)
  - "沒有找到相關篇章"
  - "瀏覽全部篇章" CTA button

### 3.2 Practice Hub (1 day)

**Files to Modify:**
- `app/(tabs)/dse-training.tsx`
- `app/revision-article.tsx`
- `app/revision-part.tsx`
- `app/weight-training.tsx`

**Tasks:**
- [ ] Create 4-card practice hub layout
  - **DSE Mock Exam:** Hero card (dark ink background) with 小文
  - **文章錯題重溫:** White card (阿宣 placeholder for Phase 4)
  - **語基能力錯題重溫:** White card (阿墨 placeholder for Phase 4)
  - **針對性難題訓練:** White card (小毫 placeholder for Phase 4)
- [ ] Redesign DSE mock exam entry
  - Article selection interface
  - Expandable cards with seal badges (一, 二, 三)
  - "共 22 題・滿分 40 分" summary
  - "開始練習 →" button
- [ ] Update revision screens
  - Article-based: summary card + article list with part breakdown
  - Part-based: summary card + 8 part cards with badges (completed/weak/weakest)
- [ ] Update weight training screen
  - Progress tracking (45/120 題)
  - Part 7 and Part 8 progress bars
  - Training description (red tint box)
  - "開始訓練" button

**Note:** Use 小文 for all mascot appearances in Phase 3. Phase 4 will replace with specialized mascots (阿宣/阿墨/小毫/老硯).

### 3.3 Multi-Article Viewer (1 day)

**Files to Modify:**
- `components/quiz/QuizShell.tsx` (article popup)
- Create `components/jian/ArticleTabsModal.tsx`

**Tasks:**
- [ ] Implement numbered article tabs
  - Tab buttons: "① 愛蓮說", "② 陋室銘"
  - Active tab: vermilion background
  - Inactive tabs: gray background
- [ ] Add header with context
  - "原文檢視" title
  - Red subtitle: "本題涉及 2 篇文章，可切換查閱"
- [ ] Update modal presentation
  - Bottom-sheet from 118px from top
  - Draggable handle
  - Dimmed background
- [ ] Test article switching without closing modal

---

## Phase 4: Secondary Screens & Mascot Family (Future)

**Not in current scope - for future implementation**

### 4.1 Complete Mascot Family Integration
- [ ] Add 阿宣 (Paper Scroll) for article contexts
- [ ] Add 小毫 (Brush) for writing/practice contexts
- [ ] Add 阿墨 (Ink Stick) for MC/basics contexts
- [ ] Add 老硯 (Ink Stone) for analysis/wisdom contexts
- [ ] Update `useMascotContext` hook with smart selection logic

### 4.2 Secondary Screens
- [ ] Login/auth flow redesign
- [ ] Magic link sent screen
- [ ] Login success screen
- [ ] Upgrade modal redesign
- [ ] Detailed analysis report (18-report-detail-analysis.html)
- [ ] Error states (connection, session expired)
- [ ] Loading skeleton with shimmer
- [ ] Splash screen

### 4.3 Static Pages Redesign
- [ ] `app/about.tsx` - Update with Jiān design
- [ ] `app/terms.tsx` - Update with Jiān design
- [ ] `app/privacy.tsx` - Update with Jiān design

---

## Static Pages (Phase 3 - Included) 📋

### Task #041 - Update Existing Static Pages

**Files to Modify:**
- `app/about.tsx` (already created)
- `app/terms.tsx` (already created)
- `app/privacy.tsx` (already created)

**Design Reference:** 35-about-us.html, 36-terms-of-service.html, 37-privacy-policy.html

**Tasks:**
- [ ] Update layout to Jiān design system
  - Paper background (#F4F0E6)
  - Noto Serif TC for headings
  - Ink color hierarchy
  - 2px vermilion divider lines
- [ ] Add back button (‹ 返回)
- [ ] Update typography and spacing
  - Body text: 17px / line-height 1.9
  - Section headers: 21px / 600 weight
  - Proper 4px-grid spacing
- [ ] Add 小文 mascot (greeting mood, small size 52px) at bottom
- [ ] Test scrolling behavior

---

## Timeline & Milestones

| Phase | Duration | End Date | Key Deliverables |
|-------|----------|----------|------------------|
| **Phase 1: Foundation** | 3 days | Day 3 | Theme + fonts + 小文 mascot + base components |
| **Phase 2: Core Screens** | 5 days | Day 8 | Home, reader, account, quiz updated |
| **Phase 3: Browsing & Practice** | 3 days | Day 11 | Article lists, practice hub, static pages complete |

**Total:** 11 days

**Milestone Checkpoints:**
- **Day 3:** Demo new color system + 小文 mascot in isolation
- **Day 6:** Demo home screen with all variants + daily plan
- **Day 8:** Demo complete user flow: login → home → article → quiz → score
- **Day 11:** Final review of all Phase 1-3 screens

---

## Placeholder Features & "即將推出" Modal

### Features with Placeholders

1. **Daily Plan System** (home screen)
   - **Current:** Hardcoded 3 tasks
   - **Behavior:** Show "即將推出" modal on tap
   - **Future:** Implement recommendation algorithm

2. **Streak Tracking** (home screen)
   - **Current:** Calculate from session timestamps
   - **Behavior:** Works but may be inaccurate without backend
   - **Future:** Add server-side streak calculation

3. **DSE Countdown** (home screen)
   - **Current:** Hardcoded March 15, 2027
   - **Behavior:** Works as-is
   - **Future:** Make configurable per user cohort

4. **Ability Analysis** (home/account)
   - **Current:** Client-side calculation from existing data
   - **Behavior:** Works but slow for large datasets
   - **Future:** Pre-compute and cache server-side

5. **Challenge Articles** (article listing)
   - **Current:** Filter `is_challenge = true`, standard quiz behavior
   - **Behavior:** Show "即將推出" modal on tap
   - **Future:** Define challenge mechanics (time limit, no hints, etc.)

6. **Membership Management** (paid user account)
   - **Current:** "管理訂閱" shows "即將推出" modal
   - **Behavior:** No RevenueCat integration yet
   - **Future:** Phase 12 - RevenueCat integration

### ComingSoonModal Component

```tsx
// components/jian/ComingSoonModal.tsx
import { Modal, View, Text, Pressable } from 'react-native';
import { Xiaowen } from '@/components/mascot/Xiaowen';

interface ComingSoonModalProps {
  visible: boolean;
  onClose: () => void;
  feature?: string;
}

export function ComingSoonModal({ visible, onClose, feature }: ComingSoonModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/40 justify-center items-center px-6">
        <View className="bg-paper rounded-jian-sheet p-6 w-full max-w-sm">
          <View className="items-center mb-4">
            <Xiaowen mood="thinking" size={96} />
          </View>
          <Text className="text-ink text-center text-xl font-noto-serif font-semibold mb-2">
            {feature ? `${feature}\n` : ''}即將推出
          </Text>
          <Text className="text-ink2 text-center text-base mb-6" style={{ lineHeight: 1.9 }}>
            此功能正在開發中，敬請期待！
          </Text>
          <Pressable
            onPress={onClose}
            className="bg-vermilion rounded-jian-button py-3 active:opacity-80"
          >
            <Text className="text-white text-center font-noto-sans font-medium">
              知道了
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
```

---

## Risk Mitigation

### High Risks

**Risk:** Big bang migration breaks existing functionality  
**Mitigation:**
- Create feature branch `feature/jian-design-system`
- Test each phase thoroughly before merging
- Keep backup of current `main` branch
- Plan rollback strategy if critical issues found

**Risk:** Fonts increase bundle size significantly  
**Impact:** ~8MB additional (approved)  
**Mitigation:**
- Use font subsetting if needed
- Monitor app bundle size after each phase
- Test app launch time on low-end devices

**Risk:** SVG mascots impact performance  
**Mitigation:**
- Optimize SVG paths before conversion
- Use `react-native-svg` native rendering
- Test on physical devices (not just simulator)
- Lazy-load mascots if needed

### Medium Risks

**Risk:** Color scheme change confuses existing users  
**Mitigation:**
- Add one-time onboarding tooltip: "我們更新了設計！"
- Maintain consistent layout and navigation patterns
- Test with beta users before full rollout

**Risk:** Placeholder features feel incomplete  
**Mitigation:**
- Use consistent "即將推出" messaging
- Set clear expectations with users
- Prioritize backend implementation after UI complete

---

## Testing Checklist

### Visual Accuracy
- [ ] Side-by-side comparison with design files
- [ ] Color accuracy on iOS/Android
- [ ] Font rendering consistency
- [ ] Spacing and layout precision

### Functionality
- [ ] All existing features still work
- [ ] Navigation flows intact
- [ ] Quiz submission and scoring correct
- [ ] Account sync working
- [ ] Auth flows (Google + magic link)

### Performance
- [ ] App launch time < 3 seconds
- [ ] Smooth scrolling (60fps)
- [ ] Mascot animations performant
- [ ] No memory leaks from SVGs

### Cross-Platform
- [ ] iOS simulator (iPhone 14 Pro)
- [ ] Android emulator (Pixel 6)
- [ ] Physical devices (both platforms)
- [ ] Different screen sizes

### Accessibility
- [ ] Touch targets ≥ 44×44pt
- [ ] Color contrast ratios (WCAG AA)
- [ ] Text scaling support
- [ ] Screen reader compatibility

---

## Implementation Order (Detailed)

### Week 1: Foundation + Core Start

**Day 1: Theme & Fonts**
- Morning: Tailwind config + color system
- Afternoon: Font setup + typography utilities

**Day 2: Mascot**
- Full day: 小文 implementation (5 moods + animations)

**Day 3: Base Components**
- Morning: SegmentedControl, ProgressBar, Badge
- Afternoon: BottomSheet, Card, Button

**Day 4-5: Home Screen**
- Day 4: Layout variants + DSE countdown + streak
- Day 5: Daily plan + article cards + ability analysis

**Day 6: Reader View**
- Full day: Segmented control + footnotes + typography

**Day 7: Account Screen**
- Full day: 3 variants + analytics card + history

**Day 8: Quiz Updates**
- Full day: Color updates + mascot integration + score screen

### Week 2: Practice & Polish

**Day 9: Article Listing**
- Full day: 4 card states + filters + empty state

**Day 10: Practice Hub**
- Full day: 4-card layout + DSE mock + revision screens + weight training

**Day 11: Final Polish**
- Morning: Multi-article viewer + static pages
- Afternoon: Testing, bug fixes, final review

---

## Success Criteria

**Phase 1 Complete:**
✅ Theme system working across all screens  
✅ All 3 fonts rendering correctly  
✅ 小文 mascot with 5 moods functional  
✅ 6 base components documented and tested

**Phase 2 Complete:**
✅ Home screen with all 5 variants  
✅ Reader view with footnotes working  
✅ Account screen with analytics  
✅ Quiz flow updated with new colors + mascot

**Phase 3 Complete:**
✅ Article listing with all 4 card states  
✅ Practice hub with 4 modes  
✅ Multi-article viewer functional  
✅ Static pages redesigned

**Overall Success:**
✅ All existing features still work  
✅ Visual design matches provided files (95%+ accuracy)  
✅ No performance regressions  
✅ Passes QA on iOS + Android  
✅ Ready for production deployment

---

## Next Steps (After Plan Approval)

1. **Create feature branch:** `git checkout -b feature/jian-design-system`
2. **Download fonts:** Noto Serif TC, Noto Sans TC, Newsreader from Google Fonts
3. **Set up font files** in `assets/fonts/`
4. **Start Phase 1, Day 1:** Update `tailwind.config.js`

---

**END OF IMPLEMENTATION PLAN**
