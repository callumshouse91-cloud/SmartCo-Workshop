"use client";
import React, { useMemo, useState } from "react";
import Link from "next/link";
import { C, SmartCoLogo, MUFGLogo, Corner } from "@/components/brand";
import { AskButton } from "@/components/AskPanel";
import { useLoggedQuestions } from "@/components/LoggedQuestionsProvider";
import { QuestionsNavLink } from "@/components/QuestionsNavLink";
import { questionsToMarkdown, type LoggedQuestion } from "@/lib/loggedQuestions";

const display = "var(--font-outfit), system-ui, sans-serif";

type FilterKey = "all" | "open" | "answered";

const btn = {
  primarySm: { background: C.blue, color: C.white, border: "none", padding: "9px 16px", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" } as React.CSSProperties,
  ghost: { background: C.white, color: C.navy, border: `1px solid ${C.border}`, padding: "9px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer" } as React.CSSProperties,
  danger: { background: C.white, color: C.coral, border: `1px solid ${C.border}`, padding: "6px 10px", borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: "pointer" } as React.CSSProperties,
};

const fieldStyle: React.CSSProperties = {
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 14,
  color: C.navy,
  background: C.white,
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

function formatTime(ts: number) {
  try {
    return new Date(ts).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "";
  }
}

function QuestionRow({
  q,
  onUpdate,
  onDelete,
}: {
  q: LoggedQuestion;
  onUpdate: (id: string, patch: Partial<Pick<LoggedQuestion, "text" | "status" | "note">>) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(q.text);
  const [noteDraft, setNoteDraft] = useState(q.note ?? "");

  const saveText = () => {
    const t = draft.trim();
    if (t) onUpdate(q.id, { text: t });
    setEditing(false);
  };

  return (
    <li
      style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 10, justifyContent: "space-between" }}>
        <div style={{ flex: "1 1 240px", minWidth: 0 }}>
          {editing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                style={{ ...fieldStyle, resize: "vertical" }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" style={btn.primarySm} onClick={saveText}>Save</button>
                <button type="button" style={btn.ghost} onClick={() => { setDraft(q.text); setEditing(false); }}>Cancel</button>
              </div>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45, color: C.navy, fontWeight: 600 }}>{q.text}</p>
          )}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 9px",
              borderRadius: 999,
              background: q.status === "answered" ? C.mint : C.yellow,
              color: C.navy,
            }}
          >
            {q.status === "answered" ? "Answered" : "Open"}
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#7A8499" }}>{q.source}</span>
          <span style={{ fontSize: 11, color: "#9AA3B2" }}>{formatTime(q.createdAt)}</span>
        </div>
      </div>

      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 700, color: "#7A8499" }}>
        Answer note
        <input
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          onBlur={() => onUpdate(q.id, { note: noteDraft })}
          placeholder="Short answer or follow-up for Thursday…"
          style={fieldStyle}
        />
      </label>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button
          type="button"
          style={btn.ghost}
          onClick={() => onUpdate(q.id, { status: q.status === "open" ? "answered" : "open" })}
        >
          Mark {q.status === "open" ? "answered" : "open"}
        </button>
        {!editing && (
          <button type="button" style={btn.ghost} onClick={() => { setDraft(q.text); setEditing(true); }}>Edit</button>
        )}
        <button
          type="button"
          style={btn.danger}
          onClick={() => {
            if (window.confirm("Delete this logged question?")) onDelete(q.id);
          }}
        >
          Delete
        </button>
      </div>
    </li>
  );
}

