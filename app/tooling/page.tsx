"use client";
import React, { useState } from "react";
import Link from "next/link";
import { C, SmartCoLogo, MUFGLogo, Corner, callAI } from "@/components/brand";

const display = "var(--font-outfit), system-ui, sans-serif";

// Edit this list against Nikolay's returned questionnaire on Monday.
const TOOLS = [
  { name: "Planview", cat: "PPM / portfolio", scope: "Platform", use: "Programme & portfolio management", pain: "Plans and status live here but don’t flow into reporting" },
  { name: "Power BI", cat: "Reporting / BI", scope: "Platform", use: "Dashboards and status packs", pain: "Dashboards assembled and refreshed by hand" },
  { name: "Oracle", cat: "Finance / ERP", scope: "Platform", use: "Financials and actuals", pain: "Cost and actuals reconciled to plans manually" },
  { name: "Workday", cat: "People / HR", scope: "Platform", use: "Resourcing and joiners", pain: "Resourcing and new-joiner tracking sit apart from delivery" },
  { name: "GitHub Copilot", cat: "AI assistant", scope: "Firm-wide", use: "Requirements & traceability artefacts", pain: "Used ad hoc by individuals, not built into delivery" },
  { name: "AIQ", cat: "AI app-builder", scope: "Firm-wide", use: "Drafting project documentation", pain: "Home-grown; applied to docs with no standard pattern" },
];

const GAPS = [
  "No integration layer — the platforms don’t talk to each other",
  "No work-management layer sitting over the tools",
  "No AI interrogating the delivery data across them",
  "Dashboards, status packs and governance produced manually over a 46-document set",
];

const scopeColor = (s: string) => (s === "Firm-wide" ? C.mint : C.blue);

export default function ToolingPage() {
  const [ops, setOps] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function findOpportunities() {
    setLoading(true);
    const sys =
      "You are a delivery-engineering consultant. Given a financial-services PMO's current tools and the gaps between them, return ONLY a JSON array of 4 strings. " +
      "Each string is a concrete opportunity to link or automate across these specific tools (name the tools), <=16 words, no preamble.";
    const body = `Tools:\n${TOOLS.map((t) => `${t.name} (${t.scope}) — ${t.use}`).join("\n")}\n\nGaps:\n${GAPS.join("\n")}`;
    const out = await callAI(sys, body);
    try {
      const arr = JSON.parse(out.replace(/```json|```/g, "").trim());
      if (Array.isArray(arr)) setOps(arr.slice(0, 4));
    } catch {
      setOps(["AI linkage suggestions unavailable right now — try again."]);
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: C.surface, fontFamily: "var(--font-dm-sans), system-ui, sans-serif", color: C.navy, position: "relative", overflow: "hidden" }}>
      <Corner />
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 40px", background: C.white, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <SmartCoLogo scale={0.85} /><span style={{ color: C.border }}>×</span><MUFGLogo scale={0.85} />
        </div>
        <Link href="/" style={{ color: C.navy, textDecoration: "none", border: `1px solid ${C.border}`, padding: "9px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, background: C.white }}>← Board</Link>
      </header>

      <main style={{ maxWidth: 1040, margin: "0 auto", padding: "40px 24px 80px", position: "relative", zIndex: 2 }}>
        <div style={{ textTransform: "uppercase", letterSpacing: 3, fontSize: 12, fontWeight: 700, color: C.blue }}>Current state</div>
        <h1 style={{ fontFamily: display, fontSize: 42, fontWeight: 800, letterSpacing: -1, margin: "10px 0 8px" }}>Your delivery tooling landscape</h1>
        <p style={{ fontSize: 18, color: "#3A4358", maxWidth: 720, marginTop: 0 }}>
          The tools delivery runs on today — and where the manual effort sits between them. Firm-wide platforms in blue; firm-wide AI your team applies in mint.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16, marginTop: 28 }}>
          {TOOLS.map((t) => (
            <div key={t.name} style={{ background: C.white, border: `1px solid ${C.border}`, borderTop: `4px solid ${scopeColor(t.scope)}`, borderRadius: 12, padding: 18, boxShadow: "0 6px 18px rgba(10,22,40,.06)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: display, fontWeight: 800, fontSize: 18 }}>{t.name}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.white, background: scopeColor(t.scope), padding: "3px 9px", borderRadius: 999 }}>{t.scope}</span>
              </div>
              <div style={{ fontSize: 12, color: C.blue, fontWeight: 600, marginTop: 4 }}>{t.cat}</div>
              <div style={{ fontSize: 14, color: C.navy, marginTop: 10 }}>{t.use}</div>
              <div style={{ fontSize: 13, color: "#7A8499", marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${C.border}` }}>{t.pain}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 28 }}>
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 22 }}>
            <h2 style={{ fontFamily: display, fontSize: 18, margin: "0 0 12px" }}>The gap today</h2>
            {GAPS.map((g, k) => (
              <div key={k} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: 14, color: C.navy }}>
                <span style={{ color: C.coral, fontWeight: 800 }}>—</span> {g}
              </div>
            ))}
          </div>
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ fontFamily: display, fontSize: 18, margin: 0 }}>Where AI links these</h2>
              <button onClick={findOpportunities} disabled={loading} style={{ background: C.blue, color: C.white, border: "none", padding: "9px 16px", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                {loading ? "Thinking…" : "Generate"}
              </button>
            </div>
            {ops.length ? ops.map((o, k) => (
              <div key={k} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: 14, color: C.navy, paddingLeft: 4, borderLeft: `2px solid ${C.mint}` }}>
                <span style={{ paddingLeft: 6 }}>{o}</span>
              </div>
            )) : <p style={{ color: "#7A8499", fontSize: 13, margin: 0 }}>An AI + integration layer over these tools — generate live linkage opportunities for the room.</p>}
          </div>
        </div>

        <p style={{ fontSize: 12, color: "#9AA3B2", marginTop: 24 }}>
          Tool list seeded from the pre-workshop questionnaire — confirm and adjust against Nikolay’s returned answers. Edit in <code>app/tooling/page.tsx</code>.
        </p>
      </main>
    </div>
  );
}
