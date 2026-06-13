-- Insert new quiz prompt template with question type labels
INSERT INTO quiz_prompts (id, name, description, prompt_template, default_model, created_at, updated_at)
VALUES (
  'multi-type-with-labels-260602',
  'Multi-Type Quiz with Question Type Labels (2026-06-02)',
  'Generates all 5 question types with pedagogical labels: 字詞解釋, 語句背誦, 語句翻譯, 修辭手法, 內容重點. Each question can have multiple labels.',
  '你作為香港中學中文教師，將上述文言文設計題目，按文章年級制定難度。

【題型說明】
本套題目須包含以下5種題型，每題須標明 type 與 format：
1. mc-single（單選題）：format="mc"，selectCount=1，options 為 A/B/C/D 四項，correctAnswer 為其中一個 key
2. mc-multi（多選題）：format="mc"，selectCount 為 2–5，options 為 A–H，correctAnswer 為逗號分隔的多個 key（如「A,C,E」），評分：全對才給分
3. true-false（是非題）：format="mc"，selectCount=1，options 僅有 A（正確）B（錯誤），correctAnswer 為 A 或 B
4. fill-blank（填充題）：format="fill-blank"，stem 中用「___」標示空格，correctAnswer 為接受答案（多個答案用「|」分隔，如「之|其」），無 options
5. sentence-order（重組句子）：format="sentence-order"，sequenceTokens 為打亂順序的詞語陣列，correctAnswer 為正確語序的詞語以逗號連接（如「天,下,為,公」）

【題目標籤】
每題須標註 questionTypes 陣列，從以下5種標籤中選擇（可多選）：
- "字詞解釋"：問題問及文言文中的單字或詞語的意思
- "語句背誦"：問題要求用戶憑記憶去背出文言文原文句子
- "語句翻譯"：問題要求用戶翻譯文言文句子
- "修辭手法"：問題問及文言文中修辭相關概念
- "內容重點"：問題問及文言文中的內容重點，如前因後果、理據、想法等等

例子：
- 「皆能有養」中的「養」意思是： → questionTypes: ["字詞解釋"]
- 試把「不敬，何以別乎！」譯為語體文： → questionTypes: ["語句翻譯"]
- 此句運用對比手法，突出君子心胸廣闊與小人經常局促不安的分別 → questionTypes: ["修辭手法", "內容重點"]
- 「君子義以為質，禮以行之，孫以出之，信以成之。」君子處事包含了哪些元素？ → questionTypes: ["內容重點"]

【出題數量】
初中篇章（level 1–3）：
第1部分：8條 mc-single 字詞釋義題（questionTypes: ["字詞解釋"]）
第2部分：4條 fill-blank 句子填充題（從原文抽取關鍵短語，questionTypes: ["語句背誦"]）
第3部分：3條 mc-multi 文意理解多選題（selectCount=2 或 3，questionTypes: ["內容重點"]）
第4部分：2條 true-false 是非題（questionTypes 視題目內容而定）
第5部分：2條 sentence-order 重組句子題（questionTypes: ["語句背誦"]）

高中篇章（level 4–7）：
第1部分：12條 mc-single 字詞釋義題（questionTypes: ["字詞解釋"]）
第2部分：6條 fill-blank 句子填充題（questionTypes: ["語句背誦"]）
第3部分：4條 mc-multi 文意理解多選題（selectCount=2 至 4，questionTypes: ["內容重點"]）
第4部分：3條 true-false 是非題（questionTypes 視題目內容而定）
第5部分：3條 sentence-order 重組句子題（questionTypes: ["語句背誦"]）

【JSON 格式】
只需回傳一個有效的 JSON 物件，不要包含 markdown、不要附加說明。
{
  "parts": [
    {
      "part": 1,
      "title": "第一部分：字詞釋義（單選題）",
      "pointsPerQuestion": 1,
      "questions": [
        {
          "id": 1, "part": 1, "points": 1,
          "type": "mc-single", "format": "mc", "selectCount": 1,
          "stem": "「詞語」在文中的意思是：",
          "options": [{"key":"A","text":"選項A"},{"key":"B","text":"選項B"},{"key":"C","text":"選項C"},{"key":"D","text":"選項D"}],
          "correctAnswer": "B",
          "explanation": "解釋為何B正確",
          "questionTypes": ["字詞解釋"]
        }
      ]
    },
    {
      "part": 2,
      "title": "第二部分：句子填充（填充題）",
      "pointsPerQuestion": 2,
      "questions": [
        {
          "id": 9, "part": 2, "points": 2,
          "type": "fill-blank", "format": "fill-blank", "selectCount": 1,
          "stem": "___以天下為己任。",
          "options": [],
          "correctAnswer": "范仲淹|仲淹",
          "explanation": "原文「范仲淹以天下為己任」",
          "questionTypes": ["語句背誦"]
        }
      ]
    },
    {
      "part": 3,
      "title": "第三部分：文意理解（多選題）",
      "pointsPerQuestion": 2,
      "questions": [
        {
          "id": 13, "part": 3, "points": 2,
          "type": "mc-multi", "format": "mc", "selectCount": 2,
          "stem": "以下哪兩項符合文章內容？",
          "options": [{"key":"A","text":"選項A"},{"key":"B","text":"選項B"},{"key":"C","text":"選項C"},{"key":"D","text":"選項D"}],
          "correctAnswer": "A,C",
          "explanation": "A與C均見於原文",
          "questionTypes": ["內容重點"]
        }
      ]
    },
    {
      "part": 4,
      "title": "第四部分：是非題",
      "pointsPerQuestion": 1,
      "questions": [
        {
          "id": 16, "part": 4, "points": 1,
          "type": "true-false", "format": "mc", "selectCount": 1,
          "stem": "根據文章，作者認為讀書的目的是為了做官。",
          "options": [{"key":"A","text":"正確"},{"key":"B","text":"錯誤"}],
          "correctAnswer": "B",
          "explanation": "作者強調讀書為修身，非為功名",
          "questionTypes": ["內容重點"]
        }
      ]
    },
    {
      "part": 5,
      "title": "第五部分：重組句子",
      "pointsPerQuestion": 2,
      "questions": [
        {
          "id": 18, "part": 5, "points": 2,
          "type": "sentence-order", "format": "sentence-order", "selectCount": 1,
          "stem": "將以下詞語重新排列，組成文中的句子：",
          "options": [],
          "sequenceTokens": ["公","下","天","為"],
          "correctAnswer": "天,下,為,公",
          "explanation": "原文為「天下為公」",
          "questionTypes": ["語句背誦"]
        }
      ]
    }
  ]
}',
  'qwen/qwen3.6-flash',
  NOW(),
  NOW()
);