export default function QuestionsPage() {
  const { questions, openCount, ready, addQuestion, updateQuestion, deleteQuestion } = useLoggedQuestions();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [draft, setDraft] = useState("");
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...questions].sort((a, b) => b.createdAt - a.createdAt),
    [questions],
  );

  const filtered = useMemo(() => {
    if (filter === "open") return sorted.filter((q) => q.status === "open");
    if (filter === "answered") return sorted.filter((q) => q.status === "answered");
    return sorted;
  }, [sorted, filter]);

  const addManual = () => {
    if (addQuestion(draft, "manual")) setDraft("");
  };

  const flash = (msg: string) => {
    setExportMsg(msg);
    setTimeout(() => setExportMsg(null), 2500);
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify({ questions: sorted }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logged-questions-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash("JSON downloaded");
  };

  const copyMarkdown = async () => {
    const md = questionsToMarkdown(sorted);
    try {
      await navigator.clipboard.writeText(md);
      flash("Markdown copied to clipboard");
    } catch {
      flash("Could not copy — try Export JSON instead");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.surface, fontFamily: "var(--font-dm-sans), system-ui, sans-serif", color: C.navy, position: "relative", overflow: "hidden" }}>
      <Corner />
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 40px", background: C.white, borderBottom: `1px solid ${C.border}`, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <SmartCoLogo scale={0.85} />
          <span style={{ color: C.border }}>×</span>
          <MUFGLogo scale={0.85} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <AskButton />
          <Link href="/tooling" style={{ ...btn.ghost, textDecoration: "none" }}>Tooling map</Link>
          <QuestionsNavLink />
          <Link href="/" style={{ ...btn.ghost, textDecoration: "none" }}>← Board</Link>
        </div>
      </header>

      <main style={{ maxWidth: 880, margin: "0 auto", padding: "40px 24px 80px", position: "relative", zIndex: 2 }}>
        <div style={{ textTransform: "uppercase", letterSpacing: 3, fontSize: 12, fontWeight: 700, color: C.blue }}>Parking lot</div>
        <h1 style={{ fontFamily: display, fontSize: 42, fontWeight: 800, letterSpacing: -1, margin: "10px 0 8px" }}>Logged questions</h1>
        <p style={{ fontSize: 17, color: "#3A4358", maxWidth: 640, marginTop: 0, lineHeight: 1.45 }}>
          Technical questions captured during the session, for review before Thursday.
        </p>

        <div
          style={{
            marginTop: 20,
            padding: "12px 16px",
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 12,
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontFamily: display, fontWeight: 800, fontSize: 18 }}>
            {openCount} open {openCount === 1 ? "question" : "questions"}
          </span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(["all", "open", "answered"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                style={{
                  ...btn.ghost,
                  textTransform: "capitalize",
                  border: `1.5px solid ${filter === f ? C.navy : C.border}`,
                  background: filter === f ? C.surface : C.white,
                  fontWeight: filter === f ? 700 : 600,
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <label style={{ fontSize: 12, fontWeight: 700, color: "#7A8499" }}>Add question</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addManual()}
              placeholder="Type a technical question to park for Thursday…"
              style={{ ...fieldStyle, flex: "1 1 200px" }}
            />
            <button type="button" style={btn.primarySm} onClick={addManual} disabled={!draft.trim()}>
              Add question
            </button>
          </div>
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" style={btn.ghost} onClick={downloadJson}>Export JSON</button>
          <button type="button" style={btn.ghost} onClick={() => void copyMarkdown()}>Copy markdown</button>
          {exportMsg && (
            <span style={{ fontSize: 13, fontWeight: 600, color: C.blue }} role="status">{exportMsg}</span>
          )}
        </div>

        {!ready ? (
          <p style={{ marginTop: 24, color: "#7A8499", fontSize: 14 }}>Loading…</p>
        ) : filtered.length === 0 ? (
          <p style={{ marginTop: 24, color: "#7A8499", fontSize: 14 }}>
            {filter === "all" ? "No questions logged yet. Add one above or log from the Ask panel." : `No ${filter} questions.`}
          </p>
        ) : (
          <ul style={{ listStyle: "none", margin: "20px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map((q) => (
              <QuestionRow key={q.id} q={q} onUpdate={updateQuestion} onDelete={deleteQuestion} />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
