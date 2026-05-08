import { createClient } from "@supabase/supabase-js"
import bcrypt from "bcryptjs"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.join(__dirname, "..", ".env") })

const [, , email, password] = process.argv
if (!email || !password) {
  console.error("Usage: npm run create-admin -- <email> <password>")
  process.exit(1)
}

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const hash = await bcrypt.hash(password, 12)
const { error } = await supabase
  .from("admin_users")
  .upsert({ email, password_hash: hash }, { onConflict: "email" })

if (error) {
  console.error("Failed:", error.message)
  process.exit(1)
}
console.log(`✓ Admin user created: ${email}`)
