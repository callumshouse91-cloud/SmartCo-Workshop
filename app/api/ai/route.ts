import { NextResponse } from "next/server";

export const runtime = "nodejs";

const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-6";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.5";
const OPENAI_SEARCH_MODEL = process.env.OPENAI_SEARCH_MODEL || process.env.OPENAI_MODEL || "gpt-5.5";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

type Provider = "claude" | "gemini" | "gpt";
type Source = { title: string; url: string };
type AIResult = { text: string; grounded: boolean; sources: Source[]; error?: string };

function normalizeSources(sources: { title?: string; url?: string }[]): Source[] {
  const seen = new Set<string>();
  const out: Source[] = [];
  for (const s of sources) {
    const url = (s.url || "").trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ title: (s.title || url).trim(), url });
  }
  return out;
}

function extractOpenAIText(d: Record<string, unknown>): string {
  if (typeof d.output_text === "string" && d.output_text.trim()) return d.output_text.trim();
  for (const item of (d.output as Record<string, unknown>[]) || []) {
    if (item.type !== "message") continue;
    for (const c of (item.content as Record<string, unknown>[]) || []) {
      if (c.type === "output_text" && typeof c.text === "string" && c.text.trim()) {
        return c.text.trim();
      }
    }
  }
  return "";
}

function extractOpenAISources(d: Record<string, unknown>): Source[] {
  const raw: { title?: string; url?: string }[] = [];
  for (const item of (d.output as Record<string, unknown>[]) || []) {
    if (item.type !== "message") continue;
    for (const c of (item.content as Record<string, unknown>[]) || []) {
      if (c.type !== "output_text" || !Array.isArray(c.annotations)) continue;
      for (const a of c.annotations as Record<string, unknown>[]) {
        if (a.type === "url_citation" && a.url) {
          raw.push({ title: a.title as string | undefined, url: a.url as string });
        }
      }
    }
  }
  return normalizeSources(raw);
}

function openAIIsGrounded(d: Record<string, unknown>, sources: Source[]): boolean {
  const output = (d.output as Record<string, unknown>[]) || [];
  const completed = output.some(
    (i) => i.type === "web_search_call" && i.status === "completed"
  );
  return completed || sources.length > 0;
}

function extractGeminiText(d: Record<string, unknown>): string {
  const parts = ((d.candidates as Record<string, unknown>[])?.[0]?.content as Record<string, unknown>)?.parts as Record<string, unknown>[] | undefined;
  if (!parts?.length) return "";
  return parts.map((p) => (typeof p.text === "string" ? p.text : "")).join("").trim();
}

function extractGeminiSources(d: Record<string, unknown>): Source[] {
  const raw: { title?: string; url?: string }[] = [];
  const candidate = (d.candidates as Record<string, unknown>[])?.[0] as Record<string, unknown> | undefined;
  const meta = candidate?.groundingMetadata as Record<string, unknown> | undefined;
  if (meta?.groundingChunks) {
    for (const chunk of meta.groundingChunks as Record<string, unknown>[]) {
      const web = chunk.web as Record<string, unknown> | undefined;
      if (web?.uri) raw.push({ title: web.title as string | undefined, url: web.uri as string });
    }
  }
  const parts = (candidate?.content as Record<string, unknown>)?.parts as Record<string, unknown>[] | undefined;
  if (parts) {
    for (const p of parts) {
      if (!Array.isArray(p.annotations)) continue;
      for (const a of p.annotations as Record<string, unknown>[]) {
        const url = (a.url || a.uri) as string | undefined;
        if (url) raw.push({ title: a.title as string | undefined, url });
      }
    }
  }
  return normalizeSources(raw);
}

function geminiIsGrounded(d: Record<string, unknown>): boolean {
  const meta = ((d.candidates as Record<string, unknown>[])?.[0] as Record<string, unknown> | undefined)
    ?.groundingMetadata as Record<string, unknown> | undefined;
  if (!meta) return false;
  const queries = meta.webSearchQueries as unknown[] | undefined;
  if (queries?.length) return true;
  const chunks = meta.groundingChunks as Record<string, unknown>[] | undefined;
  return !!chunks?.some((c) => (c.web as Record<string, unknown> | undefined)?.uri);
}

function ok(result: AIResult): AIResult {
  return { text: result.text || "", grounded: !!result.grounded, sources: result.sources || [] };
}

async function callClaude(system: string, content: string, search: boolean): Promise<AIResult> {
  if (search) {
    const plain = await callClaudePlain(system, content);
    return ok({ ...plain, grounded: false, sources: [] });
  }
  return ok(await callClaudePlain(system, content));
}

async function callClaudePlain(system: string, content: string): Promise<AIResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { text: "", grounded: false, sources: [], error: "claude key not set" };
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 1000,
        system,
        messages: [{ role: "user", content }],
      }),
    });
    const d = await r.json();
    const text = (d.content || [])
      .filter((b: { type?: string }) => b.type === "text")
      .map((b: { text?: string }) => b.text)
      .join("\n")
      .trim();
    return { text, grounded: false, sources: [] };
  } catch (e) {
    console.error("[ai] claude error:", e);
    return { text: "", grounded: false, sources: [], error: String(e) };
  }
}

