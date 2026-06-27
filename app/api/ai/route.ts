import { NextResponse } from "next/server";

export const runtime = "nodejs";

const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-6";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.5";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

type Provider = "claude" | "gemini" | "gpt";

async function callClaude(system: string, content: string) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { text: "", error: "claude key not set" };
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
    return { text: "", error: String(e) };
  }
}

async function callGpt(system: string, content: string) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { text: "", error: "gpt key not set" };
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        max_tokens: 1000,
        messages: [
          { role: "system", content: system },
          { role: "user", content },
        ],
      }),
    });
    const d = await r.json();
    const text = (d.choices?.[0]?.message?.content || "").trim();
    return { text };
  } catch (e) {
    return { text: "", error: String(e) };
  }
}

async function callGemini(system: string, content: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { text: "", error: "gemini key not set" };
  try {
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
    const d = await r.json();
    const text = (d.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
    return { text };
  } catch (e) {
    return { text: "", error: String(e) };
  }
}

export async function POST(req: Request) {
  try {
    const { system, content, provider = "claude" } = await req.json();
    const p = provider as Provider;
    let result: { text: string; error?: string };
    if (p === "gpt") result = await callGpt(system, content);
    else if (p === "gemini") result = await callGemini(system, content);
    else result = await callClaude(system, content);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ text: "", error: String(e) });
  }
}
