import { createClient } from "@supabase/supabase-js"
import * as SecureStore from "expo-secure-store"
import * as Crypto from "expo-crypto"

// Hermes (React Native) lacks WebCrypto; Supabase PKCE requires crypto.subtle for SHA-256
const g = global as unknown as Record<string, unknown>
if (!g.crypto || typeof g.crypto !== "object") g.crypto = {}
const gc = g.crypto as Record<string, unknown>
if (!gc.getRandomValues) gc.getRandomValues = Crypto.getRandomValues
if (!gc.subtle) {
  gc.subtle = {
    digest(algorithm: string | { name: string }, data: ArrayBuffer) {
      const name = (typeof algorithm === "string" ? algorithm : algorithm.name).toUpperCase()
      if (name !== "SHA-256") throw new Error(`Unsupported digest algorithm: ${name}`)
      return Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, data)
    },
  }
}

// SecureStore has a 2 KB per-item limit; JWT tokens can be larger, so chunk them.
const CHUNK_SIZE = 1800

const LargeSecureStore = {
  async getItem(key: string): Promise<string | null> {
    try {
      const countStr = await SecureStore.getItemAsync(`${key}.__count`)
      if (!countStr) {
        return await SecureStore.getItemAsync(key)
      }
      const count = parseInt(countStr, 10)
      const chunks = await Promise.all(
        Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(`${key}.${i}`))
      )
      if (chunks.some((c) => c === null)) return null
      return chunks.join("")
    } catch (e) {
      console.error(`[Storage] getItem ${key} failed:`, e)
      return null
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (value.length <= CHUNK_SIZE) {
        await SecureStore.setItemAsync(key, value)
        return
      }
      const chunks: string[] = []
      for (let i = 0; i < value.length; i += CHUNK_SIZE) {
        chunks.push(value.slice(i, i + CHUNK_SIZE))
      }
      await Promise.all(chunks.map((chunk, i) => SecureStore.setItemAsync(`${key}.${i}`, chunk)))
      await SecureStore.setItemAsync(`${key}.__count`, String(chunks.length))
      await SecureStore.deleteItemAsync(key)
    } catch (e) {
      console.error(`[Storage] setItem ${key} failed:`, e)
      throw e
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      const countStr = await SecureStore.getItemAsync(`${key}.__count`)
      if (countStr) {
        const count = parseInt(countStr, 10)
        await Promise.all(
          Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(`${key}.${i}`))
        )
        await SecureStore.deleteItemAsync(`${key}.__count`)
      }
      await SecureStore.deleteItemAsync(key)
    } catch (e) {
      console.error(`[Storage] removeItem ${key} failed:`, e)
      throw e
    }
  },
}

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: LargeSecureStore,
      flowType: "pkce",
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
)
