"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { C, THEMES, themeOf, SmartCoLogo, MUFGLogo, Corner, callAI, parseJSON } from "./brand";
import { DECK } from "./deck";

const CARD_W = 216;
const CARD_H = 104;
const STORE_KEY = "smartco-mufg-workshop";
const WORKSHOP_ID = "mufg-2026-06-30"; // one row per workshop; change per session
const display = "var(--font-outfit), system-ui, sans-serif";

const SEED = [
  { id: "c1", theme: "accelerate", text: "Status reporting takes ~8–10 hrs/week per PM", x: 80, y: 70, ai: false },
  { id: "c2", theme: "manual", text: "Governance pack assembled by hand each stage gate", x: 360, y: 230, ai: false },
  { id: "c3", theme: "quality", text: "No single view of delivery health across the portfolio", x: 660, y: 110, ai: false },
];

let nid = 100;
const newId = () => `c${++nid}`;

export default function WorkshopBoard() {
  const [mode, setMode] = useState<"intro" | "board">("intro");
  return (
    <div style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", color: C.navy, height: "100vh", width: "100%", overflow: "hidden", background: C.white }}>
      {mode === "intro" ? <Intro onEnter={() => setMode("board")} /> : <Board onBack={() => setMode("intro")} />}
    </div>
  );
}

