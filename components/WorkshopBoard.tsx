"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { C, THEMES, themeOf, SmartCoLogo, MUFGLogo, Corner, callAI, callAIResult, parseJSON, type AIProvider } from "./brand";
import { DECK } from "./deck";

const CARD_W = 216;
const CARD_H = 104;
const MIN_CARD_W = 140;
const MIN_CARD_H = 80;
const MAX_CARD_W = 520;
const MAX_CARD_H = 420;
const WORLD_W = 4000;
const WORLD_H = 3000;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2.5;
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

const cardW = (c: { w?: number }) => c.w ?? CARD_W;
const cardH = (c: { h?: number }) => c.h ?? CARD_H;
const cardAccent = (c: { color?: string; theme: string }) => c.color ?? themeOf(c.theme).color;
const cardFontSize = (c: { size?: number }) => c.size ?? 16;

const PALETTE = [
  { color: C.blue, label: "blue" },
  { color: C.mint, label: "mint" },
  { color: C.coral, label: "coral" },
  { color: C.yellow, label: "yellow" },
  { color: C.navy, label: "navy" },
  { color: C.white, label: "white" },
];

const AI_PROVIDERS: { id: AIProvider; label: string }[] = [
  { id: "claude", label: "Claude" },
  { id: "gemini", label: "Gemini" },
  { id: "gpt", label: "GPT" },
];

