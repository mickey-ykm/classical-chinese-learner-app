const express = require("express")
const bcrypt = require("bcryptjs")
const { supabase, requireSupabase } = require("../lib/supabase")

const router = express.Router()

router.get("/me", (req, res) => {
  if (!req.session.adminId) return res.status(401).json({ error: "Unauthorized" })
  res.json({ email: req.session.adminEmail })
})

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: "Email and password required" })
  if (!requireSupabase(res)) return
  try {
    const { data, error } = await supabase
      .from("admin_users")
      .select("id, email, password_hash")
      .eq("email", email)
      .single()
    if (error || !data) return res.status(401).json({ error: "Invalid credentials" })
    const valid = await bcrypt.compare(password, data.password_hash)
    if (!valid) return res.status(401).json({ error: "Invalid credentials" })
    req.session.adminId = data.id
    req.session.adminEmail = data.email
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }))
})

module.exports = router
