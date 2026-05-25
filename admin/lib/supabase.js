const { createClient } = require("@supabase/supabase-js")
const session = require("express-session")

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

let supabase = null
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  })
} else {
  console.warn("  ⚠ Supabase not configured — set SUPABASE_SERVICE_ROLE_KEY in .env")
}

class SupabaseStore extends session.Store {
  get(sid, cb) {
    if (!supabase) return cb(null, null)
    supabase
      .from("admin_sessions")
      .select("sess, expires_at")
      .eq("sid", sid)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle()
      .then(({ data }) => cb(null, data ? data.sess : null))
      .catch(() => cb(null, null))
  }

  set(sid, session, cb) {
    if (!supabase) return cb()
    const maxAge = session.cookie?.maxAge ?? 7 * 24 * 60 * 60 * 1000
    const expires_at = new Date(Date.now() + maxAge).toISOString()
    supabase
      .from("admin_sessions")
      .upsert({ sid, sess: session, expires_at }, { onConflict: "sid" })
      .then(() => cb())
      .catch(() => cb())
  }

  destroy(sid, cb) {
    if (!supabase) return cb()
    supabase.from("admin_sessions").delete().eq("sid", sid)
      .then(() => cb())
      .catch(() => cb())
  }

  touch(sid, session, cb) {
    this.set(sid, session, cb)
  }
}

function requireSupabase(res) {
  if (!supabase) {
    res.status(503).json({ error: "Supabase not configured: SUPABASE_SERVICE_ROLE_KEY missing" })
    return false
  }
  return true
}

module.exports = { supabase, SupabaseStore, requireSupabase }
