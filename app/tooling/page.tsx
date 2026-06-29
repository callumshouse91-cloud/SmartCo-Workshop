"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { C, SmartCoLogo, MUFGLogo, Corner, callAI, callAIResult, parseJSON } from "@/components/brand";

const display = "var(--font-outfit), system-ui, sans-serif";
const SESSION_ID = "tooling-landscape";
const STORE_KEY = "smartco-tooling-landscape";

type ToolScope = "Platform" | "Firm-wide";
type ResearchModel = "gemini" | "gpt" | "both";

type Tool = {
  id: string;
  name: string;
  cat: string;
  scope: ToolScope;
  use: string;
  pain: string;
};

type Briefing = {
  aiCapabilities: string;
  mcpIntegrations: string;
  pricing: string;
  marketChanges: string;
  grounded: boolean;
  sources: { title?: string; url: string }[];
  error?: string;
};

type ToolResearch = {
  expanded: boolean;
  loading: boolean;
  gemini?: Briefing;
  gpt?: Briefing;
};

let tid = 0;
const newToolId = () => `t${++tid}`;

const SEED_TOOLS: Tool[] = [
  { id: newToolId(), name: "Planview", cat: "PPM / portfolio", scope: "Platform", use: "Programme & portfolio management", pain: "Plans and status live here but don't flow into reporting" },
  { id: newToolId(), name: "Power BI", cat: "Reporting / BI", scope: "Platform", use: "Dashboards and status packs", pain: "Dashboards assembled and refreshed by hand" },
  { id: newToolId(), name: "Oracle", cat: "Finance / ERP", scope: "Platform", use: "Financials and actuals", pain: "Cost and actuals reconciled to plans manually" },
  { id: newToolId(), name: "Workday", cat: "People / HR", scope: "Platform", use: "Resourcing and joiners", pain: "Resourcing and new-joiner tracking sit apart from delivery" },
  { id: newToolId(), name: "GitHub Copilot", cat: "AI assistant", scope: "Firm-wide", use: "Requirements & traceability artefacts", pain: "Used ad hoc by individuals, not built into delivery" },
  { id: newToolId(), name: "AIQ", cat: "AI app-builder", scope: "Firm-wide", use: "Drafting project documentation", pain: "Home-grown; applied to docs with no standard pattern" },
];

const GAPS = [
  "No integration layer — the platforms don't talk to each other",
  "No work-management layer sitting over the tools",
  "No AI interrogating the delivery data across them",
  "Dashboards, status packs and governance produced manually over a 46-document set",
];

const RESEARCH_SYS =
  "You are a technology research analyst briefing a bank delivery team. Use web search when available for current 2025–2026 facts. " +
  "Return ONLY valid JSON (no markdown) with exactly these string keys: " +
  '"aiCapabilities" (AI features, roadmap, what is announced), "mcpIntegrations" (MCP support, APIs, integration ecosystem), ' +
  '"pricing" (licensing model and rough price bands), "marketChanges" (recent launches, acquisitions, competitive moves). ' +
  "Each value: 2–4 concise sentences. If uncertain, say so.";

const scopeColor = (s: string) => (s === "Firm-wide" ? C.mint : C.blue);

