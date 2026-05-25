const fs = require("fs")
const path = require("path")
const { supabase } = require("./supabase")
const { nowIso } = require("./article-helpers")

const ASSESSMENT_CONFIG_FILE = path.join(__dirname, "..", "assessment-config.json")

const DEFAULT_ASSESSMENT_CONFIG = {
  models: [
    "deepseek/deepseek-v4-flash",
    "qwen/qwen3.5-plus-20260420",
    "qwen/qwen3.6-flash",
    "z-ai/glm-5",
  ],
  translationPrompt:
    "你是一位古典漢語（文言文）專家。將提供的文言文內容翻譯成白話文，請按文言字詞的意思翻譯(不要意譯)，你不能夠省略原有字詞來完成翻譯。請參考所附的注釋來理解詞彙。只需回傳一個有效的 JSON 物件，不要包含 markdown、不要附加說明。格式如下：{\"modernTranslation\": [\"段落一\", \"段落二\", ...]}。請將相關句子歸納成段落。",
  quizPrompt:
    "你作為香港中學中文教師，將上述文言文內容設計題目，要按照文章所示的教授年級來制定難度；同時，你要考慮我提供的文章特點設計題目。\n\n設計如下︰(初中5篇)\n第1部分︰10條字詞釋義題\n第2部分︰4條句子語譯題，如文章出現文言特殊句式，即「判斷句、被動句、倒裝句、疑問句」，請優先設題，最多設2題\n第3部分︰6條文意理解題，\n如敘事/遊記相關，可設計文章敘事次序、重點情節與人物形象、抒發情感等分析；\n如哲理/孟子/論語，應集中設計說明什麼道理、說明手法、論證手法的題目；\n如文章為詩詞，應設計1-2條關於詩詞格律的題目\n第4部分︰2條修辭相關題目\n\n設計如下︰(高中5篇)\n第1部分︰15條字詞釋義題\n第2部分︰6條句子語譯題，如文章出現文言特殊句式，即「判斷句、被動句、倒裝句、疑問句」，請優先設題，最多設2題\n第3部分︰8條文意理解題，\n如敘事/遊記相關，可設計文章敘事次序、重點情節、人物形象、抒發情感等分析；\n如哲理/孟子/論語，應集中設計說明什麼道理、說明手法、論證手法的題目；\n如文章為詩詞，應設計1-2條關於詩詞格律的題目(赤壁懷古要減至6題)\n第4部分︰2條修辭相關題目(赤壁懷古要加至4題)\n\n每題須包含4個選項(A/B/C/D)，一個正確答案及簡短解題，設計選項時，應有1個錯誤答案容易跟正確答案混淆。\n\n只需回傳一個有效的 JSON 物件，不要包含 markdown、不要附加說明。\nJSON 格式如下：\n{\n  \"parts\": [\n    {\n      \"part\": 1,\n      \"title\": \"第一部分：字詞釋義題\",\n      \"pointsPerQuestion\": 1,\n      \"questions\": [\n        {\n          \"id\": 1, \"part\": 1, \"points\": 1,\n          \"stem\": \"「詞語」在文中的意思是：\",\n          \"options\": [{\"key\":\"A\",\"text\":\"選項\"},{\"key\":\"B\",\"text\":\"選項\"},{\"key\":\"C\",\"text\":\"選項\"},{\"key\":\"D\",\"text\":\"選項\"}],\n          \"correctAnswer\": \"B\",\n          \"explanation\": \"解釋為何B正確\"\n        }\n      ]\n    },\n    {\"part\":2,\"title\":\"第二部分：句子語譯題\",\"pointsPerQuestion\":2,\"questions\":[...]},\n    {\"part\":3,\"title\":\"第三部分：文意理解題\",\"pointsPerQuestion\":3,\"questions\":[...]},\n    {\"part\":4,\"title\":\"第四部分：修辭相關題目\",\"pointsPerQuestion\":2,\"questions\":[...]}\n  ]\n}",
}

