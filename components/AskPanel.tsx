"use client";
import React, { useEffect, useRef, useState } from "react";
import { C, callAIResult, type AIProvider, type AISource } from "@/components/brand";
import { useAsk } from "@/components/AskContext";
import { useLoggedQuestions } from "@/components/LoggedQuestionsProvider";
import { InfoButton } from "@/components/InfoButton";
import { buildAskPrompt } from "@/lib/prompts";

const display = "var(--font-outfit), system-ui, sans-serif";

type AskModel = "claude" | "gemini" | "gpt";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  provider?: AskModel;
  grounded?: boolean;
  sources?: AISource[];
};

const MODEL_OPTIONS: { id: AskModel; label: string }[] = [
  { id: "claude", label: "Claude" },
  { id: "gemini", label: "Gemini · web enabled" },
  { id: "gpt", label: "GPT · web enabled" },
];

const btn = {
  primarySm: { background: C.blue, color: C.white, border: "none", padding: "9px 16px", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" } as React.CSSProperties,
  ghost: { background: C.white, color: C.navy, border: `1px solid ${C.border}`, padding: "9px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer" } as React.CSSProperties,
};

function needsVerifyNote(text: string): boolean {
  return /\b(pricing|price|cost|licen[cs]|roadmap|feature|mcp|integration|plan|tier|subscription|release|availability)\b/i.test(text);
}

function AnswerMeta({ msg }: { msg: ChatMessage }) {
  const isClaude = msg.provider === "claude";
  return (
    <>
      <div style={{
        fontSize: 11,
        fontWeight: 600,
        marginBottom: 8,
        padding: "5px 9px",
        borderRadius: 6,
        display: "inline-block",
        background: isClaude ? C.surface : msg.grounded ? "#E8F5EE" : C.surface,
        border: `1px solid ${isClaude ? C.border : msg.grounded ? C.mint : C.border}`,
        color: isClaude ? C.navy : msg.grounded ? "#1A6B45" : C.coral,
      }}>
        {isClaude
          ? "Claude — model knowledge only (no live web)"
          : msg.grounded
            ? "Live web search"
            : "UNVERIFIED — model knowledge only"}
      </div>
      {msg.sources && msg.sources.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.body, marginBottom: 4 }}>Sources</div>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
            {msg.sources.map((src) => (
              <li key={src.url} style={{ marginBottom: 3 }}>
                <a href={src.url} target="_blank" rel="noopener noreferrer" style={{ color: C.blue }}>
                  {src.title || src.url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {needsVerifyNote(msg.content) && (
        <p style={{ fontSize: 11, color: C.body, margin: "8px 0 0", lineHeight: 1.45 }}>
          Verify pricing, feature availability and roadmap claims against the cited source before quoting externally.
        </p>
      )}
    </>
  );
}

export function AskButton() {
  const { open, toggle } = useAsk();
  return (
    <button type="button" style={btn.ghost} onClick={toggle} aria-expanded={open} aria-controls="ask-panel">
      {open ? "Close Ask" : "Ask"}
    </button>
  );
}

export function AskPanel() {
  const { open, setOpen, pageContext } = useAsk();
  const { addQuestion } = useLoggedQuestions();
  const [model, setModel] = useState<AskModel>("claude");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [includeContext, setIncludeContext] = useState(false);
  const [logToast, setLogToast] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const logAsQuestion = (text: string) => {
    if (!addQuestion(text, "agent")) return;
    setLogToast(true);
    setTimeout(() => setLogToast(false), 2200);
  };

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = async () => {
    const question = input.trim();
    if (!question || loading) return;
    const userMsg: ChatMessage = { role: "user", content: question };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    const extra = includeContext && pageContext ? pageContext.getContext() : null;
    const { system, content } = buildAskPrompt(question, extra, messages);
    const search = model === "gemini" || model === "gpt";

    try {
      const result = await callAIResult(system, content, model as AIProvider, {
        search,
        timeoutMs: search ? 30000 : undefined,
      });
      const answer = result.text || result.error || "No response.";
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: answer,
          provider: model,
          grounded: result.grounded,
          sources: result.sources,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close Ask panel"
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10,22,40,.35)",
            border: "none",
            zIndex: 60,
            cursor: "pointer",
          }}
        />
      )}
      <aside
        id="ask-panel"
        role="dialog"
        aria-label="Ask assistant"
        aria-hidden={!open}
        className="ask-drawer"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100%",
          width: "min(420px, 100vw)",
          maxWidth: "100%",
          background: C.white,
          borderLeft: `1px solid ${C.border}`,
          boxShadow: open ? "-8px 0 32px rgba(10,22,40,.12)" : "none",
          zIndex: 70,
          display: "flex",
          flexDirection: "column",
          transform: open ? "translateX(0)" : "translateX(100%)",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h2 style={{ fontFamily: display, fontSize: 18, fontWeight: 800, margin: 0, color: C.navy }}>Ask</h2>
            <InfoButton
              title="Ask assistant"
              description={
                model === "claude"
                  ? "A general-purpose assistant for delivery and workshop questions. Claude is selected — answers use model knowledge only (no live web search)."
                  : `A general-purpose assistant for delivery and workshop questions. ${model === "gemini" ? "Gemini" : "GPT"} is selected — live web search is enabled when you send a message.`
              }
              note="Optional board or tooling context is appended when the include toggle is on. The last six messages are included for multi-turn chat."
              prompt={() => buildAskPrompt(
                input.trim() || "(your question)",
                includeContext && pageContext ? pageContext.getContext() : null,
                messages
              )}
            />
          </div>
          <button type="button" aria-label="Close" onClick={() => setOpen(false)} style={{ ...btn.ghost, padding: "6px 12px", fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.body, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Model
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as AskModel)}
            style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 10px", fontSize: 13, color: C.navy, background: C.white, fontWeight: 600 }}
          >
            {MODEL_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
          {pageContext && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 13, color: C.navy, cursor: "pointer" }}>
              <input type="checkbox" checked={includeContext} onChange={(e) => setIncludeContext(e.target.checked)} />
              {pageContext.label}
            </label>
          )}
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => setMessages([])}
              style={{ marginTop: 8, background: "none", border: "none", padding: 0, fontSize: 12, color: C.blue, fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
            >
              Clear chat
            </button>
          )}
        </div>

        <div ref={threadRef} style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12, background: C.surface, position: "relative" }}>
          {logToast && (
            <div
              role="status"
              style={{
                position: "sticky",
                top: 0,
                zIndex: 2,
                alignSelf: "center",
                background: C.navy,
                color: C.white,
                fontSize: 12,
                fontWeight: 700,
                padding: "8px 14px",
                borderRadius: 8,
                boxShadow: "0 4px 14px rgba(10,22,40,.15)",
              }}
            >
              Logged for Thursday review
            </div>
          )}
          {messages.length === 0 && !loading && (
            <p style={{ fontSize: 13, color: C.body, margin: 0, lineHeight: 1.5 }}>
              Ask anything about delivery, tooling, or the workshop. Choose Gemini or GPT for live web search.
            </p>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "92%",
                display: "flex",
                flexDirection: "column",
                alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                gap: 4,
              }}
            >
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: msg.role === "user" ? C.navy : C.white,
                  color: msg.role === "user" ? C.white : C.navy,
                  border: msg.role === "assistant" ? `1px solid ${C.border}` : "none",
                  fontSize: 14,
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {msg.content}
                {msg.role === "assistant" && <AnswerMeta msg={msg} />}
              </div>
              {msg.role === "user" && (
                <button
                  type="button"
                  onClick={() => logAsQuestion(msg.content)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: "2px 4px",
                    fontSize: 11,
                    fontWeight: 600,
                    color: C.blue,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Log as question
                </button>
              )}
            </div>
          ))}
          {loading && (
            <div style={{ fontSize: 13, color: C.body, padding: "8px 0" }}>Thinking…</div>
          )}
        </div>

        <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}`, flexShrink: 0, background: C.white }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask a question… (Enter to send)"
            rows={3}
            disabled={loading}
            style={{
              width: "100%",
              resize: "none",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: 14,
              color: C.navy,
              background: C.white,
              outline: "none",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
          <button type="button" style={{ ...btn.primarySm, marginTop: 8, width: "100%" }} onClick={send} disabled={loading || !input.trim()}>
            {loading ? "Sending…" : "Send"}
          </button>
        </div>
      </aside>
    </>
  );
}
