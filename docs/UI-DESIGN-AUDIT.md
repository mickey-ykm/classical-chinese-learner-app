# UI Design Audit — Card Usage Analysis

## Pages Reviewed

### ✅ Correctly Implemented (Using Cards)

1. **Chapters Tab** - Uses cards for article list items
   - Design: Cards with padding, progress bars inside
   - Implementation: ✅ Correct

2. **Practice Hub** - Uses cards for practice options
   - Design: Large cards with icons and descriptions
   - Implementation: ✅ Correct

3. **Login Screen** - Uses cards/buttons
   - Implementation: ✅ Correct (needs font fixes only)

### ❌ Needs Fixing (Remove Cards)

4. **Home Screen** - FIXED ✅
   - Was using cards, now using border-separated sections
   - Commit: 91c93ef

5. **Account Screen** - Needs fixing
   - Current: Using Card components
   - Design: Border-separated sections (NOT cards)
   - Sections: Profile, Stats row, Analytics, Exercise history link

6. **Article Reader** - Needs review
   - Check if cards are appropriate for article content

### 📝 Requires Font Weight Fixes Only

All pages need `getSerifFont()` updates:
- Chapters Tab
- Practice Hub
- Login Screen  
- Account Screen
- Article Reader
- Quiz Interface

---

## Priority Fixes

### High Priority (UI Structure)
1. ✅ Home Screen - DONE
2. ⏳ Account Screen - Remove cards, use borders

### Medium Priority (Typography)
3. Apply `getSerifFont()` to all 6 remaining pages

### Low Priority (Visual Polish)
4. Icons, spacing fine-tuning

---

## Account Screen Fix Plan

Based on 29-account-paid-user.html design:

**Remove cards from:**
- Profile section (avatar + email)
- Stats row (average, practice count, streak)
- Analytics section (weakness analysis)
- Exercise history button

**Replace with:**
- Border-separated sections
- Stats row: top + bottom border
- Analytics: section label + content
- Direct button styling (no card wrapper)

---

**Status:** Home fixed, Account next
