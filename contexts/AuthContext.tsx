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
  isAnonymous: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  isAnonymous: false,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        fetchProfile(session.user.id)
        setLoading(false)
      } else {
        // Give every guest a real UUID so quiz attempts are always persisted
        const { data } = await supabase.auth.signInAnonymously()
        if (data.user) {
          setUser(data.user)
          fetchProfile(data.user.id)
        }
        setLoading(false)
      }
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
    const redirectTo = "classicalchineselearnerapp://oauth"

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: { prompt: "select_account" },
      },
    })
    if (error) throw error
    if (!data.url) throw new Error("Failed to get Google sign-in URL")

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
      showInRecents: true,
    })

    if (result.type === "success") {
      const url = result.url
      const errorDesc = url.match(/[?&]error_description=([^&#]+)/)?.[1]
      const errorCode = url.match(/[?&]error=([^&#]+)/)?.[1]
      if (errorDesc ?? errorCode) {
        throw new Error(decodeURIComponent((errorDesc ?? errorCode)!.replace(/\+/g, " ")))
      }
      const code = url.match(/[?&]code=([^&#]+)/)?.[1]
      if (!code) throw new Error("No authorization code received from Google")

      const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
      if (sessionError) throw sessionError

      // Confirm the exchange actually established a real (non-anonymous) session.
      // exchangeCodeForSession can return no error yet leave an anonymous session in
      // place if the PKCE exchange silently fails — catching that here prevents the
      // "logged in" alert firing while the user is actually still anonymous.
      const { data: { session: confirmedSession } } = await supabase.auth.getSession()
      if (!confirmedSession?.user || confirmedSession.user.is_anonymous) {
        throw new Error('無法完成登入，請再試一次')
      }
    } else if (result.type !== "cancel" && result.type !== "dismiss") {
      throw new Error("Google sign-in failed")
    }
  }

  async function signInWithEmail(email: string) {
    const redirectTo = "classicalchineselearnerapp://oauth"

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    })

    if (error) throw error
    // Success: user will receive email with magic link
  }

  async function signOut() {
    await supabase.auth.signOut()
    // Restore a fresh anonymous session so the app always has a real UUID.
    // onAuthStateChange will fire with the new anonymous user and update state.
    const { data } = await supabase.auth.signInAnonymously()
    if (data.user) {
      fetchProfile(data.user.id)
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAnonymous: user?.is_anonymous ?? false, signInWithGoogle, signInWithEmail, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
