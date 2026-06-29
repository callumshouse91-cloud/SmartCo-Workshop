import { NextResponse } from "next/server";

export const runtime = "nodejs";

const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-6";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.5";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

type Provider = "claude" | "gemini" | "gpt";
type Source = { title?: string; url: string };
type AIResult = { text: string; error?: string; grounded?: boolean; sources?: Source[] };

function extractGptSources(d: Record<string, unknown>): Source[] {
  const urls = new Set<string>();
  const sources: Source[] = [];
  const add = (url?: string, title?: string) => {
    if (!url || urls.has(url)) return;
    urls.add(url);
    sources.push({ url, title });
  };
  for (const item of (d.output as Record<string, unknown>[]) || []) {
    if (item.type === "web_search_call") {
      for (const r of (item.results as Record<string, unknown>[]) || []) {
        add(r.url as string, r.title as string);
      }
    }
    if (item.type === "message") {
      for (const c of (item.content as Record<string, unknown>[]) || []) {
        if (c.type === "output_text" && typeof c.text === "string" && c.annotations) {
          for (const a of c.annotations as Record<string, unknown>[]) {
            add(a.url as string, a.title as string);
          }
        }
      }
    }
  }
  return sources;
}

function gptHadWebSearch(d: Record<string, unknown>) {
  return ((d.output as Record<string, unknown>[]) || []).some((i) => i.type === "web_search_call");
}

async function callClaude(system: string, content: string): Promise<AIResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { text: "", error: "claude key not set", grounded: false };
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
    return { text };
  } catch (e) {
    return { text: "", error: String(e), grounded: false };
  }
}

async function callGptPlain(system: string, content: string): Promise<AIResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { text: "", error: "gpt key not set", grounded: false };
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_completion_tokens: 1000,
      messages: [
        { role: "system", content: system },
        { role: "user", content },
      ],
    }),
  });
  if (!r.ok) {
    const body = await r.text();
    return { text: "", error: `gpt ${r.status}: ${body}`, grounded: false };
  }
  const d = await r.json();
  return { text: (d.choices?.[0]?.message?.content || "").trim(), grounded: false };
}

async function callGpt(system: string, content: string, search = false): Promise<AIResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { text: "", error: "gpt key not set", grounded: false };
  if (!search) {
    try {
      return await callGptPlain(system, content);
    } catch (e) {
      return { text: "", error: String(e), grounded: false };
    }
  }
  try {
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        instructions: system,
        input: content,
        tools: [{ type: "web_search" }],
      }),
    });
    if (!r.ok) {
      const errBody = await r.text();
      const fallback = await callGptPlain(system, content);
      return { ...fallback, grounded: false, error: fallback.error || `search unavailable (${r.status}): ${errBody}` };
    }
    const d = await r.json();
    const text = (d.output_text as string) || "";
    const sources = extractGptSources(d);
    const grounded = gptHadWebSearch(d) || sources.length > 0;
    if (!text.trim()) {
      const fallback = await callGptPlain(system, content);
      return { ...fallback, grounded: false };
    }
    return { text: text.trim(), grounded, sources };
  } catch (e) {
    try {
      const fallback = await callGptPlain(system, content);
      return { ...fallback, grounded: false, error: fallback.error || String(e) };
    } catch (err) {
      return { text: "", error: String(err), grounded: false };
    }
  }
}

function extractGeminiSources(d: Record<string, unknown>): Source[] {
  const meta = (d.candidates as Record<string, unknown>[])?.[0]?.groundingMetadata as Record<string, unknown> | undefined;
  if (!meta) return [];
  return ((meta.groundingChunks as Record<string, unknown>[]) || [])
    .filter((c) => (c.web as Record<string, unknown>)?.uri)
    .map((c) => {
      const web = c.web as Record<string, unknown>;
      return { url: web.uri as string, title: web.title as string | undefined };
    });
}

async function callGeminiPlain(system: string, content: string): Promise<AIResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { text: "", error: "gemini key not set", grounded: false };
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
    return { text: "", error: `gemini ${r.status}: ${body}`, grounded: false };
  }
  const d = await r.json();
  return { text: (d.candidates?.[0]?.content?.parts?.[0]?.text || "").trim(), grounded: false };
}

async function callGemini(system: string, content: string, search = false): Promise<AIResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { text: "", error: "gemini key not set", grounded: false };
  if (!search) {
    try {
      return await callGeminiPlain(system, content);
    } catch (e) {
      return { text: "", error: String(e), grounded: false };
    }
  }
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: content }] }],
          tools: [{ google_search: {} }],
        }),
      }
    );
    if (!r.ok) {
      const errBody = await r.text();
      const fallback = await callGeminiPlain(system, content);
      return { ...fallback, grounded: false, error: fallback.error || `search unavailable (${r.status}): ${errBody}` };
    }
    const d = await r.json();
    const text = (d.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
    const sources = extractGeminiSources(d);
    const meta = d.candidates?.[0]?.groundingMetadata;
    const grounded = sources.length > 0 || !!(meta?.webSearchQueries?.length);
    if (!text) {
      const fallback = await callGeminiPlain(system, content);
      return { ...fallback, grounded: false };
    }
    return { text, grounded, sources };
  } catch (e) {
    try {
      const fallback = await callGeminiPlain(system, content);
      return { ...fallback, grounded: false, error: fallback.error || String(e) };
    } catch (err) {
      return { text: "", error: String(err), grounded: false };
    }
  }
}

export async function POST(req: Request) {
  try {
    const { system, content, provider = "claude", search = false } = await req.json();
    const p = provider as Provider;
    let result: AIResult;
    if (p === "gpt") result = await callGpt(system, content, !!search);
    else if (p === "gemini") result = await callGemini(system, content, !!search);
    else result = await callClaude(system, content);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ text: "", error: String(e), grounded: false });
  }
}