const btn = {
  primarySm: { background: C.blue, color: C.white, border: "none", padding: "9px 16px", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" } as React.CSSProperties,
  ghost: { background: C.white, color: C.navy, border: `1px solid ${C.border}`, padding: "9px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer" } as React.CSSProperties,
  ai: (col: string) => ({ background: C.white, color: C.navy, border: `1.5px solid ${col}`, padding: "8px 12px", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer" } as React.CSSProperties),
  danger: { background: C.white, color: C.coral, border: `1px solid ${C.border}`, padding: "6px 10px", borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: "pointer" } as React.CSSProperties,
};

function parseBriefing(result: { text: string; error?: string; grounded?: boolean; sources?: { title?: string; url: string }[] }): Briefing {
  const parsed = parseJSON(result.text);
  if (parsed && typeof parsed === "object") {
    return {
      aiCapabilities: String(parsed.aiCapabilities || ""),
      mcpIntegrations: String(parsed.mcpIntegrations || ""),
      pricing: String(parsed.pricing || ""),
      marketChanges: String(parsed.marketChanges || ""),
      grounded: !!result.grounded,
      sources: result.sources || [],
      error: result.error,
    };
  }
  return {
    aiCapabilities: result.text || result.error || "No briefing returned.",
    mcpIntegrations: "",
    pricing: "",
    marketChanges: "",
    grounded: !!result.grounded,
    sources: result.sources || [],
    error: result.error || (!result.text ? "Could not parse structured briefing." : undefined),
  };
}

function BriefingPanel({ briefing, label }: { briefing: Briefing; label: string }) {
  const sections = [
    { key: "AI capabilities", text: briefing.aiCapabilities },
    { key: "MCP / integrations", text: briefing.mcpIntegrations },
    { key: "Pricing", text: briefing.pricing },
    { key: "Market changes", text: briefing.marketChanges },
  ].filter((s) => s.text);

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 700, fontSize: 12, color: C.navy, marginBottom: 8, fontFamily: display }}>{label}</div>
      {!briefing.grounded && (
        <div style={{ fontSize: 11, color: C.coral, fontWeight: 600, marginBottom: 8, padding: "6px 10px", background: C.surface, borderRadius: 6, border: `1px solid ${C.border}` }}>
          Unverified — from model knowledge, not live search
        </div>
      )}
      {sections.map((s) => (
        <div key={s.key} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>{s.key}</div>
          <p style={{ fontSize: 13, lineHeight: 1.5, color: C.navy, margin: 0 }}>{s.text}</p>
        </div>
      ))}
      {briefing.sources.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#7A8499", marginBottom: 4 }}>Sources</div>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
            {briefing.sources.map((src) => (
              <li key={src.url} style={{ marginBottom: 3 }}>
                <a href={src.url} target="_blank" rel="noopener noreferrer" style={{ color: C.blue }}>{src.title || src.url}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ToolCard({
  tool, research, researchModel, onEdit, onDelete, onResearch, onToggleExpand,
}: {
  tool: Tool;
  research?: ToolResearch;
  researchModel: ResearchModel;
  onEdit: (tool: Tool) => void;
  onDelete: (id: string) => void;
  onResearch: (id: string) => void;
  onToggleExpand: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(tool);

  const saveEdit = () => {
    onEdit({ ...draft, name: draft.name.trim(), use: draft.use.trim() });
    setEditing(false);
  };

  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderTop: `4px solid ${scopeColor(tool.scope)}`, borderRadius: 12, padding: 18, boxShadow: "0 6px 18px rgba(10,22,40,.06)" }}>
      {editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Name" style={fieldStyle} />
          <input value={draft.cat} onChange={(e) => setDraft({ ...draft, cat: e.target.value })} placeholder="Category" style={fieldStyle} />
          <select value={draft.scope} onChange={(e) => setDraft({ ...draft, scope: e.target.value as ToolScope })} style={fieldStyle}>
            <option value="Platform">Platform</option>
            <option value="Firm-wide">Firm-wide</option>
          </select>
          <input value={draft.use} onChange={(e) => setDraft({ ...draft, use: e.target.value })} placeholder="What it's used for" style={fieldStyle} />
          <input value={draft.pain} onChange={(e) => setDraft({ ...draft, pain: e.target.value })} placeholder="Pain / gap (optional)" style={fieldStyle} />
          <div style={{ display: "flex", gap: 8 }}>
            <button style={btn.primarySm} onClick={saveEdit}>Save</button>
            <button style={btn.ghost} onClick={() => { setDraft(tool); setEditing(false); }}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontFamily: display, fontWeight: 800, fontSize: 18 }}>{tool.name}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.white, background: scopeColor(tool.scope), padding: "3px 9px", borderRadius: 999, flexShrink: 0 }}>{tool.scope}</span>
          </div>
          <div style={{ fontSize: 12, color: C.blue, fontWeight: 600, marginTop: 4 }}>{tool.cat}</div>
          <div style={{ fontSize: 14, color: C.navy, marginTop: 10 }}>{tool.use}</div>
          {tool.pain && (
            <div style={{ fontSize: 13, color: "#7A8499", marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${C.border}` }}>{tool.pain}</div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <button style={btn.ai(C.blue)} onClick={() => onResearch(tool.id)} disabled={research?.loading}>
              {research?.loading ? "Researching…" : "Research with AI"}
            </button>
            {(research?.gemini || research?.gpt) && (
              <button style={btn.ghost} onClick={() => onToggleExpand(tool.id)}>
                {research?.expanded ? "Hide briefing" : "Show briefing"}
              </button>
            )}
            <button style={btn.ghost} onClick={() => { setDraft(tool); setEditing(true); }}>Edit</button>
            <button style={btn.danger} onClick={() => onDelete(tool.id)}>Delete</button>
          </div>
          {research?.expanded && (research.gemini || research.gpt) && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
              <p style={{ fontSize: 11, color: "#7A8499", margin: "0 0 12px", fontStyle: "italic" }}>
                AI-generated research — verify before quoting to the client.
              </p>
              <div style={{ display: "flex", gap: 16, flexDirection: researchModel === "both" ? "row" : "column", flexWrap: "wrap" }}>
                {(researchModel === "gemini" || researchModel === "both") && research.gemini && (
                  <BriefingPanel briefing={research.gemini} label="Gemini" />
                )}
                {(researchModel === "gpt" || researchModel === "both") && research.gpt && (
                  <BriefingPanel briefing={research.gpt} label="GPT" />
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: "9px 12px",
  fontSize: 14,
  color: C.navy,
  background: C.white,
  outline: "none",
  width: "100%",
};

export default function ToolingPage() {
  const [tools, setTools] = useState<Tool[]>(SEED_TOOLS);
  const [ops, setOps] = useState<string[]>([]);
  const [loadingOps, setLoadingOps] = useState(false);
  const [researchModel, setResearchModel] = useState<ResearchModel>("gemini");
  const [research, setResearch] = useState<Record<string, ToolResearch>>({});
  const [showCompare, setShowCompare] = useState(false);
  const [compareTool, setCompareTool] = useState<Tool | null>(null);
  const loaded = useRef(false);

  const [form, setForm] = useState({ name: "", cat: "", scope: "Platform" as ToolScope, use: "" });

  useEffect(() => {
    (async () => {
      let restored = false;
      try {
        const res = await fetch(`/api/session?id=${SESSION_ID}`);
        const json = await res.json();
        if (json?.data?.tools?.length) {
          setTools(json.data.tools);
          restored = true;
        }
      } catch {}
      if (!restored) {
        try {
          const raw = localStorage.getItem(STORE_KEY);
          if (raw) {
            const data = JSON.parse(raw);
            if (data?.tools?.length) setTools(data.tools);
          }
        } catch {}
      }
      loaded.current = true;
    })();
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    const payload = { tools };
    try { localStorage.setItem(STORE_KEY, JSON.stringify(payload)); } catch {}
    const t = setTimeout(() => {
      fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: SESSION_ID, data: payload }),
      }).catch(() => {});
    }, 600);
    return () => clearTimeout(t);
  }, [tools]);

  const addTool = () => {
    const name = form.name.trim();
    const use = form.use.trim();
    if (!name || !use) return;
    setTools((t) => [...t, {
      id: newToolId(),
      name,
      cat: form.cat.trim() || "Uncategorised",
      scope: form.scope,
      use,
      pain: "",
    }]);
    setForm({ name: "", cat: "", scope: "Platform", use: "" });
  };

  const updateTool = (updated: Tool) => {
    setTools((t) => t.map((x) => (x.id === updated.id ? updated : x)));
  };

  const deleteTool = (id: string) => {
    if (!window.confirm("Remove this tool from the landscape?")) return;
    setTools((t) => t.filter((x) => x.id !== id));
    setResearch((r) => {
      const next = { ...r };
      delete next[id];
      return next;
    });
  };

  const researchPrompt = (tool: Tool) =>
    `Research the enterprise tool "${tool.name}" (${tool.cat}, ${tool.scope} scope). Used for: ${tool.use}.` +
    (tool.pain ? ` Known pain: ${tool.pain}.` : "");

  const runResearchForProvider = useCallback(async (tool: Tool, provider: "gemini" | "gpt") => {
    const result = await callAIResult(RESEARCH_SYS, researchPrompt(tool), provider, { search: true });
    return parseBriefing(result);
  }, []);

  const researchTool = async (toolId: string) => {
    const tool = tools.find((t) => t.id === toolId);
    if (!tool) return;

    if (researchModel === "both") {
      setCompareTool(tool);
      setShowCompare(true);
      setResearch((r) => ({ ...r, [toolId]: { ...r[toolId], loading: true, expanded: true } }));
      const [gemini, gpt] = await Promise.all([
        runResearchForProvider(tool, "gemini"),
        runResearchForProvider(tool, "gpt"),
      ]);
      setResearch((r) => ({
        ...r,
        [toolId]: { expanded: true, loading: false, gemini, gpt },
      }));
      return;
    }

    const provider = researchModel;
    setResearch((r) => ({ ...r, [toolId]: { ...r[toolId], loading: true, expanded: true } }));
    const briefing = await runResearchForProvider(tool, provider);
    setResearch((r) => ({
      ...r,
      [toolId]: {
        expanded: true,
        loading: false,
        ...(provider === "gemini" ? { gemini: briefing } : { gpt: briefing }),
      },
    }));
  };

  const toggleExpand = (toolId: string) => {
    setResearch((r) => ({
      ...r,
      [toolId]: { ...r[toolId], expanded: !r[toolId]?.expanded },
    }));
  };

  async function findOpportunities() {
    setLoadingOps(true);
    const sys =
      "You are a delivery-engineering consultant. Given a financial-services PMO's current tools and the gaps between them, return ONLY a JSON array of 4 strings. " +
      "Each string is a concrete opportunity to link or automate across these specific tools (name the tools), <=16 words, no preamble.";
    const body = `Tools:\n${tools.map((t) => `${t.name} (${t.scope}) — ${t.use}`).join("\n")}\n\nGaps:\n${GAPS.join("\n")}`;
    const out = await callAI(sys, body);
    try {
      const arr = JSON.parse(out.replace(/```json|```/g, "").trim());
      if (Array.isArray(arr)) setOps(arr.slice(0, 4));
    } catch {
      setOps(["AI linkage suggestions unavailable right now — try again."]);
    }
    setLoadingOps(false);
  }

  const compareResearch = compareTool ? research[compareTool.id] : undefined;

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

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>AI research model:</span>
          {(["gemini", "gpt", "both"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setResearchModel(m)}
              style={{
                ...btn.ghost,
                border: `1.5px solid ${researchModel === m ? C.navy : C.border}`,
                background: researchModel === m ? C.surface : C.white,
                textTransform: "capitalize",
              }}
            >{m === "both" ? "Both (compare)" : m}</button>
          ))}
        </div>

        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, marginTop: 20, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, alignItems: "end" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 600, color: "#7A8499" }}>
            Tool name
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Jira" style={fieldStyle} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 600, color: "#7A8499" }}>
            Category
            <input value={form.cat} onChange={(e) => setForm({ ...form, cat: e.target.value })} placeholder="e.g. Work management" style={fieldStyle} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 600, color: "#7A8499" }}>
            Scope
            <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value as ToolScope })} style={fieldStyle}>
              <option value="Platform">Platform</option>
              <option value="Firm-wide">Firm-wide</option>
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 600, color: "#7A8499", gridColumn: "span 2" }}>
            What it&apos;s used for
            <input value={form.use} onChange={(e) => setForm({ ...form, use: e.target.value })} placeholder="Primary use in delivery" style={fieldStyle} onKeyDown={(e) => e.key === "Enter" && addTool()} />
          </label>
          <button style={btn.primarySm} onClick={addTool}>Add tool</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16, marginTop: 28 }}>
          {tools.map((t) => (
            <ToolCard
              key={t.id}
              tool={t}
              research={research[t.id]}
              researchModel={researchModel}
              onEdit={updateTool}
              onDelete={deleteTool}
              onResearch={researchTool}
              onToggleExpand={toggleExpand}
            />
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
              <button onClick={findOpportunities} disabled={loadingOps} style={btn.primarySm}>
                {loadingOps ? "Thinking…" : "Generate"}
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
          Tool list persists automatically. Confirm against Nikolay&apos;s returned questionnaire and adjust in the room.
        </p>
      </main>

      {showCompare && compareTool && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,40,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }} onClick={() => setShowCompare(false)}>
          <div style={{ background: C.white, borderRadius: 16, padding: 30, width: "min(960px, 96%)", maxHeight: "88vh", overflow: "auto", boxShadow: "0 30px 80px rgba(10,22,40,.3)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h2 style={{ fontFamily: display, color: C.navy, margin: 0, fontSize: 22 }}>Researching {compareTool.name}</h2>
              <button style={btn.ghost} onClick={() => setShowCompare(false)}>Close</button>
            </div>
            <p style={{ fontSize: 11, color: "#7A8499", fontStyle: "italic", margin: "0 0 18px" }}>AI-generated research — verify before quoting to the client.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {(["gemini", "gpt"] as const).map((id) => {
                const col = id === "gemini" ? compareResearch?.gemini : compareResearch?.gpt;
                const borderCol = id === "gemini" ? C.mint : C.navy;
                return (
                  <div key={id} style={{ border: `1.5px solid ${borderCol}`, borderRadius: 12, padding: 14, background: C.surface, minHeight: 200 }}>
                    {compareResearch?.loading || !col ? (
                      <p style={{ color: "#7A8499", fontSize: 13, margin: 0 }}>Loading {id}…</p>
                    ) : (
                      <BriefingPanel briefing={col} label={id === "gemini" ? "Gemini" : "GPT"} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
