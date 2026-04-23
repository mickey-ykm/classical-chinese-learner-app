import AsyncStorage from "@react-native-async-storage/async-storage"

const STORAGE_KEY = "read_articles_v1"

async function getReadSet(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

export async function markAsRead(id: string): Promise<void> {
  const current = await getReadSet()
  if (current.has(id)) return
  current.add(id)
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...current]))
}

export async function getReadArticles(): Promise<Set<string>> {
  return getReadSet()
}
