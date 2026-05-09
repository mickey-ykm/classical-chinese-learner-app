import AsyncStorage from "@react-native-async-storage/async-storage"
import { supabase } from "@/lib/supabase"

const STORAGE_KEY = "read_articles_v1"
const MIGRATED_KEY_PREFIX = "read_articles_migrated_"

async function getLocalReadSet(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

async function saveLocalReadSet(ids: Set<string>): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
}

async function migrateLocalToCloud(userId: string): Promise<void> {
  const migratedKey = `${MIGRATED_KEY_PREFIX}${userId}`
  const already = await AsyncStorage.getItem(migratedKey)
  if (already) return

  const local = await getLocalReadSet()
  if (local.size > 0) {
    const rows = [...local].map((articleId) => ({ user_id: userId, article_id: articleId }))
    await supabase.from("read_progress").upsert(rows, { onConflict: "user_id,article_id" })
  }
  await AsyncStorage.setItem(migratedKey, "1")
}

export async function markAsRead(id: string, userId?: string): Promise<void> {
  const current = await getLocalReadSet()
  const alreadyLocal = current.has(id)

  if (!alreadyLocal) {
    current.add(id)
    await saveLocalReadSet(current)
  }

  if (userId) {
    await supabase
      .from("read_progress")
      .upsert({ user_id: userId, article_id: id }, { onConflict: "user_id,article_id" })
  }
}

export async function getReadArticles(userId?: string): Promise<Set<string>> {
  const local = await getLocalReadSet()

  if (!userId) return local

  await migrateLocalToCloud(userId)

  const { data } = await supabase
    .from("read_progress")
    .select("article_id")
    .eq("user_id", userId)

  const remote = new Set((data ?? []).map((r: { article_id: string }) => r.article_id))

  // Merge: local may have articles not yet synced; remote is the source of truth for cloud users
  const merged = new Set([...local, ...remote])

  // Backfill any local-only articles into Supabase (covers race where markAsRead ran offline)
  const localOnly = [...local].filter((id) => !remote.has(id))
  if (localOnly.length > 0) {
    const rows = localOnly.map((articleId) => ({ user_id: userId, article_id: articleId }))
    supabase.from("read_progress").upsert(rows, { onConflict: "user_id,article_id" }).then(() => {})
  }

  return merged
}
