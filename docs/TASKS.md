# Task & Issue Tracker

_Active task list for day-to-day development work. Add new tasks to **Open**, move to **In Progress** when starting, and complete with summary in **Done** section._

---

## Open

_Add new tasks here. Format: `- [ ] #N — Type: Brief description`_
- [ ] **#030 — FEATURE: First-time user onboarding (hybrid approach)**
  - **Summary:** Implement hybrid onboarding system combining welcome carousel (3 screens, one-time) + contextual feature discovery tooltips (appear on first use of each feature).
  - **Approach:** Welcome carousel establishes purpose and value proposition; tooltips teach specific features just-in-time when user encounters them. Both components are skippable and use AsyncStorage flags to track completion.
  
  - **Part 1: Welcome Carousel (3 screens)**
    - **Screen 1 — Welcome + Purpose**
      - App name + demon mascot illustration
      - Heading: "DSE 文言文備試，智能操練"
      - Subtext: "範文閱讀 · 智能出題 · 針對弱項"
      - "下一步" button
    - **Screen 2 — Key Features**
      - Visual mockup showing app interface (article with footnotes, quiz, score)
      - Feature highlights: "原文註解 · 白話翻譯 · 重複避免 · 錯題重溫"
      - "下一步" button
    - **Screen 3 — Get Started**
      - "登入後記錄進度，智能避開已做題目"
      - Three CTAs: "Google 登入" / "電郵登入" / "以訪客身份試用"
    - **Implementation:**
      - [ ] Create `app/onboarding.tsx` with swipeable carousel (react-native ViewPager or FlatList horizontal)
      - [ ] Add demon mascot SVG illustration for screen 1
      - [ ] Create feature mockup screenshot/illustration for screen 2
      - [ ] Store `hasSeenOnboarding` flag in AsyncStorage
      - [ ] Redirect to onboarding from `app/index.tsx` if flag is false
      - [ ] "以訪客身份試用" button sets flag and navigates to home
  
  - **Part 2: Feature Discovery Tooltips**
    - **Tooltip locations and content:**
      - First article open → near footnote number: "💡 點擊數字可查看註解"
      - First article open → near translation tab: "💡 可切換白話文語譯"
      - First quiz start → above question: "💡 題目會智能避開已做過的"
      - First wrong answer → in feedback: "💡 做錯的題目會自動加入「溫故知新」"
      - First quiz complete (anonymous) → in score screen: "💡 登入後記錄進度和正確率"
      - First DSE training visit → in lobby: "💡 模擬試場環境，44-66 題跨文章測試"
    - **Implementation:**
      - [ ] Create `components/onboarding/Tooltip.tsx` (reusable tooltip component)
      - [ ] Design tooltip UI: amber background, arrow pointer, dismiss "X" button
      - [ ] Create `lib/onboardingFlags.ts` helper (read/write AsyncStorage flags)
      - [ ] Add tooltip to `app/read.tsx` for footnote hint (flag: `hasSeenFootnoteHint`)
      - [ ] Add tooltip to `app/read.tsx` for translation tab hint (flag: `hasSeenTranslationHint`)
      - [ ] Add tooltip to `components/quiz/QuizShell.tsx` for smart sampling hint (flag: `hasSeenSamplingHint`)
      - [ ] Add tooltip to `components/quiz/QuizShell.tsx` for revision hint (flag: `hasSeenRevisionHint`)
      - [ ] Add tooltip to `components/quiz/ScoreScreen.tsx` for login prompt (flag: `hasSeenLoginPrompt`, only show for anonymous)
      - [ ] Add tooltip to `app/(tabs)/dse-training.tsx` for mock exam hint (flag: `hasSeenMockExamHint`)
  
  - **Technical details:**
    - AsyncStorage keys: `@onboarding:hasSeenWelcome`, `@onboarding:hasSeenFootnoteHint`, etc.
    - Tooltip component props: `content: string`, `visible: boolean`, `onDismiss: () => void`, `anchor: "top" | "bottom" | "left" | "right"`
    - Tooltips auto-dismiss after 5 seconds or on user tap
    - All flags independent (dismissing one doesn't affect others)
  
  - **Why hybrid approach:**
    - Carousel gives immediate context (app purpose, target audience)
    - Tooltips teach complex features without upfront time burden
    - Anonymous users can skip welcome and still learn via tooltips
    - Lower cognitive load (just-in-time learning vs upfront overload)
  
  - **Estimated effort:** 4-6 hours (2-3 hours for carousel, 2-3 hours for tooltip system + integration)

- [ ] **#031 — FEATURE: Mistake Pattern Analysis Dashboard**
  - **Summary:** Show users their weak areas by analyzing performance across question types and parts. Help students identify where to focus study time by highlighting below-average performance areas with actionable recommendations.
  - **Value proposition:**
    - DSE students are time-poor and need to know *what* to practice, not just *how much*
    - "你在「修辭手法」題型的正確率只有 45%（全站平均 68%）" → immediate insight
    - Personalized recommendations: "建議加強練習第 7 部分（一詞多義）"
    - Differentiator: most learning apps show totals, not diagnostic breakdowns
  - **Data to display:**
    - **By question type** (字詞解釋, 語句背誦, 語句翻譯, 修辭手法, 內容重點):
      - User correct rate vs. platform average
      - Total attempted for each type
      - Trend (improving/declining over last 10 attempts)
    - **By part** (Parts 1-8):
      - User correct rate vs. platform average per part
      - Weakest part highlighted with "建議加強" badge
    - **Overall insights:**
      - Most common mistake type
      - Best performing area (positive reinforcement)
      - Recommended next practice (article/exercise targeting weak area)
  - **Implementation approach:**
    - **Backend API** (`admin/routes/analytics.js`):
      - [ ] `GET /api/analytics/mistakes?userId=<uuid>` — aggregate quiz_answers by question_types and part
      - [ ] Join with questions table to get question_types array
      - [ ] Calculate user correct rate per type/part
      - [ ] Calculate platform averages (cache daily, not per-request)
      - [ ] Return: `{ byType: [{type, userRate, avgRate, attempted, trend}], byPart: [{part, userRate, avgRate}], insights: {...} }`
    - **Mobile UI** (`app/analysis.tsx` or in `app/account.tsx`):
      - [ ] Add "弱項分析" card/tab in account screen
      - [ ] Display question type breakdown (horizontal bar chart showing user vs avg)
      - [ ] Display part breakdown (radar chart or list with progress bars)
      - [ ] Highlight weakest areas in amber/red
      - [ ] Show "建議練習" with link to relevant article or weight training
      - [ ] Require minimum data threshold (e.g., 20+ questions answered) before showing analysis
    - **Database queries:**
      - [ ] User stats: `SELECT question_types, part, is_correct FROM quiz_answers JOIN questions WHERE user_id = X`
      - [ ] Platform averages: `SELECT question_types, part, AVG(is_correct) FROM quiz_answers JOIN questions GROUP BY ...`
      - [ ] Consider adding question_types index on questions table for performance
    - **Caching strategy:**
      - [ ] Cache platform averages in Redis or in-memory (refresh daily)
      - [ ] User stats can be computed on-demand (relatively small dataset per user)
  - **UI/UX considerations:**
    - Show "需要更多數據" placeholder if user has < 20 answers
    - Use visual hierarchy: weakest area most prominent, strongest area subtle positive reinforcement
    - Avoid overwhelming with too many metrics — focus on top 2-3 actionable insights
    - Link insights to action: "加強練習" button goes directly to relevant content
  - **Success metrics:**
    - Users viewing analysis engage with recommended practice 40%+ of the time
    - Users who view analysis weekly show 15%+ improvement in weak areas over 1 month
  - **Estimated effort:** 2-3 days (backend aggregation + API, mobile UI + charts, testing)

- [ ] **#032 — FEATURE: Spaced Repetition Vocabulary System**
  - **Summary:** Extract key classical Chinese terms (字詞, 典故, 句式) from articles into flashcard deck with SRS (Spaced Repetition System) algorithm. Provides systematic daily vocabulary review drills to build long-term retention.
  - **Value proposition:**
    - Classical Chinese vocab is a major DSE bottleneck — students forget terms between study sessions
    - SRS proven effective for language learning (Anki, Duolingo model)
    - 5-minute daily drill = low friction, high retention
    - Complements article reading (reinforces terms encountered in context)
  - **System components:**
    - **Vocabulary database** (`vocabulary` table):
      - `id`, `term` (字詞), `definition` (解釋), `example_sentence` (例句), `source_article_id`
      - `difficulty` (beginner/intermediate/advanced), `frequency` (common/rare)
      - Initial seed: manually curate 200-300 high-frequency DSE terms
    - **User progress tracking** (`user_vocabulary` table):
      - `user_id`, `vocabulary_id`, `interval_days` (1 → 3 → 7 → 14 → 30), `next_review_date`, `ease_factor`, `times_reviewed`
      - SRS algorithm: SM-2 or simplified Leitner system
      - Response quality: "忘記了" (Again) / "勉強記得" (Hard) / "記得" (Good) / "非常熟悉" (Easy)
    - **Daily drill interface** (`app/vocabulary.tsx`):
      - Shows term → user tries to recall → reveals definition + example
      - 4-button response (Again/Hard/Good/Easy) updates SRS schedule
      - Session size: 10-15 cards (5 new + 10 review)
      - Progress bar showing daily goal completion
  - **Implementation approach:**
    - **Phase 1: Vocabulary curation (manual)**
      - [ ] Extract 200-300 key terms from existing 18 seed articles
      - [ ] Format: CSV with columns (term, definition, example, article_id, difficulty)
      - [ ] Create `vocabulary` table in Supabase
      - [ ] Seed script to import CSV → `admin/seed-vocabulary.js`
    - **Phase 2: SRS backend** (`admin/routes/vocabulary.js`)
      - [ ] `GET /api/vocabulary/due?userId=<uuid>` — returns cards due for review today
      - [ ] `POST /api/vocabulary/review` — accepts card_id + response (again/hard/good/easy), updates next_review_date
      - [ ] Implement SM-2 algorithm in `admin/lib/srs.js` (or use existing library like `sm2` npm package)
      - [ ] Create `user_vocabulary` table with RLS policies
    - **Phase 3: Mobile UI**
      - [ ] Create `app/vocabulary.tsx` flashcard screen
      - [ ] Swipeable card component (react-native-deck-swiper or custom)
      - [ ] Show term on front, flip to reveal definition + example on back
      - [ ] 4-button response interface at bottom
      - [ ] Daily progress indicator: "今日已完成 8 / 15 張"
      - [ ] Empty state: "今日無需複習 ✓" when queue is empty
    - **Phase 4: Integration**
      - [ ] Add "每日字詞複習" card to homepage (shows # of cards due)
      - [ ] Badge notification if cards overdue (gentle nudge, not pushy)
      - [ ] Link terms in article footnotes to vocabulary entries (future enhancement)
  - **SRS algorithm (simplified SM-2):**
    - New card: interval = 1 day
    - Response "Again": reset interval to 1 day
    - Response "Hard": interval × 1.2
    - Response "Good": interval × 2.5 (standard progression: 1→3→7→18→45 days)
    - Response "Easy": interval × 3, increase ease factor
    - Cap max interval at 180 days
  - **Content strategy:**
    - Start with 200-300 curated terms (proven DSE-relevant)
    - Expand to 500-1000 terms over time (community contribution or LLM extraction)
    - Tag terms by article/topic for filtered practice
  - **Success metrics:**
    - Daily active vocabulary users (% of logged-in users)
    - Retention rate of terms reviewed (post-quiz performance on related questions)
    - Average streak length for vocabulary practice
  - **Estimated effort:** 1-2 weeks
    - Curation: 1-2 days (200-300 terms)
    - Backend: 2-3 days (tables, API, SRS logic)
    - Mobile UI: 3-4 days (flashcard component, swipe gestures, integration)
    - Testing: 1-2 days (SRS algorithm validation, edge cases)

- [ ] **#033 — FEATURE: Study Streaks + Daily Goals**
  - **Summary:** Implement study streak tracking and daily goal system to drive habit formation and daily engagement. Shows consecutive days studied with fire emoji badge and progress ring for daily goals.
  - **Value proposition:**
    - Habit formation drives retention — language learning needs consistency over intensity
    - Visual progress motivates daily return ("Don't break the streak!")
    - Low-friction goals (e.g., "完成 1 篇文章" or "答對 10 題") achievable in 10-15 minutes
    - Gentle nudge via local notification if streak at risk (optional, non-intrusive)
  - **Features:**
    - **Streak counter:**
      - "連續學習 7 天 🔥" badge on homepage and account screen
      - Tracks consecutive days with at least 1 completed activity (article read or quiz completed)
      - Resets to 0 if a day is missed (but shows "最長連續: 14 天" as milestone)
      - Streak survives timezone changes (tracks by local date, not UTC)
    - **Daily goals:**
      - User sets goal type: "完成 1 篇文章閱讀" OR "完成 1 次測驗" OR "答對 10 題" (configurable in settings)
      - Progress ring on homepage showing completion (e.g., "8 / 10 題已完成")
      - Goal resets at midnight local time
      - Celebration animation when goal completed: "今日目標達成！🎉"
    - **Weekly summary:**
      - End-of-week notification (optional): "本週學習 5 天，完成 3 篇文章，答對 67 題"
      - Shows consistency chart (7-day grid with check marks for active days)
  - **Implementation approach:**
    - **Data tracking** (AsyncStorage + Supabase):
      - [ ] AsyncStorage: `@streak:currentStreak`, `@streak:longestStreak`, `@streak:lastActiveDate`, `@goals:dailyGoalType`, `@goals:dailyProgress`
      - [ ] Sync to Supabase `user_streaks` table (optional, for cloud backup): `user_id`, `current_streak`, `longest_streak`, `last_active_date`
      - [ ] Check on app launch: if `lastActiveDate` was yesterday, increment streak; if older, reset to 1
      - [ ] Update streak after quiz completion or article read (via existing `saveQuizHistory` / `recordReadProgress`)
    - **Mobile UI:**
      - [ ] Add streak badge to homepage hero section: large "🔥 7 天" with subtitle "連續學習"
      - [ ] Add daily goal progress ring to homepage (circular progress, 0-100%)
      - [ ] Add streak + longest streak to account screen stats section
      - [ ] Create `app/settings.tsx` (or extend account screen) with daily goal selector
      - [ ] Celebration modal on goal completion: confetti animation + "今日目標達成！" message
      - [ ] Weekly summary card on homepage (collapsible, shows 7-day activity grid)
    - **Local notifications** (optional, requires user permission):
      - [ ] 8pm daily reminder if goal not completed: "還差 2 題就完成今日目標！"
      - [ ] 11pm streak reminder if no activity today: "完成 1 次測驗保持連續記錄 🔥"
      - [ ] Use `expo-notifications` for scheduling
      - [ ] Settings toggle to enable/disable notifications
  - **UX considerations:**
    - Non-intrusive: notifications are gentle reminders, not guilt trips
    - Positive framing: "你已連續學習 7 天！" not "不要中斷連續記錄！"
    - Flexible goals: users can adjust daily goal difficulty in settings
    - Streak survives edge cases: traveling across timezones, early morning study sessions
  - **Success metrics:**
    - Daily active user rate increases by 20%+ after implementing streaks
    - Average session frequency increases (more short daily sessions vs. long weekly sessions)
    - 7-day retention rate improves by 15%+
  - **Estimated effort:** 1 day
    - AsyncStorage tracking: 2 hours
    - Homepage UI (badge, progress ring): 2 hours
    - Goal logic + celebration: 2 hours
    - Notifications (optional): 2 hours

- [ ] **#034 — FEATURE: Achievement Badges**
  - **Summary:** Implement collectible achievement badge system for milestone events. Provides positive reinforcement and visible progress markers beyond raw stats.
  - **Value proposition:**
    - Gamification that rewards progress without competitive pressure (unlike leaderboards)
    - Visible milestones help students see tangible accomplishments
    - Badge collection appeals to completionist mindset common in students
    - Social sharing potential (optional: share unlocked badges)
  - **Badge categories:**
    - **Getting Started:**
      - "初次嘗試" — Complete first quiz
      - "首篇文章" — Read first article
      - "註冊會員" — Sign up with Google or email
    - **Volume milestones:**
      - "練習新手" — Complete 10 questions
      - "練習能手" — Complete 50 questions
      - "練習高手" — Complete 200 questions
      - "閱讀愛好者" — Read 5 articles
      - "博覽群書" — Read 20 articles
    - **Accuracy milestones:**
      - "準確射手" — Achieve 80% correct rate in a single quiz
      - "完美答題" — Get 100% in a quiz (10+ questions)
      - "持續進步" — Improve correct rate by 20%+ over 1 month
    - **Consistency:**
      - "堅持一週" — 7-day study streak
      - "堅持一月" — 30-day study streak
      - "每日學習者" — Complete daily goal 7 days in a row
    - **Special achievements:**
      - "模擬考通過" — Complete DSE mock exam with 60%+ score
      - "錯題重溫達人" — Complete 20+ revision exercises
      - "字詞大師" — Review 100+ vocabulary cards (requires #032)
  - **Implementation approach:**
    - **Badge definitions** (JSON config or database):
      - [ ] Create `data/badges.json` with badge definitions: `{id, title, description, icon, requirement, rarity}`
      - [ ] Or create `badges` table in Supabase: `id`, `title`, `description`, `icon_name`, `requirement_type`, `requirement_value`, `rarity`
      - [ ] Rarity levels: common / rare / epic (affects visual styling)
    - **User badge tracking** (`user_badges` table):
      - [ ] Columns: `user_id`, `badge_id`, `unlocked_at`, `is_new` (for showing "NEW!" indicator)
      - [ ] Query on app launch to check newly unlocked badges
      - [ ] RLS policy: users can only read their own badges
    - **Backend logic** (`admin/lib/badge-check.js`):
      - [ ] Function `checkAndAwardBadges(userId)` — runs after quiz completion, article read, streak update
      - [ ] Queries user stats (questions completed, streak, correct rate, etc.)
      - [ ] Compares against badge requirements
      - [ ] Inserts new rows into `user_badges` if requirements met
      - [ ] Returns array of newly unlocked badges
    - **Mobile UI:**
      - [ ] Badge unlock modal (fullscreen): large badge icon + title + "恭喜解鎖！" message
      - [ ] Badge gallery in account screen: grid of all badges (locked/unlocked states)
      - [ ] Locked badges show silhouette + requirement hint: "完成 50 題解鎖"
      - [ ] Badge detail view: tap badge → shows description, unlock date, share button
      - [ ] "NEW!" indicator on account badge icon if unviewed badges exist
    - **Visual design:**
      - [ ] Badge icons: simple SVG illustrations (medal, star, book, flame, etc.)
      - [ ] Rarity colors: common (gray), rare (amber), epic (purple)
      - [ ] Unlock animation: scale + fade in + confetti particles
  - **UX considerations:**
    - Non-blocking: badge unlock modal appears after quiz score screen (not interrupting flow)
    - No pressure: locked badges show requirements but don't nag users
    - Opt-in sharing: "分享到社交媒體" button in badge detail (generates image card)
  - **Success metrics:**
    - % of users who unlock at least 3 badges
    - Engagement lift after badge unlock (do users continue studying?)
    - Badge gallery view rate (are users checking their collection?)
  - **Estimated effort:** 1-2 days
    - Badge definitions + database: 2 hours
    - Backend check logic: 3 hours
    - Mobile UI (modal, gallery, animations): 4-5 hours
    - Testing: 1-2 hours

- [ ] **#035 — FEATURE: Progress Visualization Charts**
  - **Summary:** Display line charts and bar charts showing performance trends over time. Helps students visualize improvement and identify patterns (e.g., "我在週末表現較差").
  - **Value proposition:**
    - Visible improvement = motivation during plateaus
    - Charts reveal patterns invisible in raw stats (e.g., time-of-day performance, part-specific trends)
    - Complements mistake analysis (#031) with temporal dimension
    - Appeals to data-driven students who want detailed insights
  - **Charts to display:**
    - **Overall correct rate trend (line chart):**
      - X-axis: Last 30 days (or 10 most recent quizzes)
      - Y-axis: Correct rate (0-100%)
      - Shows moving average to smooth noise
      - Highlight: "比上月進步 12%！"
    - **Performance by part (bar chart):**
      - 8 bars representing Parts 1-8
      - Height = correct rate for each part
      - Color: green (>70%), amber (50-70%), red (<50%)
      - Shows user's strengths and weaknesses at a glance
    - **Questions completed over time (area chart):**
      - X-axis: Last 30 days
      - Y-axis: Cumulative questions completed
      - Shows study volume consistency
      - Milestone markers: "第 100 題", "第 200 題"
    - **Weekly activity heatmap** (calendar grid):
      - 7×4 grid showing last 28 days
      - Each cell colored by activity level (0 = gray, 1-5 = light amber, 6+ = dark amber)
      - GitHub-style contribution graph
  - **Implementation approach:**
    - **Backend API** (`admin/routes/analytics.js`):
      - [ ] `GET /api/analytics/trends?userId=<uuid>&days=30` — returns time-series data
      - [ ] Response: `{ correctRateTrend: [{date, rate}], byPart: [{part, rate}], cumulativeQuestions: [{date, total}], activityHeatmap: [{date, count}] }`
      - [ ] Aggregation queries on `quiz_answers` grouped by date/part
      - [ ] Cache results (1 hour TTL) to reduce DB load
    - **Mobile UI** (`app/progress.tsx` or section in `app/account.tsx`):
      - [ ] Install charting library: `react-native-chart-kit` or `victory-native`
      - [ ] Add "學習進度" tab/card in account screen
      - [ ] Line chart component for correct rate trend (scrollable if > 30 days)
      - [ ] Horizontal bar chart for part breakdown
      - [ ] Area chart for cumulative questions
      - [ ] Heatmap calendar grid (custom component or library)
      - [ ] Require minimum data: "需要完成至少 5 次測驗才能顯示趨勢圖" placeholder
    - **Chart interactions:**
      - [ ] Tap data point on line chart → tooltip showing exact date + rate
      - [ ] Tap bar in part chart → navigates to practice for that part
      - [ ] Pinch-to-zoom on line chart for detailed view (optional)
  - **UX considerations:**
    - Show "需要更多數據" placeholder if user has < 5 quiz attempts
    - Default to 30-day view, offer 7-day and 90-day toggles
    - Highlight positive trends: "正確率上升趨勢！" badge on improving charts
    - Avoid overwhelming with too many charts — start with 2-3 most actionable ones
  - **Success metrics:**
    - % of users who view progress charts at least once per week
    - Correlation between chart viewing and study consistency
    - Users who view charts show higher retention vs. non-viewers
  - **Estimated effort:** 2-3 days
    - Backend API + aggregation: 1 day
    - Chart library integration: 1 day
    - Mobile UI + interactions: 1 day

- [ ] **#036 — FEATURE: Home Screen Widget (iOS/Android)**
  - **Summary:** Implement native home screen widget showing daily progress, study streak, and quick action button. Reduces friction to start studying by providing at-a-glance status and one-tap entry.
  - **Value proposition:**
    - Home screen visibility = daily reminder without notification spam
    - One-tap "開始練習" reduces app launch friction
    - Shows key stats (streak, daily goal) without opening app
    - Industry-standard feature for learning apps (Duolingo, Streaks, etc.)
  - **Widget variants:**
    - **Small widget** (iOS: 2×2, Android: 2×2):
      - Shows current streak: "🔥 7 天"
      - Tap to open app to homepage
    - **Medium widget** (iOS: 4×2, Android: 4×2):
      - Shows streak + daily goal progress ring
      - "今日已完成 8 / 10 題"
      - Tap to open app
    - **Large widget** (iOS: 4×4, Android: 4×4, optional):
      - Shows streak, daily goal, weekly summary (7-day activity grid)
      - "開始練習" button → deep link to quiz screen
  - **Implementation approach:**
    - **iOS (WidgetKit):**
      - [ ] Create `ios/ClassicalChineseWidget` Swift target in Xcode
      - [ ] Implement SwiftUI widget views (small/medium/large)
      - [ ] Fetch data via App Groups shared UserDefaults (streak, goal progress)
      - [ ] Update widget timeline every 15 minutes (WidgetKit limitation)
      - [ ] Handle widget tap: open app via URL scheme or universal link
    - **Android (Glance Widget):**
      - [ ] Create widget provider class in `android/app/src/main/java/.../widget/`
      - [ ] Define widget layouts in XML (small/medium sizes)
      - [ ] Use RemoteViews to update widget content
      - [ ] Fetch data from SharedPreferences (React Native AsyncStorage)
      - [ ] Update widget via broadcast receiver (triggered when streak/goal updates)
    - **React Native bridge:**
      - [ ] Expo config plugin for widget setup (or manual native code)
      - [ ] Shared data layer: write streak/goal data to App Groups (iOS) + SharedPreferences (Android)
      - [ ] Update widget when streak or goal changes (via native module call)
      - [ ] Deep link handling: `classicalchineselearner://quiz` opens quiz screen
  - **Data sync:**
    - [ ] On quiz completion: update AsyncStorage → trigger widget refresh
    - [ ] On daily goal completion: update widget to show checkmark
    - [ ] On streak increment: update widget to show new count
    - [ ] Widget timeline refreshes every 15 minutes (iOS limitation) or on-demand (Android)
  - **UX considerations:**
    - Widget shows cached data (may be slightly stale) — acceptable tradeoff for performance
    - "開始練習" button deep-links to quiz lobby (not article list)
    - Widget follows system dark mode setting
    - Empty state if no activity yet: "開始你的學習之旅"
  - **Limitations:**
    - iOS WidgetKit cannot refresh more frequently than ~15 minutes (Apple limitation)
    - Android widgets can be more dynamic but vary by launcher
    - Requires native code — cannot be fully implemented in pure React Native/JS
  - **Success metrics:**
    - % of users who add widget to home screen
    - Widget tap-through rate (opens app via widget vs. app icon)
    - Users with widget show higher DAU vs. users without widget
  - **Estimated effort:** 3-4 days
    - iOS WidgetKit implementation: 1-2 days (Swift + SwiftUI)
    - Android widget implementation: 1-2 days (Kotlin/Java + XML layouts)
    - React Native bridge + data sync: 1 day
    - Testing on multiple device sizes: 0.5 day
  - **Note:** Requires native development skills (Swift for iOS, Kotlin/Java for Android). If unfamiliar, consider hiring contractor or postponing until post-launch.

- [ ] **#037 — UX: Adjustable Font Size**
  - **Summary:** Allow users to adjust text size for articles and quiz questions. Improves accessibility for vision-impaired users and accommodates personal reading preferences.
  - **Value proposition:**
    - Accessibility: vision-impaired students can increase font size
    - Personal preference: some students prefer larger text for classical Chinese (complex characters)
    - Industry standard: most reading apps offer font size adjustment
    - Quick win: low implementation effort, high perceived value
  - **Features:**
    - **3 size options:** 小 (16px base) / 中 (18px base, default) / 大 (22px base)
    - **Applies to:** article text, quiz question stems, options, explanations
    - **Persists:** setting stored in AsyncStorage, survives app restarts
    - **Settings location:** account screen or dedicated settings page
  - **Implementation approach:**
    - **State management:**
      - [ ] Create `contexts/FontSizeContext.tsx` with `fontSize` state ('small' | 'medium' | 'large')
      - [ ] Load from AsyncStorage on app launch: `@settings:fontSize`
      - [ ] Provide `setFontSize(size)` function to update state + AsyncStorage
    - **UI components:**
      - [ ] Wrap app in `FontSizeProvider` (in `app/_layout.tsx`)
      - [ ] Update `ArticleText.tsx`: read `fontSize` from context, apply multiplier to base sizes
      - [ ] Update quiz components (`QuizQuestion.tsx`, `MCQuestion.tsx`, `FillBlankQuestion.tsx`, `SentenceOrderQuestion.tsx`): apply fontSize multiplier
      - [ ] Font size multipliers: small = 0.89x, medium = 1.0x, large = 1.22x
    - **Settings UI:**
      - [ ] Add "字體大小" section in account screen (or create `app/settings.tsx`)
      - [ ] 3 radio buttons: 小 / 中 / 大 with preview text: "範文字體預覽：飢腸轆轆"
      - [ ] Instant preview: changing size immediately updates preview text
      - [ ] Save automatically on selection (no "Save" button needed)
  - **Technical details:**
    - Base font sizes (medium):
      - Article text: 18px (Georgia font)
      - Quiz questions: 18px
      - Footnotes: 16px
      - UI labels: 14px (unchanged by this setting)
    - Multipliers applied only to content text, not UI chrome (tabs, buttons, headers)
    - Line height scales proportionally: `lineHeight = fontSize * 2.3`
  - **UX considerations:**
    - Preview text in settings shows actual article content font (not generic "Aa")
    - Setting persists across sessions (user doesn't re-select every time)
    - Large font may require more scrolling — acceptable tradeoff for readability
    - Does not affect image sizes or layout spacing (only text)
  - **Success metrics:**
    - % of users who change from default font size
    - Distribution of size preferences (most users stay on medium, or prefer large?)
    - Accessibility improvement: qualitative feedback from vision-impaired users
  - **Estimated effort:** 2-3 hours
    - Context + AsyncStorage: 1 hour
    - Update components: 1 hour
    - Settings UI: 1 hour

- [ ] **#029 — FEATURE: Magic link (passwordless email) authentication**
  - **Summary:** Add passwordless email authentication as a second login method alongside Google OAuth. Users enter their email address and receive a one-time login link via email. No password creation or management required.
  - **Technical approach:**
    - Use Supabase Auth's built-in magic link feature (OTP via email)
    - Add email input form to `app/login.tsx` with "Email" and "Google" tab selector
    - Call `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })`
    - Handle email link callback in existing `app/oauth.tsx` route
    - Show "Check your email" confirmation message after submission
  - **Benefits:**
    - Zero cost (same as Google OAuth, no SMS fees)
    - Lower friction than email/password (no password creation)
    - No password management burden (forgot password, reset flows, weak passwords)
    - Built into Supabase Auth, minimal implementation effort (~20-30 min)
  - **UX considerations:**
    - Clear messaging: "我們會發送登入連結到你的電子郵件"
    - Email delivery time: may take 10-30 seconds
    - Requires email access each time (can't log in if email is inaccessible)
    - Suggest keeping Google OAuth as primary/fast option for repeat users
  - **Implementation checklist:**
    - [ ] Add email input UI to login screen with tab selector
    - [ ] Implement `signInWithOtp` call in AuthContext
    - [ ] Add confirmation screen / message after email submission
    - [ ] Update oauth.tsx to handle email magic link callback
    - [ ] Test full flow: enter email → receive link → click link → authenticated
    - [ ] Add error handling (invalid email, rate limiting, delivery failures)
    - [ ] Update CLAUDE.md with new auth method documentation
- [ ] **#024 — FEATURE: Log anonymous user quiz answer**
  - **Summary:** Currently the database (Supabase setup) only log logged-in-users' `quiz_answer` data because it is linked to the `attempt_id`. However we would like to analyze non-logged-in-users' `quiz_attempts` and `quiz_answers` data for user behavior analysis.
- [ ] **#025 — FEATURE: Log all exercise attempt data**
  - **Summary:** Currently the database (Supabase setup) only log single article attempt records in `quiz_attempts`. But the app now have `revision exercises` and `DSE training exercise`. We should log the records for user behavior analysis. *Beware of sampling logic*: The quiz answers should have been used for sampoling usage. So think deep about this data logic to sugggest proposals.

<!-- Example:
- [ ] #007 — Bug: ...
-->


<!-- Example:
- [ ] #001 — Bug: Quiz timer shows negative time on slow devices
- [ ] #002 — Feature: Add "skip question" button for Pro users
- [ ] #003 — UX: Improve contrast on answer feedback
-->

---

## In Progress

_Tasks currently being worked on. Add start date and assignee._

<!-- Example:
- [ ] #004 — Bug: Admin portal shows wrong question count (started 2026-06-13, @claude)
-->

---

## Ready for QA

_Finished by Claude, awaiting Mickey's validation. Once validated → move to **Done**. If issues found → move back to **In Progress** with notes._

- [ ] **#022 — BUG: legacy article data exist while the cache is not clear**
  - **Summary:** Implemented automatic orphan detection during incremental sync. When the app syncs from Supabase, it now fetches all published article IDs and compares them with the local cache. Articles that exist in cache but not in Supabase (deleted articles) are automatically removed from SQLite, memory, and tombstoned. Seed articles are protected and never removed. This means deleted articles will automatically disappear on the next app launch without requiring manual "清除快取並重新同步".
  - **Files changed:** `lib/contentStore.ts`, `CLAUDE.md`
  - **Testing needed:** 
    1. Delete an article from Supabase admin portal
    2. Close and reopen the mobile app (triggers `backgroundFetch`)
    3. Verify the deleted article no longer appears in the article list
  - **Technical details:** Added `removeOrphans()` function that runs after every incremental sync. Performs one additional lightweight query (`SELECT id WHERE status = 'published'`) to get the full published article set, then removes orphans from cache.

- [ ] **#020 — BUG: Strange time counting**
  - **Summary:** Fixed time formatting bug where large durations displayed incorrectly (e.g., "46780 分" for 32+ days). Updated `formatSeconds()` and `timeDelta()` in `account.tsx` and `attempt.tsx` to use appropriate units based on duration: < 1 min shows seconds; 1-59 min shows minutes (and seconds); 1-23 hours shows hours and minutes; 24+ hours shows days and hours. The 46,780-minute duration now correctly displays as "32 天 11 小時".
  - **Files changed:** `app/account.tsx`, `app/attempt.tsx`
  - **Testing needed:** Verify time formatting displays correctly in account history and attempt detail screens
  - **Note:** Issue has not recurred in testing, keeping in QA to monitor

---

## Done (Recent)

_Completed tasks with summaries and lessons learned. Ordered by completion date (newest first)._

### 2026-06-23

- [x] **#026 — FEATURE: Weight Training Exercise Logic (針對性難題訓練)**
  - **Summary:** Fully implemented cross-article quiz feature with smart sampling, repeat avoidance, and multi-select partial credit scoring.
  - **Admin portal:** New `/cross-article-questions.html` page for managing cross-article questions. Multi-article selection via checkboxes. Auto-calculated points (points = number of correct answers). Draft/published workflow.
  - **Backend API:**
    - `GET /api/quiz/weight-training/progress?userId=<uuid>` — returns seen count, attempt number, pool stats
    - `GET /api/quiz/weight-training/sample?userId=<uuid>` — smart sampling: 5 Part 7 + 5 Part 8 with repeat avoidance (based on last 100 sessions)
    - `POST /api/quiz/weight-training/session` — saves session + answers to `exercise_sessions` and `exercise_answers`
    - Graceful fallback: if progress query fails, continues with anonymous sampling
  - **Mobile app:** Lobby shows progress (e.g., "已挑戰 45 / 120 題"). Quiz with related article buttons (tap to view multiple articles during quiz). Session auto-saves on completion. Score screen shows total > 10 possible.
  - **Scoring:** Single-select MC = 1 point. Multi-select MC = points equal to number of correct answers (e.g., 2 points for question with 2 correct answers). Partial credit: 1 mark per correct selection, no penalty.
  - **Database schema:** New tables `cross_article_questions` (id, question_text, format, part, options, correct_answer, explanation, select_count, points, status), `cross_article_question_articles` (junction table). New column in `exercise_answers`: `points_earned`.
  - **SQL migrations:** Added `points INTEGER NOT NULL DEFAULT 1` to `cross_article_questions`; updated existing MC questions to set correct points.
  - **Bug fixes during implementation:**
    1. Error alert "getWeightTrainingSeenData query failed" → `.in()` query with 801 session IDs exceeded Supabase limit. Fixed: limit to 100 most recent sessions.
    2. Duplicate handleSave calls → removed `answers` from useEffect deps + added type validation.
    3. Total score stuck at 10 → multiple layers needed fixing: (a) DB column, (b) auto-calculate, (c) backend conversion, (d) API response mapping, (e) mobile app conversion from hardcoded `points: 1` to `q.points`.
    4. UI padding → components touching edges. Fixed: added `px-4` to QuizShell.
    5. Misleading "每題 1 分" display → removed from PartHeader.
  - **Key lesson:** When errors reference database queries but SQL looks correct, check application code layers (API field mapping, conversions, hardcoded values) before continuing SQL debugging.
  - **Files changed:** `admin/public/cross-article-questions.html`, `admin/public/js/cross-article-questions.js`, `admin/routes/cross-article-questions.js`, `admin/routes/weight-training.js`, `admin/lib/cross-article-helpers.js`, `admin/lib/weight-training-sampling.js`, `app/weight-training.tsx`, `components/quiz/QuizShell.tsx`, `components/quiz/PartHeader.tsx`, `lib/quiz.ts`, `CLAUDE.md`
  - **Completed:** ✅ Production-ready

- [x] **#023 — BUG: Multiple choice questions did not display explanation**
  - **Summary:** Fixed multi-select MC questions (selectCount > 1) not displaying explanation text after submission. The component was only showing "正確答案: A, C" without the explanation content. Added `explanation` prop to `MCQuestion` component and updated the feedback section to display explanation text below the correct answer, matching the pattern used in `QuizQuestion` for single-choice questions.
  - **Files changed:** `components/quiz/MCQuestion.tsx`, `components/quiz/QuizShell.tsx`
  - **Root cause:** `MCQuestion` component didn't have an `explanation` prop, and `QuizShell` wasn't passing `currentQuestion.explanation` to it
  - **Validated:** ✅ Explanation now displays properly for multi-select questions

### 2026-06-21

- [x] **#028 — FEATURE: Wordings update for exercise result page**
  - **Summary:** Added standardized part titles (parts 1-8) for all exercise result screens. Created `STANDARD_PART_TITLES` constant in `lib/data.ts` with the 8 part labels. Updated `getPartTitles()` to always return standard titles (ignoring outdated quiz data). Removed `shortTitle()` function from `ScoreScreen` so full labels display (e.g., "第1部分：字詞句譯" instead of just "字詞句譯"). Also added normalization in `rebuildQuizJson()` to fix bilingual True/False labels ("是 (True)" → "正確", "否 (False)" → "錯誤"). Fixed True/False questions to not shuffle - they now always display "正確" first, "錯誤" second. Ran rebuild script to update all quiz_json in database.
  - **Files changed:** `lib/data.ts`, `components/quiz/ScoreScreen.tsx`, `app/attempt.tsx`, `app/revision.tsx`, `admin/lib/article-helpers.js`, `components/quiz/QuizShell.tsx`, `admin/rebuild-all-quizzes.js` (new)
  - **Part labels:** 第1部分：字詞句譯, 第2部分：範文原文填充, 第3部分：文意理解（選二）, 第4部分：是非題, 第5部分：範文原文重組句子, 第6部分：文意理解（選四）, 第7部分︰一詞多義辨認, 第8部分︰文言句式辨認
  - **Completed:** ✅ Rebuild script executed successfully (8 articles updated)

- [x] **#027 — FEATURE: Add article view button to revision exercise**
  - **Summary:** Added article popup functionality to revision exercise screen. Users can now tap "📖 文章" button to view the full article text with footnotes while reviewing wrong questions. Reused the existing `ArticlePopup` component from DSE training. The button appears next to the article title when article data is available.
  - **Files changed:** `app/revision.tsx`
  - **Lesson:** The ArticlePopup component is now used in three places: QuizShell (single-article quiz), DSE training (multi-article quiz), and revision exercise. The pattern is consistent: load article with `getArticle(articleId)`, manage `showArticle` state, and render the modal.

### 2026-06-19

- [x] **#021 — BUG: `Android device only` Footnote numbers not clickable / difficult to click**
  - **Summary:** Fixed tap target reliability for footnote markers on Android. Replaced nested `<Text onPress>` (which has poor Android support) with `<Pressable>` wrapper. Added `hitSlop={8}` to expand the tappable area by 8px on all sides, making the small footnote numbers easier to tap accurately.
  - **Root cause:** Nested Text components with onPress handlers have unreliable touch handling on Android, especially for small inline text elements. The tap target position can be misaligned with the visual position.
  - **Files changed:** `components/reading/ArticleText.tsx`
  - **Validated:** ✅ Android device - footnote markers are now reliably clickable
  - **Lesson:** On Android, use `<Pressable>` with explicit `hitSlop` instead of nested `<Text onPress>` for small interactive inline elements. Pressable provides better touch handling and allows expanding tap targets beyond visual bounds.

- [x] **#013 — BUG: `Android device only` Quiz page > open article reading pop up cannot scroll.**
  - **Summary:** Already fixed in task #018 on 2026-06-19. The ArticlePopup scroll issue was resolved by removing nested Pressable structure that was blocking scroll gestures. Changed to absolute-positioned backdrop Pressable + plain View wrapper with ScrollView for content.
  - **Files changed:** `components/quiz/ArticlePopup.tsx` (fixed in commit 07f3d47)
  - **Validated:** ✅ Android device - article popup scrolls properly
  - **Lesson:** Task was completed as part of #018 but not explicitly marked as done. Always cross-reference Done section when checking task status.

- [x] **#012 — BUG: `Android device only` Article reading page text overlapping**
  - **Summary:** Fixed text overlapping issue on Android devices where classical Chinese text lines were rendering on top of each other. Changed from NativeWind `leading-9` class to explicit `lineHeight: 42` style property for more reliable cross-platform rendering with the Georgia font. The `text-lg` (18px) with `lineHeight: 42` gives ~2.3x line spacing, which provides better vertical clearance for classical Chinese characters on Android.
  - **Files changed:** `components/reading/ArticleText.tsx`
  - **Validated:** ✅ Android device - text lines display with proper spacing, no overlapping
  - **Lesson:** NativeWind Tailwind classes may render inconsistently across platforms, especially for typography with custom fonts. Use explicit numeric `lineHeight` in the `style` prop when cross-platform consistency is critical. Android renders Georgia font with different metrics than iOS.

- [x] **#011 — BUG: `Android device only` Article reading page cannot show full article content**
  - **Summary:** Fixed Android-specific rendering issue where article content appeared truncated. Root cause was text overlapping (#012) making content appear cut off.
  - **Files changed:** `components/reading/ArticleText.tsx`
  - **Validated:** ✅ Android device - full article content displays correctly
  - **Lesson:** Related to #012 - text overlapping can make content appear incomplete even when it's all rendered.

- [x] **#010 — UX: Article reading page improvements**
  - **Summary:** Implemented 2-tab interface for article reading: "原文" (original text with footnotes) and "白話文語譯" (modern translation). Users can switch between tabs to choose their reading mode. Original text tab retains the bottom footnote tooltip for explanations. Translation tab displays all translation paragraphs in a clean layout. This provides clear separation of cognitive contexts and allows users to explicitly choose their reading approach.
  - **Files changed:** `app/read.tsx`
  - **Validated:** ✅ Tab switching works smoothly, footnote tooltip appears only in 原文 tab, translation displays correctly
  - **Lesson:** Tabbed interfaces provide clear cognitive separation for different reading modes. Users can explicitly choose their approach (original vs translation) without competing visual elements. Implements Option B (tabbed interface) per user preference.

- [x] **#019 — UX: Homepage, `DSE操練` card should have 3 buttons**
  - **Summary:** Consolidated DSE操練 section into a single unified card with description "重點操練，準備應試" and 3 buttons inside: (1) 📝 DSE 模擬考題, (2) 🔁 溫故知新, (3) 🎯 針對性難題訓練 (coming soon). All buttons are contained within one slate-800 rounded card, creating a focused training hub on the homepage. The demon mascot remains in the header. Tapping "DSE 模擬考題" navigates directly to mock exam mode via URL params.
  - **Files changed:** `app/(tabs)/index.tsx`, `app/(tabs)/dse-training.tsx`
  - **Validated:** ✅ Single card with 3 buttons displays correctly, navigation works
  - **Lesson:** Grouping related actions in a single visual container (card) improves information hierarchy and reduces visual noise compared to multiple separate cards. Users can immediately see all available training options without scrolling.

- [x] **#015 — BUG: Quiz sentence sequence type question issue**
  - **Summary:** Fixed validation bug in `SentenceOrderQuestion` where correct answers were marked wrong. Two fixes applied: (1) Added `.trim()` when splitting delimiters to handle spaces around `>` characters, and (2) Added support for comma-separated `correctAnswer` format (some questions use `,` instead of `>`). The component now correctly handles both delimiter formats.
  - **Files changed:** `components/quiz/SentenceOrderQuestion.tsx`
  - **Validated:** ✅ Sentence-order questions now validate correctly with both comma and > delimiters
  - **Lesson:** When splitting delimited strings from a database, always trim whitespace and support multiple delimiter formats. Database fields may use different human-readable formatting (commas vs arrows, spaces around delimiters) that must be normalized before comparison.

- [x] **#014 — UX: 2 similar buttons on account page**
  - **Summary:** Reviewed both sync buttons — they serve **different purposes** and both should be kept. "更新內容" (`refresh()`) performs incremental sync (only fetches changed articles since last sync), while "清除快取並重新同步" (`clearCacheAndResync()`) performs a full reset (clears cache + re-fetches everything). Per CLAUDE.md, incremental sync doesn't detect deletions, so the full resync is needed after Supabase data purges. Improved UX by clarifying their purposes: renamed "更新內容" to "檢查更新 (增量同步)" and added subtitle "完整重新下載 (修復用)" to the clear cache button. Grouped both under "內容同步" section header.
  - **Files changed:** `app/account.tsx`
  - **Validated:** ✅ Button labels are clear and both sync operations work correctly
  - **Lesson:** Two buttons that look similar may serve fundamentally different purposes — incremental vs full sync is a valid distinction. Clarifying purpose via labels/subtitles improves UX without removing functionality.

- [x] **#018 — FEATURE: DSE mock exam questions show article labels**
  - **Summary:** DSE mock exam questions now display an article label badge above each question stem. The badge shows "📄 {article title} · 點擊查看" and is tappable to open the article popup for reference while answering. QuizShell now supports multi-article mode via the `articles` prop — when provided, it dynamically loads the correct article for each question based on `question.articleId` and displays the badge. Single-article quizzes show the "📖 文章" button instead. Fixed multiple UI issues: ArticlePopup scroll (removed nested Pressable), footnote marker width (min-w-[32px]), and QuizShell scrollability (wrapped in ScrollView).
  - **Files changed:** `lib/types.ts` (added `articleId?: string`), `app/(tabs)/dse-training.tsx` (map `article_id`, pass `articles` prop), `components/quiz/QuizShell.tsx` (multi-article support, made scrollable, hide "文章" button in multi-article mode), `components/quiz/ArticlePopup.tsx` (fixed scroll + footnote width)
  - **Validated:** ✅ Badge displays correctly, popup scrolls, footnote markers fit, question screen scrolls to Next button
  - **Lesson:** Adding new UI elements can push content off-screen. Always wrap quiz/form content in ScrollView to ensure all interactive elements remain accessible. Nested Pressables can block scroll gestures — use absolute positioned backdrop instead.

- [x] **#016 — FEATURE: DSE mock exam sampling logic (22 questions per article)**
  - **Summary:** DSE mock exam now uses backend sampling logic instead of loading all questions. New endpoint `GET /api/quiz/dse-mock/sample?userId=<uuid>` randomly picks 2-3 DSE core articles and samples 22 questions per article (6+2+4+2+2+6 across parts 1-6). Implements cross-article repeat avoidance for logged-in users. Total: 44 questions for 2 articles, 66 for 3 articles. Route order matters: specific `/dse-mock/sample` must come before parameterized `/:articleId/sample` to avoid Express matching "dse-mock" as an articleId.
  - **Files changed:** `admin/routes/quiz.js` (new endpoint, route reordering), `app/(tabs)/dse-training.tsx` (API call, fixed fallback URL to production)
  - **Validated:** ✅ Loads 2-3 articles with 44-66 questions, proper part distribution
  - **Lesson:** Express route order matters — specific paths must be defined before parameterized ones. Production fallback URLs must use production domains, not localhost. Test backend endpoints with `curl` after Railway deploy to verify they're live.

- [x] **#017 — BUG: DSE mock exam article accordion shows wrong content**
  - **Summary:** Article accordion in DSE mock lobby now displays both raw article text with footnote markers AND footnote explanations below (matching `ArticlePopup` pattern). Previously only showed segments without footnotes. Fixed line break issue where each segment created a new line — now all segments render inside a single parent `<Text>` so footnote markers appear inline. Also widened footnote marker from `w-6` to `min-w-[32px]` to prevent wrapping.
  - **Files changed:** `app/(tabs)/dse-training.tsx`
  - **Validated:** ✅ Text flows continuously with inline footnote markers, footnote explanations display properly below
  - **Lesson:** When rendering article text, all segments must be nested inside a single parent `<Text>` component (not separate `<Text>` per segment) to avoid unwanted line breaks. Match the pattern from `ArticleText.tsx` for consistency.

### 2026-06-13

- [x] **#009 — Bug: Android app icon showing default Expo icon instead of custom icon**
  - **Summary:** Android builds were using outdated Expo default icon files (`android-icon-*.png` dated October 1985) instead of the actual app icon (`icon.png`, 880KB). Updated `app.json` to point to the correct icon file and simplified the adaptive icon configuration to use only the foreground image with a white background.
  - **Files changed:** `app.json`
  - **Validated:** ✅ Correct icon now displays on Android home screen and app drawer

- [x] **#008 — Bug: Google OAuth not working on Android devices**
  - **Summary:** Google sign-in failed on Android with "invalid flow state" PKCE error. Root cause was missing Android OAuth client configuration in Google Console + malformed redirect URI (`classicalchineselearnerapp:?code=...` missing `//`). Created Android OAuth client with package name + SHA-1, added it to Supabase, and fixed redirect URI to `classicalchineselearnerapp://oauth`. Added `/oauth.tsx` route to handle callback gracefully.
  - **Files changed:** `contexts/AuthContext.tsx`, `lib/supabase.ts`, `app/oauth.tsx` (new), `app/login.tsx`
  - **External config:** Google Cloud Console (Android OAuth client), Supabase Dashboard (Site URL, Redirect URLs, Authorized Client IDs)
  - **Validated:** ✅ iOS simulator and Android device both working
  - **Lesson:** Mobile OAuth requires platform-specific configuration. Android needs its own OAuth client with package name + SHA-1 fingerprint. The redirect URI must be well-formed (`scheme://path`, not `scheme:?query`). PKCE "invalid flow state" errors often indicate redirect URI mismatch or missing client ID in the auth provider's authorized list.

- [x] **#007 — Feature: Delete user account script for testing**
  - **Summary:** Created `admin/delete-user.js` — wipes all data for a given email (quiz_answers → quiz_attempts → exercise_sessions → read_progress → profiles → auth.users). Uses `--confirm` flag instead of interactive prompts to avoid readline/dotenvx conflicts.
  - **Files changed:** `admin/delete-user.js` (new)
  - **Usage:** `node admin/delete-user.js <email>` (dry run) / `node admin/delete-user.js <email> --confirm` (actually delete)
  - **Validated:** Successfully deleted test account rkmyip3@gmail.com.

- [x] **#004 — UI: Question pool progress and DSE section info**
  - **Summary:** Homepage and DSE文章 tab now show per-article progress ("已完成 X / Y 題"), attempt count, and correct rate for logged-in users. New batch endpoint `GET /api/quiz/progress?userId=<uuid>` avoids N+1 queries. New `lib/articleProgress.ts` caches the result in-memory and is invalidated after quiz completion. DSE文章 tab gained an info banner explaining 12+8 articles, 22 questions per session, ~10 min.
  - **Files changed:** `admin/routes/quiz.js`, `lib/articleProgress.ts` (new), `app/quiz.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/dse-learner.tsx`
  - **Validated:** Progress, attempt count, correct rate, and info banner all display correctly after Railway deploy.
  - **Lesson:** The progress data comes from a **new live endpoint**, not the app bundle — the feature was invisible because `admin/routes/quiz.js` was committed but never pushed, so Railway still served the old code (endpoint returned 401). Rebuilding the iOS app can never surface a server-side feature. When a UI change depends on a new backend route, verify the live endpoint returns 200 (`curl`) before assuming a Metro/cache issue.

- [x] **#005 — Bug: Fill-blank question answer field missing in revision exercise**
  - **Summary:** `revision.tsx` hardcoded `<QuizQuestion>` for every question regardless of `question.format`. Fill-blank questions have no `options` array, so `QuizQuestion` rendered nothing interactive (same issue for `sentence-order`). Added format-dispatch in the render — `fill-blank` → `FillBlankQuestion`, `sentence-order` → `SentenceOrderQuestion`, everything else → `QuizQuestion` — matching the pattern in `QuizShell.tsx`. Also fixed `answers` state type from `Record<number, QuizAnswer>` to `Record<string | number, QuizAnswer>` and added `key={currentQuestion.id}` to reset component state per question.
  - **Files changed:** `app/revision.tsx`
  - **Validated:** Fill-blank input field now appears in revision; can advance through all question formats.
  - **Lesson:** Any screen that renders quiz questions must dispatch on `question.format` — there is no single universal question component. Reuse the dispatch pattern from `QuizShell.tsx` rather than hardcoding one renderer.

- [x] **#006 — Feature: User record cleaning script**
  - **Summary:** Created `admin/clean-user-records.js` — Node.js script that takes a userId as CLI argument and deletes all `quiz_answers` and `quiz_attempts` for that user.
  - **Files changed:** `admin/clean-user-records.js` (new)
  - **Usage:** `node admin/clean-user-records.js <userId>`
  - **Validated:** Works correctly, cleans user records as expected

- [x] **#003 — UX: Multi-select question option restriction**
  - **Summary:** When a user has selected the maximum number of options (`selectCount`), all unselected options are disabled — they appear faded and cannot be tapped. Prevents over-selection without relying solely on the submit button guard.
  - **Files changed:** `components/quiz/MCQuestion.tsx`
  - **Validated:** Options correctly disabled and faded after selecting required count

- [x] **#002 — Feature: Multi-select partial-credit scoring**
  - **Summary:** Changed `mc-multi` scoring from all-or-nothing to 1 mark per correctly selected option. `onAnswer` now passes `pointsEarned` as a third argument. `calculateScore` and `getPartScore` in `lib/quiz.ts` use `pointsEarned` when present. Quiz history persistence updated in `lib/quizHistory.ts`. Score totals are now dynamic (not always 22).
  - **Files changed:** `components/quiz/MCQuestion.tsx`, `components/quiz/QuizShell.tsx`, `lib/quiz.ts`, `lib/quizHistory.ts`
  - **Validated:** Partial credit awarded correctly, dynamic totals display properly

- [x] **#001 — Bug: Login/logout flow not reflecting auth state correctly**
  - **Summary:** Two separate bugs. (1) After logout, no anonymous session was created, leaving the app in a `user = null` / `isAnonymous = false` limbo — the account screen appeared to stay logged in because `loading` was already `false`. (2) After Google login, `router.replace("/account")` ran inside the Alert callback before `onAuthStateChange` had updated the React context, so the account screen rendered with the old anonymous user.
  - **Files changed:** `contexts/AuthContext.tsx`, `app/login.tsx`
  - **Fix 1 (`AuthContext.signOut`):** After `supabase.auth.signOut()`, immediately call `signInAnonymously()` so `onAuthStateChange` fires with a fresh anonymous user and state is always consistent.
  - **Fix 2 (`app/login.tsx`):** Removed `router.replace("/account")` from the Alert callback. Added a `useEffect` that watches `user` and `isAnonymous` — navigation to `/account` happens only after `onAuthStateChange` has updated the context to a real (non-anonymous) user.
  - **Lesson:** Never navigate immediately after an auth call — `onAuthStateChange` is the single source of truth for session state. Always restore a clean anonymous session on logout so the app is never in a `user = null` state.

- [x] **Project Documentation Reorganization**
  - **Summary:** Archived `auth-membership-llm-plan.md` (outdated, 1010 lines); created `project-specification.md` (480 lines, current-state focused)
  - **Changes:** Removed Phase 13 (LLM Mistake Analysis), added Phase 13 (UI/UX Upgrade), re-sequenced Phase 14 (Ads)
  - **Lesson:** Keep specs focused on current state and next steps; archive historical planning docs when they become outdated

- [x] **Created TASKS.md for Operational Tracking**
  - **Summary:** Established single living document for task tracking to avoid creating many small MD files that end up archived
  - **Structure:** Open → In Progress → Done (Recent) → Archive (quarterly)
  - **Lesson:** Single-file approach reduces overhead and keeps history searchable; archive only when needed (50+ items or 3+ months)

### 2026-06-12

- [x] **Quiz Sampling Feature Complete**
  - **Summary:** Implemented intelligent quiz sampling with repeat avoidance, part quotas (6+2+4+2+2+6 = 22 questions), pool progress tracking
  - **Files changed:** `admin/routes/quiz.js`, `admin/lib/sampling.js`, `app/quiz.tsx`, `lib/sampleQuiz.ts`
  - **Lesson:** Public API endpoint (no admin auth) needed for mobile direct access; pool progress display only for logged-in users

---

## Archive Policy

**When to archive:**
- "Done (Recent)" section exceeds 50 completed items, OR
- Completed tasks span more than 3 months

**How to archive:**
1. Create `docs/tasks-archive-YYYY-QN.md` (e.g., `tasks-archive-2026-Q2.md`)
2. Move older completed tasks from "Done (Recent)" to the archive file
3. Keep most recent month in "Done (Recent)" for easy reference

**Archive filename pattern:** `tasks-archive-YYYY-QN.md` (year + quarter, sortable)

---

## Task ID Guidelines (Optional)

- Sequential numbering: `#001`, `#002`, etc.
- Useful for referencing in commit messages: `fix: quiz timer issue (#042)`
- Not required — use freeform descriptions if preferred

## Task Type Labels

- **Bug:** Something broken that needs fixing
- **Feature:** New functionality to implement
- **UX:** User experience improvement
- **Refactor:** Code restructuring (no behavior change)
- **Doc:** Documentation update
- **Test:** Add or fix tests
- **Deploy:** Deployment or infrastructure task