const findCardAtWorld = (cards: any[], wx: number, wy: number) =>
  cards.find((c) => wx >= c.x && wx <= c.x + cardW(c) && wy >= c.y && wy <= c.y + cardH(c));

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
  const [provider, setProvider] = useState<AIProvider>("claude");
  const [busy, setBusy] = useState({ review: false, links: false, ideas: false, compare: false });
  const [showPack, setShowPack] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [compareResults, setCompareResults] = useState<Record<AIProvider, { text: string; error?: string; loading?: boolean }> | null>(null);
  const [drag, setDrag] = useState<any>(null);
  const [resize, setResize] = useState<{ id: string; startWx: number; startWy: number; startW: number; startH: number } | null>(null);
  const [connecting, setConnecting] = useState<{ fromId: string } | null>(null);
  const [connectCursor, setConnectCursor] = useState<{ x: number; y: number } | null>(null);
  const [selectedLinkIdx, setSelectedLinkIdx] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panDrag, setPanDrag] = useState<{ sx: number; sy: number; spx: number; spy: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editOriginal, setEditOriginal] = useState("");
  const canvasRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);
  const zoomPanRef = useRef({ zoom: 1, panX: 0, panY: 0 });
  const loaded = useRef(false);

  zoomPanRef.current = { zoom, panX: pan.x, panY: pan.y };

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

  useEffect(() => {
    if (editingId && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [editingId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingId) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedLinkIdx !== null) {
        e.preventDefault();
        setLinks((l) => l.filter((_, i) => i !== selectedLinkIdx));
        setSelectedLinkIdx(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedLinkIdx, editingId]);

  const updateCard = useCallback((id: string, patch: Record<string, unknown>) => {
    setCards((c) => c.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }, []);

  const addCard = useCallback((t: string, th: string, ai = false, pos?: { x: number; y: number }, openEdit = false) => {
    const txt = (t || "").trim();
    if (!txt && !openEdit) return;
    const reg = THEMES.findIndex((x) => x.id === th);
    const x = pos?.x ?? 90 + reg * 250 + Math.random() * 60;
    const y = pos?.y ?? 320 + Math.random() * 140;
    const id = newId();
    setCards((c) => [...c, { id, theme: th, text: txt, x, y, ai }]);
    if (openEdit) {
      setEditingId(id);
      setEditText(txt);
      setEditOriginal(txt);
      setSelectedId(id);
    }
    return id;
  }, []);

  const submit = () => { addCard(text, theme); setText(""); };
  const removeCard = (id: string) => {
    setCards((c) => c.filter((x) => x.id !== id));
    setLinks((l) => l.filter((x) => x.a !== id && x.b !== id));
    if (selectedId === id) setSelectedId(null);
    if (editingId === id) { setEditingId(null); setEditText(""); }
  };

  const finishEdit = (id: string, draft: string) => {
    const trimmed = draft.trim();
    if (!trimmed) removeCard(id);
    else updateCard(id, { text: trimmed });
    setEditingId(null);
    setEditText("");
  };

  const cancelEdit = (id: string) => {
    if (!editOriginal.trim()) removeCard(id);
    setEditingId(null);
    setEditText("");
  };

  const startEdit = (c: { id: string; text: string }) => {
    setEditingId(c.id);
    setEditText(c.text);
    setEditOriginal(c.text);
    setSelectedId(c.id);
  };

  const duplicateCard = (id: string) => {
    const c = cards.find((x) => x.id === id);
    if (!c) return;
    const copy = { ...c, id: newId(), x: c.x + 24, y: c.y + 24 };
    setCards((prev) => [...prev, copy]);
    setSelectedId(copy.id);
  };

  const removeLink = (idx: number) => {
    setLinks((l) => l.filter((_, i) => i !== idx));
    setSelectedLinkIdx(null);
  };

  const toWorld = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const { zoom: z, panX, panY } = zoomPanRef.current;
    return {
      x: (clientX - rect.left - panX) / z,
      y: (clientY - rect.top - panY) / z,
    };
  }, []);

  const zoomAtPoint = useCallback((newZoom: number, mx: number, my: number) => {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom));
    const { zoom: z, panX, panY } = zoomPanRef.current;
    const wx = (mx - panX) / z;
    const wy = (my - panY) / z;
    setPan({ x: mx - wx * clamped, y: my - wy * clamped });
    setZoom(clamped);
  }, []);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = Math.pow(0.995, e.deltaY);
      zoomAtPoint(zoomPanRef.current.zoom * factor, mx, my);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAtPoint]);

  const onCanvasDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || editingId || connecting) return;
    const t = e.target as HTMLElement;
    if (t.closest("[data-board-ui]") || t.closest("[data-card]") || t.closest("[data-link-ui]")) return;
    setSelectedId(null);
    setSelectedLinkIdx(null);
    setPanDrag({ sx: e.clientX, sy: e.clientY, spx: zoomPanRef.current.panX, spy: zoomPanRef.current.panY });
    canvasRef.current?.setPointerCapture(e.pointerId);
  };

  const onCanvasDblClick = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest("[data-board-ui]") || t.closest("[data-card]")) return;
    const { x: wx, y: wy } = toWorld(e.clientX, e.clientY);
    addCard("", theme, false, { x: wx - CARD_W / 2, y: wy - CARD_H / 2 }, true);
  };

  const onDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    if (editingId) return;
    const t = e.target as HTMLElement;
    if (t.closest("[data-card-action]")) return;
    const c = cards.find((x) => x.id === id);
    if (!c) return;
    setSelectedId(id);
    const { x: wx, y: wy } = toWorld(e.clientX, e.clientY);
    setDrag({ id, dx: wx - c.x, dy: wy - c.y });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onResizeDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    const c = cards.find((x) => x.id === id);
    if (!c) return;
    const { x: wx, y: wy } = toWorld(e.clientX, e.clientY);
    setResize({ id, startWx: wx, startWy: wy, startW: cardW(c), startH: cardH(c) });
    setSelectedId(id);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onConnectDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    setConnecting({ fromId: id });
    setConnectCursor(toWorld(e.clientX, e.clientY));
    setSelectedLinkIdx(null);
    setSelectedId(id);
    canvasRef.current?.setPointerCapture(e.pointerId);
  };

  const onMove = (e: React.PointerEvent) => {
    if (connecting) {
      setConnectCursor(toWorld(e.clientX, e.clientY));
      return;
    }
    if (panDrag) {
      setPan({ x: panDrag.spx + e.clientX - panDrag.sx, y: panDrag.spy + e.clientY - panDrag.sy });
      return;
    }
    if (resize) {
      const { x: wx, y: wy } = toWorld(e.clientX, e.clientY);
      const w = Math.min(MAX_CARD_W, Math.max(MIN_CARD_W, resize.startW + wx - resize.startWx));
      const h = Math.min(MAX_CARD_H, Math.max(MIN_CARD_H, resize.startH + wy - resize.startWy));
      setCards((c) => c.map((x0) => (x0.id === resize.id ? { ...x0, w, h } : x0)));
      return;
    }
    if (!drag || editingId) return;
    const { x: wx, y: wy } = toWorld(e.clientX, e.clientY);
    const x = Math.max(0, wx - drag.dx);
    const y = Math.max(0, wy - drag.dy);
    setCards((c) => c.map((x0) => (x0.id === drag.id ? { ...x0, x, y } : x0)));
  };

  const onUp = (e?: React.PointerEvent) => {
    if (connecting && e) {
      const { x: wx, y: wy } = toWorld(e.clientX, e.clientY);
      const target = findCardAtWorld(cards, wx, wy);
      if (target && target.id !== connecting.fromId) {
        setLinks((l) => {
          const dup = l.some((link) =>
            (link.a === connecting.fromId && link.b === target.id) ||
            (link.a === target.id && link.b === connecting.fromId)
          );
          if (dup) return l;
          return [...l, { a: connecting.fromId, b: target.id, manual: true }];
        });
      }
      setConnecting(null);
      setConnectCursor(null);
    }
    setDrag(null);
    setPanDrag(null);
    setResize(null);
  };

  const zoomStep = (delta: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    zoomAtPoint(zoomPanRef.current.zoom + delta, rect.width / 2, rect.height / 2);
  };

  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const arrange = () => {
    setCards((c) => c.map((card) => {
      const reg = THEMES.findIndex((t) => t.id === card.theme);
      const same = c.filter((k) => k.theme === card.theme);
      const row = same.indexOf(card);
      return { ...card, x: 70 + reg * 280, y: 80 + row * 122 };
    }));
  };

  const reviewPrompt = () => {
    const sys = "You are a senior delivery/PMO consultant observing a live MUFG discovery workshop. Given captured pain points across three themes, return 3 sharp insights as plain-text lines, each starting with '— '. Cover: the strongest emerging pattern, the single biggest AI opportunity, and one gap worth probing. No preamble, no headings.";
    const body = cards.map((c) => `[${themeOf(c.theme).label}] ${c.text}`).join("\n");
    return { sys, body };
  };

  async function runReview() {
    if (busy.review || !cards.length) return;
    setBusy((b) => ({ ...b, review: true }));
    const { sys, body } = reviewPrompt();
    const out = await callAI(sys, body, provider);
    setInsight(out || "— AI review unavailable right now. Capture and save are still working normally.");
    setBusy((b) => ({ ...b, review: false }));
  }

  async function compareModels() {
    if (busy.compare || !cards.length) return;
    setShowCompare(true);
    setBusy((b) => ({ ...b, compare: true }));
    const loading = { text: "", loading: true };
    setCompareResults({ claude: { ...loading }, gemini: { ...loading }, gpt: { ...loading } });
    const { sys, body } = reviewPrompt();
    const results = await Promise.all(
      AI_PROVIDERS.map(async ({ id }) => {
        const { text, error } = await callAIResult(sys, body, id);
        return { id, text: text || (error ? `— ${error}` : "— No response"), error };
      })
    );
    const mapped = {} as Record<AIProvider, { text: string; error?: string; loading?: boolean }>;
    results.forEach((r) => { mapped[r.id] = { text: r.text, error: r.error, loading: false }; });
    setCompareResults(mapped);
    setBusy((b) => ({ ...b, compare: false }));
  }

  async function mapLinks() {
    if (busy.links || cards.length < 2) return;
    setBusy((b) => ({ ...b, links: true }));
    const sys = 'Return ONLY a JSON array, no prose. Identify pairs of related captured items. Each element: {"a": id, "b": id, "reason": "<=6 words"}. Use only the provided ids. Max 6 pairs.';
    const list = cards.map((c) => ({ id: c.id, text: c.text, theme: c.theme }));
    const out = await callAI(sys, JSON.stringify(list), provider);
    const arr = parseJSON(out);
    if (Array.isArray(arr)) {
      const ids = new Set(cards.map((c) => c.id));
      const aiLinks = arr.filter((p: any) => ids.has(p.a) && ids.has(p.b) && p.a !== p.b);
      setLinks((l) => [...l.filter((x) => x.manual), ...aiLinks]);
    }
    setBusy((b) => ({ ...b, links: false }));
  }

  async function suggestIdeas() {
    if (busy.ideas) return;
    setBusy((b) => ({ ...b, ideas: true }));
    const sys = 'Return ONLY a JSON array of 3 objects, no prose. Each: {"theme": "accelerate"|"manual"|"quality", "text": "<concise AI/delivery use-case idea, <=12 words>"}. Base them on the captured pains.';
    const body = cards.map((c) => `[${c.theme}] ${c.text}`).join("\n");
    const out = await callAI(sys, body || "No cards yet — suggest generic delivery AI use cases.", provider);
    const arr = parseJSON(out);
    if (Array.isArray(arr)) arr.slice(0, 3).forEach((it: any, k: number) => {
      const th = THEMES.some((t) => t.id === it.theme) ? it.theme : "accelerate";
      setTimeout(() => addCard(it.text, th, true), k * 220);
    });
    setBusy((b) => ({ ...b, ideas: false }));
  }

  const center = (c: any) => ({ x: c.x + cardW(c) / 2, y: c.y + cardH(c) / 2 });

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.surface, position: "relative" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "14px 20px", background: C.white, borderBottom: `1px solid ${C.border}`, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button style={btn.ghost} onClick={onBack}>← Deck</button>
          <SmartCoLogo scale={0.85} />
          <span style={{ color: C.border }}>×</span>
          <MUFGLogo scale={0.85} />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <select value={provider} onChange={(e) => setProvider(e.target.value as AIProvider)} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 10px", fontSize: 13, color: C.navy, background: C.white, fontWeight: 600 }}>
            {AI_PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <Link href="/tooling" style={{ ...btn.ghost, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Tooling map</Link>
          <button style={btn.ai(C.yellow)} onClick={compareModels} disabled={busy.compare || !cards.length}>{busy.compare ? "Comparing…" : "Compare models"}</button>
          <button style={btn.ai(C.blue)} onClick={mapLinks} disabled={busy.links}>{busy.links ? "Mapping…" : "Map linkages with AI"}</button>
          <button style={btn.ai(C.mint)} onClick={suggestIdeas} disabled={busy.ideas}>{busy.ideas ? "Thinking…" : "Suggest use cases"}</button>
          <button style={btn.ai(C.navy)} onClick={arrange}>Arrange by theme</button>
          <button style={btn.primarySm} onClick={() => setShowPack(true)}>Takeaway pack</button>
        </div>
      </header>

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <div
          ref={canvasRef}
          style={{ position: "relative", flex: 1, overflow: "hidden", touchAction: "none", cursor: connecting ? "crosshair" : panDrag ? "grabbing" : drag ? "grabbing" : "grab" }}
          onPointerDown={onCanvasDown}
          onDoubleClick={onCanvasDblClick}
          onPointerMove={onMove}
          onPointerUp={(e) => onUp(e)}
          onPointerLeave={(e) => onUp(e)}
        >
          <Corner />
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: WORLD_W,
              height: WORLD_H,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
            }}
          >
            <svg style={{ position: "absolute", top: 0, left: 0, width: WORLD_W, height: WORLD_H, pointerEvents: "none", overflow: "visible" }}>
              {links.map((l, k) => {
                const a = cards.find((c) => c.id === l.a), b = cards.find((c) => c.id === l.b);
                if (!a || !b) return null;
                const pa = center(a), pb = center(b), mx = (pa.x + pb.x) / 2, my = (pa.y + pb.y) / 2;
                const manual = !!l.manual;
                const pathD = `M ${pa.x} ${pa.y} C ${mx} ${pa.y}, ${mx} ${pb.y}, ${pb.x} ${pb.y}`;
                const selected = selectedLinkIdx === k;
                return (
                  <g key={k} style={{ pointerEvents: "auto" }} data-link-ui onPointerDown={(e) => { e.stopPropagation(); setSelectedLinkIdx(k); setSelectedId(null); }}>
                    <path d={pathD} fill="none" stroke="transparent" strokeWidth="14" />
                    <path className={manual ? undefined : "link-path"} d={pathD} fill="none" stroke={manual ? C.navy : C.blue} strokeWidth="2" strokeOpacity={manual ? 1 : 0.55} />
                    {l.reason && !manual && <text x={mx} y={my - 6} fill={C.navy} fontSize="11" textAnchor="middle" pointerEvents="none">{l.reason}</text>}
                    {selected && (
                      <g data-link-ui style={{ cursor: "pointer" }} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); removeLink(k); }}>
                        <circle cx={mx} cy={my} r="10" fill={C.white} stroke={C.border} strokeWidth="1" />
                        <text x={mx} y={my + 4} fill={C.navy} fontSize="13" fontWeight="700" textAnchor="middle">×</text>
                      </g>
                    )}
                  </g>
                );
              })}
              {connecting && connectCursor && (() => {
                const from = cards.find((c) => c.id === connecting.fromId);
                if (!from) return null;
                const pa = center(from);
                return (
                  <line x1={pa.x} y1={pa.y} x2={connectCursor.x} y2={connectCursor.y} stroke={C.navy} strokeWidth="2" strokeDasharray="6 4" pointerEvents="none" />
                );
              })()}
            </svg>

            {cards.map((c) => {
              const t = themeOf(c.theme);
              const accent = cardAccent(c);
              const w = cardW(c);
              const h = cardH(c);
              const fs = cardFontSize(c);
              const isEditing = editingId === c.id;
              const isSelected = selectedId === c.id;
              return (
                <div
                  key={c.id}
                  data-card
                  className={`board-card${isSelected ? " card-selected" : ""}${isEditing ? " card-editing" : ""}`}
                  style={{ position: "absolute", top: 0, left: 0, width: w, transform: `translate(${c.x}px, ${c.y}px)`, transition: drag?.id === c.id || resize?.id === c.id ? "none" : "transform .45s cubic-bezier(.2,.8,.2,1)", zIndex: drag?.id === c.id || isSelected || isEditing ? 20 : 5 }}
                >
                  <div
                    className="card-pop"
                    style={{ position: "relative", width: w, minHeight: h, background: C.white, border: `1px solid ${C.border}`, borderTop: `4px solid ${accent}`, borderRadius: 12, padding: "10px 12px", boxShadow: "0 6px 18px rgba(10,22,40,.08)", cursor: isEditing ? "text" : "grab", boxSizing: "border-box" }}
                    onPointerDown={(e) => onDown(e, c.id)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <span style={{ color: C.white, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: t.color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 100 }}>{t.label}</span>
                      {c.ai && <span style={tag.ai}>AI</span>}
                      <button className="card-dup" data-card-action style={{ marginLeft: "auto", border: `1px solid ${C.border}`, background: C.white, color: C.navy, fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 5, cursor: "pointer", lineHeight: 1.4 }} onPointerDown={(e) => e.stopPropagation()} onClick={() => duplicateCard(c.id)} title="Duplicate">⧉</button>
                      <button style={{ border: "none", background: "transparent", color: "#9AA3B2", fontSize: 18, lineHeight: 1, cursor: "pointer" }} onPointerDown={(e) => e.stopPropagation()} onClick={() => removeCard(c.id)}>×</button>
                    </div>

                    <div className="card-controls" data-card-action style={{ position: "absolute", top: 34, left: 12, right: 12, display: "flex", alignItems: "center", gap: 6, zIndex: 4, background: "rgba(255,255,255,.92)", padding: "3px 4px", borderRadius: 6 }}>
                      <div style={{ display: "flex", gap: 3 }}>
                        {PALETTE.map((p) => (
                          <button
                            key={p.label}
                            title={p.label}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={() => updateCard(c.id, { color: p.color })}
                            style={{ width: 14, height: 14, borderRadius: 3, padding: 0, cursor: "pointer", background: p.color, border: c.color === p.color || (!c.color && p.color === t.color) ? `2px solid ${C.navy}` : p.color === C.white ? `1px solid ${C.border}` : "1px solid transparent" }}
                          />
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 2, marginLeft: "auto" }}>
                        {([["S", 13], ["M", 16], ["L", 20]] as const).map(([label, px]) => (
                          <button
                            key={label}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={() => updateCard(c.id, { size: px })}
                            style={{ border: `1px solid ${cardFontSize(c) === px ? C.navy : C.border}`, background: cardFontSize(c) === px ? C.surface : C.white, color: C.navy, fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 4, cursor: "pointer", lineHeight: 1.4 }}
                          >{label}</button>
                        ))}
                      </div>
                    </div>

                    {isEditing ? (
                      <textarea
                        ref={editRef}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onBlur={() => finishEdit(c.id, editText)}
                        onPointerDown={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); finishEdit(c.id, editText); }
                          if (e.key === "Escape") { e.preventDefault(); cancelEdit(c.id); }
                        }}
                        style={{ width: "100%", minHeight: h - 70, fontSize: fs, lineHeight: 1.35, color: C.navy, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 8px", resize: "none", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                      />
                    ) : (
                      <div
                        style={{ fontSize: fs, lineHeight: 1.35, color: C.navy, minHeight: 24, wordBreak: "break-word" }}
                        onDoubleClick={(e) => { e.stopPropagation(); startEdit(c); }}
                      >{c.text}</div>
                    )}

                    <div
                      className="resize-handle"
                      data-card-action
                      onPointerDown={(e) => onResizeDown(e, c.id)}
                      style={{ position: "absolute", right: 4, bottom: 4, width: 12, height: 12, cursor: "nwse-resize", borderRight: `2px solid ${C.navy}`, borderBottom: `2px solid ${C.navy}`, opacity: 0.5, borderRadius: 1 }}
                    />
                    <div
                      className="connect-handle"
                      data-card-action
                      title="Drag to connect"
                      onPointerDown={(e) => onConnectDown(e, c.id)}
                      style={{ position: "absolute", right: -5, top: "50%", transform: "translateY(-50%)", width: 10, height: 10, borderRadius: 5, background: C.navy, border: `2px solid ${C.white}`, boxShadow: `0 0 0 1px ${C.border}`, cursor: "crosshair", zIndex: 6 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div data-board-ui style={{ position: "absolute", left: "50%", bottom: 20, transform: "translateX(-50%)", display: "flex", gap: 8, background: C.white, padding: 8, borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: "0 10px 30px rgba(10,22,40,.12)", width: "min(720px, 92%)", zIndex: 10 }}>
            <select value={theme} onChange={(e) => setTheme(e.target.value)} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "0 8px", fontSize: 13, color: C.navy, background: C.white }}>
              {THEMES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <input style={{ flex: 1, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, outline: "none" }} placeholder="Type a pain point or use case, then Enter" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
            <button style={btn.primarySm} onClick={submit}>Add</button>
          </div>

          <div data-board-ui style={{ position: "absolute", right: 16, bottom: 20, display: "flex", alignItems: "center", gap: 4, zIndex: 10 }}>
            <button style={btn.ghost} onClick={() => zoomStep(-0.15)} aria-label="Zoom out">−</button>
            <span style={{ ...btn.ghost, cursor: "default", minWidth: 52, textAlign: "center", padding: "9px 10px" }}>{Math.round(zoom * 100)}%</span>
            <button style={btn.ghost} onClick={() => zoomStep(0.15)} aria-label="Zoom in">+</button>
            <button style={btn.ghost} onClick={resetView}>Reset</button>
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
      {showCompare && (
        <CompareModal
          results={compareResults}
          loading={busy.compare}
          onClose={() => { setShowCompare(false); setCompareResults(null); }}
        />
      )}
      <div style={{ position: "absolute", left: 16, bottom: 6, fontSize: 11, color: "#9AA3B2" }}>Replace /public/logos and /public/deck with official assets.</div>
    </div>
  );
}

function CompareModal({ results, loading, onClose }: {
  results: Record<AIProvider, { text: string; error?: string; loading?: boolean }> | null;
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,40,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }} onClick={onClose}>
      <div style={{ background: C.white, borderRadius: 16, padding: 30, width: "min(960px, 96%)", maxHeight: "88vh", overflow: "auto", boxShadow: "0 30px 80px rgba(10,22,40,.3)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ fontFamily: display, color: C.navy, margin: 0, fontSize: 22 }}>Compare models</h2>
          <button style={btn.ghost} onClick={onClose}>Close</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {AI_PROVIDERS.map(({ id, label }) => {
            const col = results?.[id];
            const borderCol = id === "claude" ? C.blue : id === "gemini" ? C.mint : C.navy;
            return (
              <div key={id} style={{ border: `1.5px solid ${borderCol}`, borderRadius: 12, padding: 14, background: C.surface, minHeight: 180 }}>
                <div style={{ fontWeight: 700, color: C.navy, marginBottom: 10, fontFamily: display }}>{label}</div>
                {loading || col?.loading ? (
                  <p style={{ color: "#7A8499", fontSize: 13, margin: 0 }}>Loading…</p>
                ) : col?.text ? (
                  col.text.split("\n").filter(Boolean).map((line, k) => (
                    <p key={k} style={{ fontSize: 13, lineHeight: 1.5, color: col.error && !col.text.startsWith("—") ? C.coral : C.navy, margin: "0 0 8px", paddingLeft: 8, borderLeft: `2px solid ${borderCol}` }}>{line}</p>
                  ))
                ) : (
                  <p style={{ color: "#7A8499", fontSize: 13, margin: 0 }}>No response</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
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
