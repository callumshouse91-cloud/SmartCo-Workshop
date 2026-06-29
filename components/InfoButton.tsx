"use client";
import React, { useEffect, useId, useRef, useState } from "react";
import { C } from "@/components/brand";
import type { PromptPayload } from "@/lib/prompts";

function PromptBlock({ system, content }: PromptPayload) {
  const pre: React.CSSProperties = {
    margin: 0,
    padding: "8px 10px",
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    fontSize: 11,
    lineHeight: 1.45,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    color: C.navy,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    maxHeight: 140,
    overflow: "auto",
  };
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 4 }}>What we send the AI</div>
      <p style={{ fontSize: 11, color: C.body, margin: "0 0 8px", lineHeight: 1.4 }}>
        This is the exact prompt sent to the model.
      </p>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#7A8499", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.4 }}>
        System
      </div>
      <pre style={pre}>{system}</pre>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#7A8499", margin: "8px 0 4px", textTransform: "uppercase", letterSpacing: 0.4 }}>
        Content
      </div>
      <pre style={pre}>{content}</pre>
    </div>
  );
}

export type InfoButtonProps = {
  title?: string;
  description: string;
  prompt?: PromptPayload | (() => PromptPayload);
  note?: string;
  align?: "left" | "right";
};

export function InfoButton({ title, description, prompt, note, align = "left" }: InfoButtonProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const resolvedPrompt = prompt ? (typeof prompt === "function" ? prompt() : prompt) : undefined;

  return (
    <div ref={rootRef} style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
      <button
        type="button"
        aria-label={title ? `About ${title}` : "More information"}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          border: `1px solid ${C.border}`,
          background: open ? C.white : C.surface,
          color: "#7A8499",
          fontSize: 11,
          fontWeight: 700,
          cursor: "pointer",
          padding: 0,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ⓘ
      </button>
      {open && (
        <div
          id={panelId}
          role="dialog"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            ...(align === "right" ? { right: 0 } : { left: 0 }),
            width: "min(340px, calc(100vw - 32px))",
            maxHeight: "min(70vh, 420px)",
            overflowY: "auto",
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "12px 14px",
            boxShadow: "0 8px 28px rgba(10,22,40,.14)",
            zIndex: 200,
          }}
        >
          {title && (
            <div style={{ fontSize: 13, fontWeight: 800, color: C.navy, marginBottom: 6, fontFamily: "var(--font-outfit), system-ui, sans-serif" }}>
              {title}
            </div>
          )}
          <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
            What this does
          </div>
          <p style={{ fontSize: 12, color: C.body, margin: 0, lineHeight: 1.5 }}>{description}</p>
          {note && (
            <p style={{ fontSize: 11, color: C.body, margin: "8px 0 0", lineHeight: 1.45, fontStyle: "italic" }}>{note}</p>
          )}
          {resolvedPrompt && <PromptBlock {...resolvedPrompt} />}
        </div>
      )}
    </div>
  );
}