async function gptChatCompletion(messages: { role: string; content: string }[], tokenField: "max_tokens" | "max_completion_tokens") {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { ok: false as const, error: "gpt key not set" };
  const body: Record<string, unknown> = { model: OPENAI_MODEL, messages };
  body[tokenField] = 1000;
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const errBody = await r.text();
    if (tokenField === "max_tokens" && /max_completion_tokens/i.test(errBody)) {
      return gptChatCompletion(messages, "max_completion_tokens");
    }
    return { ok: false as const, error: `gpt ${r.status}: ${errBody}` };
  }
  const d = await r.json();
  return { ok: true as const, text: (d.choices?.[0]?.message?.content || "").trim() };
}

async function callGptPlain(system: string, content: string): Promise<AIResult> {
  const result = await gptChatCompletion(
    [{ role: "system", content: system }, { role: "user", content }],
    "max_tokens"
  );
  if (!result.ok) {
    console.error("[ai] gpt plain error:", result.error);
    return { text: "", grounded: false, sources: [], error: result.error };
  }
  return { text: result.text, grounded: false, sources: [] };
}

async function fetchOpenAIResponses(system: string, content: string, toolChoice: "required" | "auto") {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { ok: false as const, error: "gpt key not set" };
  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: OPENAI_SEARCH_MODEL,
      instructions: system,
      input: content,
      tools: [{ type: "web_search" }],
      tool_choice: toolChoice,
    }),
  });
  if (!r.ok) {
    const errBody = await r.text();
    return { ok: false as const, error: `gpt responses ${r.status}: ${errBody}` };
  }
  const d = await r.json();
  return { ok: true as const, data: d as Record<string, unknown> };
}

async function callGptSearch(system: string, content: string): Promise<AIResult> {
  let res = await fetchOpenAIResponses(system, content, "required");
  if (!res.ok) {
    console.error("[ai] gpt search required failed:", res.error);
    res = await fetchOpenAIResponses(system, content, "auto");
  }
  if (!res.ok) {
    console.error("[ai] gpt search auto failed:", res.error);
    const fallback = await callGptPlain(system, content);
    return ok({ ...fallback, grounded: false, sources: [] });
  }
  const text = extractOpenAIText(res.data);
  const sources = extractOpenAISources(res.data);
  const grounded = openAIIsGrounded(res.data, sources);
  if (!text) {
    const fallback = await callGptPlain(system, content);
    return ok({ ...fallback, grounded: false, sources: [] });
  }
  return ok({ text, grounded, sources });
}

async function callGpt(system: string, content: string, search: boolean): Promise<AIResult> {
  try {
    if (!search) return ok(await callGptPlain(system, content));
    return await callGptSearch(system, content);
  } catch (e) {
    console.error("[ai] gpt error:", e);
    const fallback = await callGptPlain(system, content);
    return ok({ ...fallback, grounded: false, sources: [], error: String(e) });
  }
}

async function callGeminiPlain(system: string, content: string): Promise<AIResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { text: "", grounded: false, sources: [], error: "gemini key not set" };
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: content }] }],
      }),
    }
  );
  if (!r.ok) {
    const body = await r.text();
    console.error("[ai] gemini plain error:", body);
    return { text: "", grounded: false, sources: [], error: `gemini ${r.status}: ${body}` };
  }
  const d = await r.json();
  return { text: extractGeminiText(d), grounded: false, sources: [] };
}

async function callGeminiSearch(system: string, content: string): Promise<AIResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { text: "", grounded: false, sources: [], error: "gemini key not set" };
  const combined = `${system}\n\n${content}`;
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: combined }] }],
        tools: [{ google_search: {} }],
      }),
    }
  );
  if (!r.ok) {
    const errBody = await r.text();
    console.error("[ai] gemini search error:", errBody);
    const fallback = await callGeminiPlain(system, content);
    return ok({ ...fallback, grounded: false, sources: [] });
  }
  const d = await r.json();
  const text = extractGeminiText(d);
  const sources = extractGeminiSources(d);
  const grounded = geminiIsGrounded(d);
  if (!text) {
    const fallback = await callGeminiPlain(system, content);
    return ok({ ...fallback, grounded: false, sources: [] });
  }
  return ok({ text, grounded, sources });
}

async function callGemini(system: string, content: string, search: boolean): Promise<AIResult> {
  try {
    if (!search) return ok(await callGeminiPlain(system, content));
    return await callGeminiSearch(system, content);
  } catch (e) {
    console.error("[ai] gemini error:", e);
    const fallback = await callGeminiPlain(system, content);
    return ok({ ...fallback, grounded: false, sources: [], error: String(e) });
  }
}

export async function POST(req: Request) {
  try {
    const { system, content, provider = "claude", search = false } = await req.json();
    const p = provider as Provider;
    let result: AIResult;
    if (p === "gpt") result = await callGpt(system, content, !!search);
    else if (p === "gemini") result = await callGemini(system, content, !!search);
    else result = await callClaude(system, content, !!search);
    const { error, ...rest } = ok(result);
    return NextResponse.json(error ? { ...rest, error } : rest);
  } catch (e) {
    console.error("[ai] route error:", e);
    return NextResponse.json({ text: "", grounded: false, sources: [], error: String(e) });
  }
}
