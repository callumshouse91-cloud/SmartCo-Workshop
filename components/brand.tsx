"use client";
import React, { useState } from "react";

export const C = {
  navy: "#0A1628", surface: "#F4F6FB", white: "#FFFFFF", border: "#E0E4EC",
  blue: "#0065FC", blueDark: "#0040A0", mint: "#43E6A2", yellow: "#E6D343",
  coral: "#E65C43", body: "#4B5563",
};

export const THEMES = [
  { id: "accelerate", label: "Accelerate delivery", color: C.blue },
  { id: "manual", label: "Reduce manual effort", color: C.mint },
  { id: "quality", label: "Quality & confidence", color: C.coral },
];
export const themeOf = (id: string) => THEMES.find((t) => t.id === id) || THEMES[0];

const display = "var(--font-outfit), system-ui, sans-serif";

// Logos render from /public/logos/*.svg. Replace those files with the official
// assets — same filename, no code change. Falls back to a typographic mark.
export function SmartCoLogo({ scale = 1 }: { scale?: number }) {
  const [err, setErr] = useState(false);
  if (!err)
    return <img src="/logos/smartco.svg" alt="SmartCo" style={{ height: 28 * scale, display: "block" }} onError={() => setErr(true)} />;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 * scale, fontFamily: display }}>
      <svg width={28 * scale} height={24 * scale} viewBox="0 0 30 26" aria-hidden>
        <polygon points="6,2 18,2 12,24 0,24" fill={C.blue} />
        <polygon points="16,2 28,2 22,24 10,24" fill={C.mint} opacity="0.9" />
      </svg>
      <span style={{ fontWeight: 800, fontSize: 19 * scale, letterSpacing: -0.5, color: C.navy }}>
        Smart<span style={{ color: C.blue }}>Co</span>
      </span>
    </div>
  );
}
export function MUFGLogo({ scale = 1 }: { scale?: number }) {
  const [err, setErr] = useState(false);
  if (!err)
    return <img src="/logos/mufg.svg" alt="MUFG" style={{ height: 26 * scale, display: "block" }} onError={() => setErr(true)} />;
  return (
    <span style={{ fontFamily: display, fontWeight: 800, fontSize: 19 * scale, letterSpacing: 1.5, color: C.navy, borderLeft: `3px solid ${C.coral}`, paddingLeft: 9 * scale }}>
      MUFG
    </span>
  );
}

export function Corner() {
  return (
    <svg style={{ position: "absolute", top: -20, right: -10, pointerEvents: "none" }} width="180" height="180" viewBox="0 0 180 180" aria-hidden>
      <polygon points="60,0 120,0 80,180 20,180" fill={C.blue} opacity="0.06" />
      <polygon points="120,0 180,0 140,180 80,180" fill={C.mint} opacity="0.08" />
    </svg>
  );
}

export type AIProvider = "claude" | "gemini" | "gpt";

export async function callAIResult(
  system: string,
  content: string,
  provider: AIProvider = "claude"
): Promise<{ text: string; error?: string }> {
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system, content, provider }),
    });
    const data = await res.json();
    return { text: (data.text || "").trim(), error: data.error };
  } catch (e) {
    return { text: "", error: String(e) };
  }
}

export async function callAI(system: string, content: string, provider: AIProvider = "claude"): Promise<string> {
  const { text } = await callAIResult(system, content, provider);
  return text;
}
export function parseJSON(text: string) {
  try { return JSON.parse(text.replace(/```json|```/g, "").trim()); } catch { return null; }
}