function Intro({ onEnter }: { onEnter: () => void }) {
  const [i, setI] = useState(0);
  const last = i === DECK.length - 1;
  const s = DECK[i];
  return (
    <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", background: `linear-gradient(160deg, ${C.white} 0%, ${C.surface} 100%)`, padding: "28px 40px", overflow: "hidden" }}>
      <Corner />
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 2 }}>
        <SmartCoLogo />
        <MUFGLogo />
      </header>

      {s.image ? (
        <div key={i} className="enter-up" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
          <img src={s.image} alt={`Slide ${i + 1}`} style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 12, boxShadow: "0 18px 50px rgba(10,22,40,.14)" }} />
        </div>
      ) : (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 760, zIndex: 2 }} className="enter-up">
          <div style={{ textTransform: "uppercase", letterSpacing: 3, fontSize: 12, fontWeight: 700, color: C.blue, marginBottom: 14 }}>{s.eyebrow}</div>
          <h1 style={{ fontFamily: display, fontSize: 56, lineHeight: 1.04, margin: 0, fontWeight: 800, letterSpacing: -1.5 }}>{s.title}</h1>
          <p style={{ fontSize: 20, lineHeight: 1.5, color: "#3A4358", marginTop: 18, maxWidth: 620 }}>{s.body}</p>
          {s.chips && (
            <div style={{ display: "flex", gap: 12, marginTop: 26, flexWrap: "wrap" }}>
              {s.chips.map((c, k) => (
                <span key={c.id} className="enter-up" style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "9px 16px", borderRadius: 999, border: `1.5px solid ${c.color}`, background: C.white, fontWeight: 600, fontSize: 14, animationDelay: `${0.15 + k * 0.1}s` }}>
                  <span style={{ width: 8, height: 8, borderRadius: 8, background: c.color }} /> {c.label}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {last && (
        <div style={{ position: "absolute", right: 40, bottom: 90, zIndex: 3 }}>
          <button className="enter-up" style={btn.primary} onClick={onEnter}>{s.cta || "Enter workshop board"} →</button>
        </div>
      )}

      <footer style={{ display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 2 }}>
        <button style={btn.ghost} onClick={() => setI((v) => Math.max(0, v - 1))} disabled={i === 0}>Back</button>
        <div style={{ display: "flex", gap: 8 }}>
          {DECK.map((_, k) => <span key={k} style={{ width: 8, height: 8, borderRadius: 8, background: k === i ? C.blue : C.border }} />)}
        </div>
        {!last ? <button style={btn.ghost} onClick={() => setI((v) => Math.min(DECK.length - 1, v + 1))}>Next</button> : <span style={{ width: 64 }} />}
      </footer>
    </div>
  );
}

function Board({ onBack }: { onBack: () => void }) {
  const [cards, setCards] = useState<any[]>(SEED);
  const [links, setLinks] = useState<any[]>([]);
  const [insight, setInsight] = useState("");
  const [text, setText] = useState("");
  const [theme, setTheme] = useState("accelerate");
  const [busy, setBusy] = useState({ review: false, links: false, ideas: false });
  const [showPack, setShowPack] = useState(false);
  const [drag, setDrag] = useState<any>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);

  useEffect(() => {
    (async () => {
      const apply = (v: any) => {
        if (v?.cards?.length) setCards(v.cards);
        if (v?.links) setLinks(v.links);
        if (typeof v?.insight === "string") setInsight(v.insight);
      };
      let restored = false;
      try {
        const res = await fetch(`/api/session?id=${WORKSHOP_ID}`);
        const json = await res.json();
        if (json?.data) { apply(json.data); restored = true; }
      } catch {}
      if (!restored) {
        try {
          const raw = localStorage.getItem(STORE_KEY);
          if (raw) apply(JSON.parse(raw));
        } catch {}
      }
      loaded.current = true;
    })();
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    const payload = { cards, links, insight };
    try { localStorage.setItem(STORE_KEY, JSON.stringify(payload)); } catch {}
    const t = setTimeout(() => {
      fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: WORKSHOP_ID, data: payload }),
      }).catch(() => {});
    }, 600);
    return () => clearTimeout(t);
  }, [cards, links, insight]);

  useEffect(() => {
    if (!cards.length) return;
    const t = setTimeout(() => runReview(), 1600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards]);

  const addCard = useCallback((t: string, th: string, ai = false) => {
    const txt = (t || "").trim();
    if (!txt) return;
    const reg = THEMES.findIndex((x) => x.id === th);
    const x = 90 + reg * 250 + Math.random() * 60;
    const y = 320 + Math.random() * 140;
    setCards((c) => [...c, { id: newId(), theme: th, text: txt, x, y, ai }]);
  }, []);

  const submit = () => { addCard(text, theme); setText(""); };
  const removeCard = (id: string) => {
    setCards((c) => c.filter((x) => x.id !== id));
    setLinks((l) => l.filter((x) => x.a !== id && x.b !== id));
  };

  const onDown = (e: any, id: string) => {
    const c = cards.find((x) => x.id === id);
    const rect = canvasRef.current!.getBoundingClientRect();
    setDrag({ id, dx: e.clientX - rect.left - c.x, dy: e.clientY - rect.top - c.y });
    e.target.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: any) => {
    if (!drag) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = Math.max(0, e.clientX - rect.left - drag.dx);
    const y = Math.max(0, e.clientY - rect.top - drag.dy);
    setCards((c) => c.map((x0) => (x0.id === drag.id ? { ...x0, x, y } : x0)));
  };
  const onUp = () => setDrag(null);

  const arrange = () => {
    setCards((c) => c.map((card) => {
      const reg = THEMES.findIndex((t) => t.id === card.theme);
      const same = c.filter((k) => k.theme === card.theme);
      const row = same.indexOf(card);
      return { ...card, x: 70 + reg * 280, y: 80 + row * 122 };
    }));
  };

  async function runReview() {
    if (busy.review || !cards.length) return;
    setBusy((b) => ({ ...b, review: true }));
    const sys = "You are a senior delivery/PMO consultant observing a live MUFG discovery workshop. Given captured pain points across three themes, return 3 sharp insights as plain-text lines, each starting with '— '. Cover: the strongest emerging pattern, the single biggest AI opportunity, and one gap worth probing. No preamble, no headings.";
    const body = cards.map((c) => `[${themeOf(c.theme).label}] ${c.text}`).join("\n");
    const out = await callAI(sys, body);
    setInsight(out || "— AI review unavailable right now. Capture and save are still working normally.");
    setBusy((b) => ({ ...b, review: false }));
  }

  async function mapLinks() {
    if (busy.links || cards.length < 2) return;
    setBusy((b) => ({ ...b, links: true }));
    const sys = 'Return ONLY a JSON array, no prose. Identify pairs of related captured items. Each element: {"a": id, "b": id, "reason": "<=6 words"}. Use only the provided ids. Max 6 pairs.';
    const list = cards.map((c) => ({ id: c.id, text: c.text, theme: c.theme }));
    const out = await callAI(sys, JSON.stringify(list));
    const arr = parseJSON(out);
    if (Array.isArray(arr)) {
      const ids = new Set(cards.map((c) => c.id));
      setLinks(arr.filter((p: any) => ids.has(p.a) && ids.has(p.b) && p.a !== p.b));
    }
    setBusy((b) => ({ ...b, links: false }));
  }

  async function suggestIdeas() {
    if (busy.ideas) return;
    setBusy((b) => ({ ...b, ideas: true }));
    const sys = 'Return ONLY a JSON array of 3 objects, no prose. Each: {"theme": "accelerate"|"manual"|"quality", "text": "<concise AI/delivery use-case idea, <=12 words>"}. Base them on the captured pains.';
    const body = cards.map((c) => `[${c.theme}] ${c.text}`).join("\n");
    const out = await callAI(sys, body || "No cards yet — suggest generic delivery AI use cases.");
    const arr = parseJSON(out);
    if (Array.isArray(arr)) arr.slice(0, 3).forEach((it: any, k: number) => {
      const th = THEMES.some((t) => t.id === it.theme) ? it.theme : "accelerate";
      setTimeout(() => addCard(it.text, th, true), k * 220);
    });
    setBusy((b) => ({ ...b, ideas: false }));
  }

  const center = (c: any) => ({ x: c.x + CARD_W / 2, y: c.y + CARD_H / 2 });

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.surface, position: "relative" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "14px 20px", background: C.white, borderBottom: `1px solid ${C.border}`, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button style={btn.ghost} onClick={onBack}>← Deck</button>
          <SmartCoLogo scale={0.85} />
          <span style={{ color: C.border }}>×</span>
          <MUFGLogo scale={0.85} />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/tooling" style={{ ...btn.ghost, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Tooling map</Link>
          <button style={btn.ai(C.blue)} onClick={mapLinks} disabled={busy.links}>{busy.links ? "Mapping…" : "Map linkages with AI"}</button>
          <button style={btn.ai(C.mint)} onClick={suggestIdeas} disabled={busy.ideas}>{busy.ideas ? "Thinking…" : "Suggest use cases"}</button>
          <button style={btn.ai(C.navy)} onClick={arrange}>Arrange by theme</button>
          <button style={btn.primarySm} onClick={() => setShowPack(true)}>Takeaway pack</button>
        </div>
      </header>

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <div ref={canvasRef} style={{ position: "relative", flex: 1, overflow: "hidden", touchAction: "none" }} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}>
          <Corner />
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
            {links.map((l, k) => {
              const a = cards.find((c) => c.id === l.a), b = cards.find((c) => c.id === l.b);
              if (!a || !b) return null;
              const pa = center(a), pb = center(b), mx = (pa.x + pb.x) / 2;
              return (
                <g key={k}>
                  <path className="link-path" d={`M ${pa.x} ${pa.y} C ${mx} ${pa.y}, ${mx} ${pb.y}, ${pb.x} ${pb.y}`} fill="none" stroke={C.blue} strokeWidth="2" strokeOpacity="0.55" />
                  {l.reason && <text x={mx} y={(pa.y + pb.y) / 2 - 6} fill={C.navy} fontSize="11" textAnchor="middle">{l.reason}</text>}
                </g>
              );
            })}
          </svg>

          {cards.map((c) => {
            const t = themeOf(c.theme);
            return (
              <div key={c.id} style={{ position: "absolute", top: 0, left: 0, width: CARD_W, transform: `translate(${c.x}px, ${c.y}px)`, transition: drag?.id === c.id ? "none" : "transform .45s cubic-bezier(.2,.8,.2,1)", zIndex: drag?.id === c.id ? 20 : 5 }}>
                <div className="card-pop" style={{ width: CARD_W, minHeight: CARD_H, background: C.white, border: `1px solid ${C.border}`, borderTop: `4px solid ${t.color}`, borderRadius: 12, padding: "10px 12px", boxShadow: "0 6px 18px rgba(10,22,40,.08)", cursor: "grab", boxSizing: "border-box" }} onPointerDown={(e) => onDown(e, c.id)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <span style={{ color: C.white, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: t.color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120 }}>{t.label}</span>
                    {c.ai && <span style={tag.ai}>AI</span>}
                    <button style={{ marginLeft: "auto", border: "none", background: "transparent", color: "#9AA3B2", fontSize: 18, lineHeight: 1, cursor: "pointer" }} onPointerDown={(e) => e.stopPropagation()} onClick={() => removeCard(c.id)}>×</button>
                  </div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.35, color: C.navy }}>{c.text}</div>
                </div>
              </div>
            );
          })}

          <div style={{ position: "absolute", left: "50%", bottom: 20, transform: "translateX(-50%)", display: "flex", gap: 8, background: C.white, padding: 8, borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: "0 10px 30px rgba(10,22,40,.12)", width: "min(720px, 92%)" }}>
            <select value={theme} onChange={(e) => setTheme(e.target.value)} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "0 8px", fontSize: 13, color: C.navy, background: C.white }}>
              {THEMES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <input style={{ flex: 1, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, outline: "none" }} placeholder="Type a pain point or use case, then Enter" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
            <button style={btn.primarySm} onClick={submit}>Add</button>
          </div>
        </div>

        <aside style={{ width: 300, background: C.white, borderLeft: `1px solid ${C.border}`, padding: 18, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, color: C.navy, fontFamily: display }}>AI insight</span>
            <span style={{ color: C.navy, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: busy.review ? C.yellow : C.mint }}>{busy.review ? "reviewing…" : "live"}</span>
          </div>
          <div style={{ marginTop: 14, flex: 1, overflow: "auto" }}>
            {insight ? insight.split("\n").filter(Boolean).map((line, k) => (
              <p key={k} style={{ fontSize: 14, lineHeight: 1.5, color: C.navy, margin: "0 0 10px", paddingLeft: 10, borderLeft: `2px solid ${C.mint}` }}>{line}</p>
            )) : <p style={{ color: "#7A8499", fontSize: 13 }}>Insights appear here as the room fills the board.</p>}
          </div>
          <button style={{ ...btn.ghost, marginTop: 12 }} onClick={runReview} disabled={busy.review}>Refresh review</button>
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 8 }}>
            {THEMES.map((t) => <span key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#3A4358" }}><span style={{ width: 10, height: 10, borderRadius: 2, background: t.color }} /> {t.label}</span>)}
          </div>
        </aside>
      </div>

      {showPack && <Pack cards={cards} insight={insight} onClose={() => setShowPack(false)} />}
      <div style={{ position: "absolute", left: 16, bottom: 6, fontSize: 11, color: "#9AA3B2" }}>Replace /public/logos and /public/deck with official assets.</div>
    </div>
  );
}