const PROMPT_DEFAULT_ID = "default"

function readQuizPrompts() {
  let cfg
  try {
    cfg = JSON.parse(fs.readFileSync(ASSESSMENT_CONFIG_FILE, "utf8"))
  } catch {
    cfg = { ...DEFAULT_ASSESSMENT_CONFIG }
  }
  if (!Array.isArray(cfg.quizPrompts)) {
    cfg.quizPrompts = [
      {
        id: PROMPT_DEFAULT_ID,
        name: "Default Quiz Prompt",
        description:
          "Original 4-part quiz: word meaning, sentence translation, comprehension, rhetoric",
        promptTemplate: cfg.quizPrompt || DEFAULT_ASSESSMENT_CONFIG.quizPrompt,
        defaultModel: (Array.isArray(cfg.models) && cfg.models[0]) || "qwen/qwen3.6-flash",
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
    ]
    fs.writeFileSync(ASSESSMENT_CONFIG_FILE, JSON.stringify(cfg, null, 2))
    console.log("  ✓ Seeded quizPrompts[] from legacy quizPrompt")
  }
  return cfg.quizPrompts
}

function writeQuizPrompts(prompts) {
  let cfg
  try {
    cfg = JSON.parse(fs.readFileSync(ASSESSMENT_CONFIG_FILE, "utf8"))
  } catch {
    cfg = { ...DEFAULT_ASSESSMENT_CONFIG }
  }
  cfg.quizPrompts = prompts
  fs.writeFileSync(ASSESSMENT_CONFIG_FILE, JSON.stringify(cfg, null, 2))
}

// Async Supabase-backed quiz prompts (with local file fallback)
// Requires quiz_prompts table: id text PK, name text, description text,
//   prompt_template text, default_model text, created_at timestamptz, updated_at timestamptz
async function readQuizPromptsAsync() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("quiz_prompts")
        .select("*")
        .order("created_at", { ascending: true })
      if (!error && data && data.length > 0) {
        return data.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description || "",
          promptTemplate: r.prompt_template,
          defaultModel: r.default_model || null,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }))
      }
    } catch (_) {
      // fall through to local file
    }
  }
  return readQuizPrompts()
}

async function writeQuizPromptsAsync(prompts) {
  writeQuizPrompts(prompts)
  if (supabase) {
    const rows = prompts.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description || "",
      prompt_template: p.promptTemplate,
      default_model: p.defaultModel || null,
      created_at: p.createdAt || nowIso(),
      updated_at: p.updatedAt || nowIso(),
    }))
    const { error } = await supabase.from("quiz_prompts").upsert(rows, { onConflict: "id" })
    if (error) throw new Error("Failed to save prompt to Supabase: " + error.message)
  }
}

async function deleteQuizPromptAsync(id) {
  writeQuizPrompts(readQuizPrompts().filter((p) => p.id !== id))
  if (supabase) {
    const { error } = await supabase.from("quiz_prompts").delete().eq("id", id)
    if (error) throw new Error("Failed to delete prompt from Supabase: " + error.message)
  }
}

function slugifyPromptId(name) {
  return (name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "prompt-" + Date.now().toString(36)
}

function validatePromptPayload(p) {
  const errs = []
  if (!p || typeof p !== "object") return ["Prompt must be a JSON object"]
  if (!p.name || typeof p.name !== "string" || !p.name.trim()) errs.push("Missing: name")
  if (!p.promptTemplate || typeof p.promptTemplate !== "string" || !p.promptTemplate.trim())
    errs.push("Missing: promptTemplate")
  return errs
}

module.exports = {
  ASSESSMENT_CONFIG_FILE,
  DEFAULT_ASSESSMENT_CONFIG,
  PROMPT_DEFAULT_ID,
  readQuizPrompts,
  writeQuizPrompts,
  readQuizPromptsAsync,
  writeQuizPromptsAsync,
  deleteQuizPromptAsync,
  slugifyPromptId,
  validatePromptPayload,
}
