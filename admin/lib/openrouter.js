const MODEL_PRICING = {
  "deepseek/deepseek-v4-flash":        { input: 0.14,  output: 0.28  },
  "deepseek/deepseek-v4-pro":          { input: 0.435, output: 0.87  },
  "qwen/qwen3.5-plus-20260420":        { input: 0.40,  output: 2.40  },
  "qwen/qwen3.5-plus":                 { input: 0.26,  output: 1.56  },
  "qwen/qwen3.5-flash":                { input: 0.065, output: 0.26  },
  "qwen/qwen3.6-flash":                { input: 0.25,  output: 1.50  },
  "qwen/qwen3.6-35b-a3b":             { input: 0.161, output: 0.965 },
  "z-ai/glm-5":                        { input: 0.60,  output: 2.08  },
  "z-ai/glm-5.1":                      { input: 1.05,  output: 3.50  },
  "z-ai/glm-5-turbo":                  { input: 1.20,  output: 4.00  },
}

function estimateCost(model, promptTokens, completionTokens) {
  const p = MODEL_PRICING[model]
  if (!p) return null
  return (promptTokens * p.input + completionTokens * p.output) / 1_000_000
}

async function callOpenRouter(model, messages, apiKey, retries = 4) {
  if ([...apiKey].some((c) => c.charCodeAt(0) > 127)) {
    throw new Error(
      "API key contains non-ASCII characters — please re-paste it from your OpenRouter dashboard"
    )
  }
  const PORT = process.env.PORT || 3001
  const t0 = Date.now()
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": `http://localhost:${PORT}`,
    },
    body: JSON.stringify({
      model,
      messages,
      response_format: { type: "json_object" },
      temperature: 0.3,
    }),
  })
  const latencyMs = Date.now() - t0
  if (res.status === 429 && retries > 0) {
    const retryAfter = res.headers.get("Retry-After")
    const attempt = 4 - retries
    const delay = retryAfter
      ? parseInt(retryAfter, 10) * 1000
      : Math.min(10_000 * Math.pow(2, attempt), 80_000)
    await new Promise((r) => setTimeout(r, delay))
    return callOpenRouter(model, messages, apiKey, retries - 1)
  }
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenRouter ${res.status}: ${text.slice(0, 300)}`)
  }
  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content || ""
  const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim()
  return {
    content: cleaned,
    promptTokens: data.usage?.prompt_tokens || 0,
    completionTokens: data.usage?.completion_tokens || 0,
    latencyMs,
  }
}

function normalizeOptions(opts) {
  if (Array.isArray(opts)) return opts
  if (opts && typeof opts === "object") {
    return Object.entries(opts).map(([key, text]) => ({ key, text: String(text) }))
  }
  return []
}

module.exports = { MODEL_PRICING, estimateCost, callOpenRouter, normalizeOptions }