function Pack({ cards, insight, onClose }: any) {
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({ cards, insight }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "mufg-workshop-session.json"; a.click();
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,40,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }} onClick={onClose}>
      <div id="print-area" style={{ background: C.white, borderRadius: 16, padding: 30, width: "min(680px, 96%)", maxHeight: "88vh", overflow: "auto", boxShadow: "0 30px 80px rgba(10,22,40,.3)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><SmartCoLogo scale={0.9} /><MUFGLogo scale={0.9} /></div>
        <h2 style={{ fontFamily: display, color: C.navy, margin: "18px 0 4px", fontSize: 26 }}>Session takeaway</h2>
        <p style={{ color: "#7A8499", marginTop: 0 }}>AI &amp; Delivery Workshop — captured live</p>
        {THEMES.map((t) => {
          const items = cards.filter((c: any) => c.theme === t.id);
          if (!items.length) return null;
          return (
            <div key={t.id} style={{ marginTop: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: C.navy }}><span style={{ width: 12, height: 12, borderRadius: 3, background: t.color }} /> {t.label}</div>
              <ul style={{ margin: "8px 0 0", paddingLeft: 22 }}>{items.map((c: any) => <li key={c.id} style={{ color: C.navy, marginBottom: 4 }}>{c.text}{c.ai && <span style={{ ...tag.ai, marginLeft: 6 }}>AI</span>}</li>)}</ul>
            </div>
          );
        })}
        {insight && (
          <div style={{ marginTop: 22, padding: 16, background: C.surface, borderRadius: 10 }}>
            <div style={{ fontWeight: 700, color: C.navy, marginBottom: 6 }}>AI synthesis</div>
            {insight.split("\n").filter(Boolean).map((l: string, k: number) => <p key={k} style={{ margin: "2px 0", color: C.navy, fontSize: 14 }}>{l}</p>)}
          </div>
        )}
        <div className="no-print" style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button style={btn.primarySm} onClick={() => window.print()}>Print / save as PDF</button>
          <button style={btn.ghost} onClick={exportJSON}>Export JSON</button>
          <button style={btn.ghost} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

const btn = {
  primary: { background: C.blue, color: C.white, border: "none", padding: "15px 28px", borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: "pointer", boxShadow: "0 10px 24px rgba(0,101,252,.28)", fontFamily: display } as React.CSSProperties,
  primarySm: { background: C.blue, color: C.white, border: "none", padding: "9px 16px", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" } as React.CSSProperties,
  ghost: { background: C.white, color: C.navy, border: `1px solid ${C.border}`, padding: "9px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer" } as React.CSSProperties,
  ai: (col: string) => ({ background: C.white, color: C.navy, border: `1.5px solid ${col}`, padding: "9px 14px", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" } as React.CSSProperties),
};
const tag = { ai: { background: C.yellow, color: C.navy, fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 5 } as React.CSSProperties };
