# Cache Sync Fix — 2026-06-01

## Problem

After purging Supabase data, the mobile app continued showing old cached articles because:

1. The incremental sync only fetches articles with `updated_at > last_sync_at`
2. Deleted articles in Supabase are never fetched, so they remain in the local SQLite cache
3. The app showed 18 old articles instead of the 1 newly published article

## Root Cause

The `contentStore.ts` incremental sync logic (line 211):
```typescript
if (lastSyncAt) {
  query = query.gt("updated_at", lastSyncAt)
}
```

This only detects **changed** articles, not **deleted** ones.

## Solution

Added `clearCacheAndResync()` function to both `contentStore.ts` and `contentStore.web.ts`:

- Deletes all SQLite cache (`content_cache` and `content_meta` tables)
- Clears in-memory maps (`_articles`, `_quizzes`, `_meta`)
- Forces a full re-sync from Supabase (no `last_sync_at` filter)
- **Only loads bundled seed data if Supabase returns nothing** (prevents old seed articles from persisting)

## UI Changes

Added "清除快取並重新同步" button to Account screen (`app/account.tsx`):

- Shows confirmation alert before clearing cache
- Displays sync progress and result
- Button is red to indicate destructive action

## Usage

1. Open the app
2. Go to Account screen (from any tab)
3. Tap "清除快取並重新同步"
4. Confirm the alert
5. Wait for sync to complete

The app will now show only the articles currently published in Supabase.

## Verified Fix (2026-06-01)

After initial implementation, discovered that seed data was being reloaded before the Supabase sync, causing old articles to persist. Fixed by:
1. Clear all caches first
2. Fetch from Supabase
3. Only fall back to seed data if Supabase returns nothing

Tested and confirmed working — "其他文章" tab now shows only the 1 published article from Supabase.

## Alternative Solution

Delete and reinstall the app — this also clears the SQLite database and forces a full re-sync on first launch.

## Future Improvement

Consider implementing tombstone tracking in Supabase:
- Add a `deleted_at` timestamp column
- Soft-delete articles instead of hard-deleting them
- Incremental sync can detect and evict soft-deleted articles
- Periodically purge old tombstones (e.g., after 30 days)
