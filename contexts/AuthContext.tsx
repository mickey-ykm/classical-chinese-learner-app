import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import * as WebBrowser from "expo-web-browser"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

interface Profile {
  is_pro: boolean
  display_name: string | null
  avatar_url: string | null
}

interface AuthContextValue {
  user: User | null
  profile: Profile | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("is_pro, display_name, avatar_url")
      .eq("id", userId)
      .single()
    if (data) setProfile(data as Profile)
  }

  async function signInWithGoogle() {
    const redirectTo = "classicalchineselearnerapp://"

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    })
    if (error) throw error
    if (!data.url) throw new Error("Failed to get Google sign-in URL")

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)

    if (result.type === "success") {
      const url = result.url
      const errorDesc = url.match(/[?&]error_description=([^&#]+)/)?.[1]
      const errorCode = url.match(/[?&]error=([^&#]+)/)?.[1]
      if (errorDesc ?? errorCode) {
        throw new Error(decodeURIComponent((errorDesc ?? errorCode)!.replace(/\+/g, " ")))
      }
      const code = url.match(/[?&]code=([^&#]+)/)?.[1]
      if (!code) throw new Error(`No auth code in callback: ${url}`)
      const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
      if (sessionError) throw sessionError
    } else if (result.type !== "cancel" && result.type !== "dismiss") {
      throw new Error("Google sign-in failed")
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
