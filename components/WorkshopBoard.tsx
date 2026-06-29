"use client";
import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import Link from "next/link";
import { C, THEMES, themeOf, themeLabel, SmartCoLogo, MUFGLogo, Corner, callAI, callAIResult, parseJSON, type AIProvider } from "./brand";
import { AskButton } from "@/components/AskPanel";
import { useRegisterAskContext } from "@/components/AskContext";
import { InfoButton } from "@/components/InfoButton";
import {
  buildComparePrompt,
  buildLinkagesPrompt,
  buildReviewPrompt,
  buildSuggestPrompt,
} from "@/lib/prompts";
import { DECK, isImageSlide } from "./deck";
import { renderDeckSlide, slideNeedsScroll } from "./IntroSlides";

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
const PANELS_STORE_KEY = "smartco-mufg-panels";
const WORKSHOP_ID = "mufg-2026-06-30"; // one row per workshop; change per session
const RAIL_W = 300;
const PANEL_TAB = 28;
const display = "var(--font-outfit), system-ui, sans-serif";

const SEED = [
  { id: "c1", theme: "accelerate", text: "Status reporting takes ~8–10 hrs/week per PM", x: 80, y: 70, ai: false },
  { id: "c2", theme: "manual", text: "Governance pack assembled by hand each stage gate", x: 360, y: 230, ai: false },
  { id: "c3", theme: "quality", text: "No single view of delivery health across the portfolio", x: 660, y: 110, ai: false },
];

let nid = 100;
const newId = () => `c${++nid}`;

let lid = 0;
const newLinkId = () => `l${++lid}`;

const LINK_COLORS = [C.navy, C.blue, C.mint, C.coral, C.yellow] as const;

type LinkData = {
  id: string;
  a: string;
  b: string;
  manual?: boolean;
  reason?: string;
  color?: string;
  style?: "solid" | "dashed";
};

const normalizeLinks = (links: any[]): LinkData[] =>
  links.map((l) => ({
    ...l,
    id: l.id || newLinkId(),
    color: l.color || (l.manual ? C.navy : C.blue),
    style: l.style === "dashed" ? "dashed" : "solid",
  }));

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

const linkGeometry = (
  pa: { x: number; y: number },
  pb: { x: number; y: number },
  slot: number,
  total: number
) => {
  const mx = (pa.x + pb.x) / 2;
  const my = (pa.y + pb.y) / 2;
  const dx = pb.x - pa.x;
  const dy = pb.y - pa.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const spread = total <= 1 ? 0 : (slot - (total - 1) / 2) * 32;
  const ox = nx * spread;
  const oy = ny * spread;
  const pathD = `M ${pa.x} ${pa.y} C ${mx + ox} ${pa.y + oy}, ${mx + ox} ${pb.y + oy}, ${pb.x} ${pb.y}`;
  return { pathD, midX: mx + ox, midY: my + oy };
};

const pairSlotMaps = (links: LinkData[]) => {
  const counts: Record<string, number> = {};
  const slots: Record<string, number> = {};
  links.forEach((l) => {
    const key = pairKey(l.a, l.b);
    counts[key] = (counts[key] || 0) + 1;
  });
  const nextSlot = (key: string) => {
    const slot = slots[key] ?? 0;
    slots[key] = slot + 1;
    return { slot, total: counts[key] };
  };
  return { nextSlot };
};

function LinkStyleControls({
  l, midX, midY, onUpdate, onRemove,
}: {
  l: LinkData;
  midX: number;
  midY: number;
  onUpdate: (id: string, patch: Partial<LinkData>) => void;
  onRemove: (id: string) => void;
}) {
  const w = 148;
  const h = 52;
  const x = midX - w / 2;
  const y = midY - h / 2 - 14;
  return (
    <g data-link-ui transform={`translate(${x}, ${y})`} onPointerDown={(e) => e.stopPropagation()}>
      <rect width={w} height={h} rx={6} fill={C.white} stroke={C.border} style={{ pointerEvents: "all" }} />
      {LINK_COLORS.map((col, i) => (
        <circle
          key={col}
          cx={10 + i * 18}
          cy={14}
          r={5}
          fill={col}
          stroke={l.color === col ? C.navy : C.border}
          strokeWidth={l.color === col ? 2 : 1}
          style={{ cursor: "pointer", pointerEvents: "all" }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onUpdate(l.id, { color: col }); }}
        />
      ))}
      {(["solid", "dashed"] as const).map((style, i) => (
        <g
          key={style}
          style={{ cursor: "pointer", pointerEvents: "all" }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onUpdate(l.id, { style }); }}
        >
          <rect x={6 + i * 44} y={28} width={40} height={16} rx={4} fill={l.style === style ? C.surface : C.white} stroke={l.style === style ? C.navy : C.border} />
          <text x={26 + i * 44} y={39} fill={C.navy} fontSize={9} fontWeight={700} textAnchor="middle" style={{ pointerEvents: "none" }}>{style === "solid" ? "Solid" : "Dash"}</text>
        </g>
      ))}
      <g
        style={{ cursor: "pointer", pointerEvents: "all" }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onRemove(l.id); }}
      >
        <circle cx={w - 12} cy={12} r={8} fill={C.white} stroke={C.border} />
        <text x={w - 12} y={15} fill={C.navy} fontSize={11} fontWeight={700} textAnchor="middle">×</text>
      </g>
    </g>
  );
}

let boardSeq = 0;
const newBoardId = () => `b${++boardSeq}`;

type BoardData = {
  id: string;
  name: string;
  cards: any[];
  links: any[];
  insight: string;
  zoom?: number;
  pan?: { x: number; y: number };
};

type SessionPayload = { boards: BoardData[]; activeId: string };

const createBoard = (name: string, cards: any[] = [], links: any[] = [], insight = ""): BoardData => ({
  id: newBoardId(),
  name,
  cards,
  links,
  insight,
  zoom: 1,
  pan: { x: 0, y: 0 },
});

const defaultSession = (): SessionPayload => {
  const board = createBoard("Board 1", [...SEED], [], "");
  return { boards: [board], activeId: board.id };
};

const normalizeSession = (v: any): SessionPayload => {
  if (v?.boards?.length) {
    const boards = v.boards.map((b: any, i: number) => ({
      id: b.id || newBoardId(),
      name: b.name || `Board ${i + 1}`,
      cards: Array.isArray(b.cards) ? b.cards : [],
      links: normalizeLinks(Array.isArray(b.links) ? b.links : []),
      insight: typeof b.insight === "string" ? b.insight : "",
      zoom: typeof b.zoom === "number" ? b.zoom : 1,
      pan: b.pan && typeof b.pan.x === "number" ? b.pan : { x: 0, y: 0 },
    }));
    const activeId = boards.some((b: BoardData) => b.id === v.activeId) ? v.activeId : boards[0].id;
    return { boards, activeId };
  }
  if (v && (Array.isArray(v.cards) || Array.isArray(v.links) || typeof v.insight === "string")) {
    const board = createBoard("Board 1", v.cards ?? [], normalizeLinks(v.links ?? []), v.insight ?? "");
    return { boards: [board], activeId: board.id };
  }
  return defaultSession();
};

const boardSnapshot = (boards: BoardData[], activeId: string, zoom: number, pan: { x: number; y: number }) =>
  boards.map((b) => (b.id === activeId ? { ...b, zoom, pan } : b));

const cardW = (c: { w?: number }) => c.w ?? CARD_W;
const cardH = (c: { h?: number }) => c.h ?? CARD_H;
const cardAccent = (c: { color?: string; theme?: string | null }) =>
  c.color ?? (c.theme ? themeOf(c.theme)!.color : C.border);
const FIT_MIN = 11;
const FIT_MAX = 28;
const EDIT_MIN_W = 320;
const EDIT_MIN_H = 200;
const sizeCapMax = (c: { size?: number }) => c.size ?? FIT_MAX;

const cardDisplayW = (c: { w?: number }, editing: boolean) => (editing ? Math.max(cardW(c), EDIT_MIN_W) : cardW(c));
const cardDisplayH = (c: { h?: number }, editing: boolean) => (editing ? Math.max(cardH(c), EDIT_MIN_H) : cardH(c));

function fitFontSize(el: HTMLElement, maxFs: number, minFs = FIT_MIN): number {
  const cap = Math.min(maxFs, FIT_MAX);
  if (!el.textContent?.trim()) return cap;
  let lo = minFs, hi = cap;
  const saved = el.style.fontSize;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    el.style.fontSize = `${mid}px`;
    const overflows = el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1;
    if (overflows) hi = mid - 1;
    else lo = mid;
  }
  el.style.fontSize = saved;
  return Math.max(minFs, lo);
}

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

function BoardCard({
  c, isEditing, isSelected, isDragging, isResizing, controlsOpen,
  editText, editRef,
  onDown, onResizeDown, onConnectDown, onStartEdit,
  onEditChange, onFinishEdit, onCancelEdit,
  updateCard, duplicateCard, removeCard,
}: {
  c: any;
  isEditing: boolean;
  isSelected: boolean;
  isDragging: boolean;
  isResizing: boolean;
  controlsOpen: boolean;
  editText: string;
  editRef: React.RefObject<HTMLTextAreaElement | null>;
  onDown: (e: React.PointerEvent, id: string) => void;
  onResizeDown: (e: React.PointerEvent, id: string) => void;
  onConnectDown: (e: React.PointerEvent, id: string) => void;
  onStartEdit: (c: { id: string; text: string }) => void;
  onEditChange: (v: string) => void;
  onFinishEdit: (id: string, draft: string) => void;
  onCancelEdit: (id: string) => void;
  updateCard: (id: string, patch: Record<string, unknown>) => void;
  duplicateCard: (id: string) => void;
  removeCard: (id: string) => void;
}) {
  const t = themeOf(c.theme);
  const uncategorised = !c.theme;
  const accent = cardAccent(c);
  const displayW = cardDisplayW(c, isEditing);
  const displayH = cardDisplayH(c, isEditing);
  const maxFs = sizeCapMax(c);
  const textRef = useRef<HTMLDivElement>(null);
  const [fitSize, setFitSize] = useState(maxFs);

  const remeasure = useCallback(() => {
    const el = isEditing ? editRef.current : textRef.current;
    if (!el) return;
    if (isEditing) {
      el.style.fontSize = `${maxFs}px`;
      setFitSize(fitFontSize(el, maxFs));
    } else {
      setFitSize(fitFontSize(el, maxFs));
    }
  }, [isEditing, maxFs, editRef, c.text, displayW, displayH]);

  useLayoutEffect(() => { remeasure(); }, [remeasure, editText]);

  const handleCardPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (isEditing) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-card-action]") || target.closest("[data-handle]")) return;
    onDown(e, c.id);
  };

  const actionBtn: React.CSSProperties = { border: "none", background: "transparent", color: "#9AA3B2", padding: 2, cursor: "pointer", display: "flex", alignItems: "center", lineHeight: 1 };
  const sizeTransition = isDragging || isResizing ? "none" : "width 0.32s cubic-bezier(.2,.8,.2,1), height 0.32s cubic-bezier(.2,.8,.2,1)";

  return (
    <div
      data-card
      className={`board-card${isSelected ? " card-selected" : ""}${isEditing ? " card-editing" : ""}`}
      style={{ position: "absolute", top: 0, left: 0, width: displayW, transform: `translate(${c.x}px, ${c.y}px)`, transition: isDragging || isResizing ? "none" : "transform .45s cubic-bezier(.2,.8,.2,1)", zIndex: isEditing ? 30 : isDragging || isSelected ? 20 : 5 }}
    >
      <div
        className="card-pop"
        style={{ position: "relative", width: displayW, height: displayH, transition: sizeTransition, background: C.white, border: `1px solid ${C.border}`, borderTop: uncategorised ? `2px solid ${C.border}` : `4px solid ${accent}`, borderRadius: 12, padding: "10px 12px", boxShadow: "0 6px 18px rgba(10,22,40,.08)", cursor: isEditing ? "text" : "grab", boxSizing: "border-box", display: "flex", flexDirection: "column" }}
        onPointerDown={handleCardPointerDown}
      >
        <div
          data-card-header
          style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, flexShrink: 0, cursor: "default" }}
        >
          {!uncategorised && t && (
            <span style={{ color: C.white, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: t.color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 100 }}>{t.label}</span>
          )}
          {c.ai && <span style={tag.ai}>AI</span>}
          <button className="card-dup" data-card-action style={{ marginLeft: "auto", border: `1px solid ${C.border}`, background: C.white, color: C.navy, fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 5, cursor: "pointer", lineHeight: 1.4 }} onPointerDown={(e) => e.stopPropagation()} onClick={() => duplicateCard(c.id)} title="Duplicate">⧉</button>
          {isEditing ? (
            <button
              data-card-action
              title="Done"
              style={{ ...actionBtn, border: `1px solid ${C.border}`, background: C.surface, color: C.navy, fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 5 }}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => onFinishEdit(c.id, editText)}
            >Done</button>
          ) : (
            <button
              data-card-action
              title="Edit"
              style={actionBtn}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onStartEdit(c)}
              aria-label="Edit card"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </button>
          )}
          <button data-card-action style={{ border: "none", background: "transparent", color: "#9AA3B2", fontSize: 18, lineHeight: 1, cursor: "pointer" }} onPointerDown={(e) => e.stopPropagation()} onClick={() => removeCard(c.id)}>×</button>
        </div>

        {controlsOpen && (
          <div className="card-controls-popover" data-card-action style={{ position: "absolute", top: 36, left: 10, zIndex: 8, display: "flex", alignItems: "center", gap: 8, background: C.white, border: `1px solid ${C.border}`, padding: "5px 8px", borderRadius: 8, boxShadow: "0 4px 14px rgba(10,22,40,.12)" }}>
            <div style={{ display: "flex", gap: 3 }}>
              {PALETTE.map((p) => (
                <button
                  key={p.label}
                  title={p.label}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => updateCard(c.id, { color: p.color })}
                  style={{ width: 14, height: 14, borderRadius: 3, padding: 0, cursor: "pointer", background: p.color, border: c.color === p.color || (!c.color && t && p.color === t.color) ? `2px solid ${C.navy}` : p.color === C.white ? `1px solid ${C.border}` : "1px solid transparent" }}
                />
              ))}
            </div>
            <div style={{ width: 1, height: 14, background: C.border }} />
            <div style={{ display: "flex", gap: 2 }}>
              {([["S", 13], ["M", 16], ["L", 20]] as const).map(([label, px]) => (
                <button
                  key={label}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => updateCard(c.id, { size: px })}
                  style={{ border: `1px solid ${c.size === px ? C.navy : C.border}`, background: c.size === px ? C.surface : C.white, color: C.navy, fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 4, cursor: "pointer", lineHeight: 1.4 }}
                >{label}</button>
              ))}
            </div>
          </div>
        )}

        <div data-card-body style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          {isEditing ? (
            <textarea
              ref={editRef}
              value={editText}
              onChange={(e) => onEditChange(e.target.value)}
              onBlur={() => onFinishEdit(c.id, editText)}
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onFinishEdit(c.id, editText); }
                if (e.key === "Escape") { e.preventDefault(); onCancelEdit(c.id); }
              }}
              style={{ width: "100%", height: "100%", fontSize: fitSize, lineHeight: 1.35, color: C.navy, border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 6px", resize: "none", outline: "none", fontFamily: "inherit", boxSizing: "border-box", overflow: "hidden" }}
            />
          ) : (
            <div
              ref={textRef}
              style={{ fontSize: fitSize, lineHeight: 1.35, color: C.navy, height: "100%", overflow: "hidden", wordBreak: "break-word" }}
            >{c.text}</div>
          )}
        </div>

        <div
          data-handle="resize"
          data-card-action
          className="resize-handle"
          onPointerDown={(e) => onResizeDown(e, c.id)}
          style={{ position: "absolute", right: 0, bottom: 0, width: 24, height: 24, cursor: "nwse-resize", touchAction: "none", zIndex: 6, display: "flex", alignItems: "flex-end", justifyContent: "flex-end" }}
        >
          <span className="handle-mark" style={{ width: 10, height: 10, margin: 2, borderRight: `2px solid ${C.navy}`, borderBottom: `2px solid ${C.navy}`, borderRadius: 1 }} />
        </div>
        <div
          data-handle="connect"
          data-card-action
          className="connect-handle"
          title="Drag to connect"
          onPointerDown={(e) => onConnectDown(e, c.id)}
          style={{ position: "absolute", right: -12, top: "50%", transform: "translateY(-50%)", width: 24, height: 24, cursor: "crosshair", touchAction: "none", zIndex: 6, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <span className="handle-mark" style={{ width: 10, height: 10, borderRadius: 5, background: C.navy, border: `2px solid ${C.white}`, boxShadow: `0 0 0 1px ${C.border}` }} />
        </div>
      </div>
    </div>
  );
}

export default function WorkshopBoard() {
  const [mode, setMode] = useState<"intro" | "board">("intro");
  return (
    <div style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", color: C.navy, height: "100vh", width: "100%", overflow: "hidden", background: C.white }}>
      {mode === "intro" ? <Intro onEnter={() => setMode("board")} /> : <Board onBack={() => setMode("intro")} />}
    </div>
  );
}

const INTRO_NETWORK_NODES: { x: number; y: number }[] = [
  { x: 12, y: 18 }, { x: 28, y: 12 }, { x: 44, y: 22 }, { x: 58, y: 14 }, { x: 72, y: 26 },
  { x: 18, y: 38 }, { x: 35, y: 42 }, { x: 52, y: 36 }, { x: 68, y: 44 }, { x: 82, y: 34 },
  { x: 24, y: 58 }, { x: 48, y: 62 }, { x: 74, y: 56 },
];

const INTRO_NETWORK_EDGES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [1, 6], [2, 7], [3, 8], [4, 9],
  [5, 6], [6, 7], [7, 8], [8, 9], [5, 10], [6, 11], [7, 11], [8, 12], [9, 12], [10, 11], [11, 12],
];

function IntroAmbient() {
  return (
    <div className="intro-ambient" aria-hidden>
      <svg className="intro-ambient-shape intro-ambient-shape--1" viewBox="0 0 100 70" preserveAspectRatio="none" aria-hidden>
        <polygon points="18,4 88,4 72,66 2,66" fill={C.blue} />
      </svg>
      <svg className="intro-ambient-shape intro-ambient-shape--2" viewBox="0 0 100 70" preserveAspectRatio="none" aria-hidden>
        <polygon points="12,6 82,6 94,64 24,64" fill={C.mint} />
      </svg>
      <svg className="intro-ambient-shape intro-ambient-shape--3" viewBox="0 0 100 70" preserveAspectRatio="none" aria-hidden>
        <polygon points="8,8 78,2 92,62 22,68" fill={C.blue} />
      </svg>
      <svg className="intro-ambient-shape intro-ambient-shape--4" viewBox="0 0 100 70" preserveAspectRatio="none" aria-hidden>
        <polygon points="14,2 84,10 76,68 6,60" fill={C.mint} />
      </svg>
      <svg className="intro-network" viewBox="0 0 100 70" preserveAspectRatio="xMidYMid slice" aria-hidden>
        {INTRO_NETWORK_EDGES.map(([a, b], k) => {
          const n1 = INTRO_NETWORK_NODES[a];
          const n2 = INTRO_NETWORK_NODES[b];
          return (
            <line
              key={k}
              className="intro-network-line"
              x1={n1.x}
              y1={n1.y}
              x2={n2.x}
              y2={n2.y}
              strokeDasharray="3 4"
            />
          );
        })}
        {INTRO_NETWORK_NODES.map((n, k) => (
          <circle key={k} className="intro-network-dot" cx={n.x} cy={n.y} r="0.9" />
        ))}
      </svg>
    </div>
  );
}

function Intro({ onEnter }: { onEnter: () => void }) {
  const [i, setI] = useState(0);
  const s = DECK[i];
  const last = i === DECK.length - 1;
  const imageSlide = isImageSlide(s);
  const isText = !imageSlide;
  const scrollable = isText && slideNeedsScroll(s);
  const heroTitle = (
    <h1 className="intro-title" style={{ margin: 0 }}>
      {["SmartCo", " × ", "MUFG", " — AI & Delivery Workshop"].map((part, k) => {
        const isX = part.trim() === "×";
        return (
          <span
            key={`${part}-${k}`}
            className={`intro-title-part${isX ? " intro-title-x" : ""}`}
            style={{ animationDelay: `${0.32 + k * 0.09}s` }}
          >
            {part}
          </span>
        );
      })}
    </h1>
  );

  return (
    <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", background: `linear-gradient(160deg, ${C.white} 0%, ${C.surface} 100%)`, padding: "28px clamp(16px, 4vw, 40px)", overflow: "hidden" }}>
      {isText ? <IntroAmbient /> : <Corner />}

      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 2, position: "relative", flexShrink: 0 }}>
        <div className={isText ? "intro-enter intro-logo-left" : undefined}>
          <SmartCoLogo />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className={isText ? "intro-enter" : undefined}
            style={{ ...btn.ghost, padding: "7px 12px", fontSize: 12, animationDelay: "0.15s" }}
            onClick={onEnter}
          >
            Enter workshop board
          </button>
          <div className={isText ? "intro-enter intro-logo-right" : undefined}>
            <MUFGLogo />
          </div>
        </div>
      </header>

      {imageSlide ? (
        <div key={i} className="enter-up" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2, minHeight: 0 }}>
          <img src={s.image} alt={`Slide ${i + 1}`} style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 12, boxShadow: "0 18px 50px rgba(10,22,40,.14)" }} />
        </div>
      ) : (
        <div
          key={i}
          className={scrollable ? "intro-scroll" : undefined}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: scrollable ? "flex-start" : "center",
            maxWidth: scrollable ? 960 : 760,
            width: "100%",
            margin: scrollable ? "12px auto 0" : undefined,
            zIndex: 2,
            position: "relative",
            minHeight: 0,
          }}
        >
          {renderDeckSlide(s, onEnter, heroTitle)}
        </div>
      )}

      {imageSlide && s.cta && last && (
        <div className="enter-up" style={{ position: "absolute", right: 40, bottom: 90, zIndex: 3 }}>
          <button style={btn.primary} onClick={onEnter}>{s.cta} →</button>
        </div>
      )}

      <footer style={{ display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 2, position: "relative", flexShrink: 0, paddingTop: 12 }}>
        <button type="button" style={btn.ghost} onClick={() => setI((v) => Math.max(0, v - 1))} disabled={i === 0}>Back</button>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", maxWidth: "60%" }}>
          {DECK.map((_, k) => (
            <button
              key={k}
              type="button"
              aria-label={`Go to slide ${k + 1}`}
              onClick={() => setI(k)}
              style={{
                width: k === i ? 10 : 8,
                height: k === i ? 10 : 8,
                borderRadius: 8,
                border: "none",
                padding: 0,
                cursor: "pointer",
                background: k === i ? C.blue : C.border,
              }}
            />
          ))}
        </div>
        {!last ? (
          <button type="button" style={btn.ghost} onClick={() => setI((v) => Math.min(DECK.length - 1, v + 1))}>Next</button>
        ) : (
          <span style={{ width: 64 }} />
        )}
      </footer>
    </div>
  );
}

function BoardTabBar({
  boards, activeId, renamingId, renameDraft,
  onSwitch, onAdd, onDelete, onStartRename, onRenameDraft, onFinishRename,
}: {
  boards: BoardData[];
  activeId: string;
  renamingId: string | null;
  renameDraft: string;
  onSwitch: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onStartRename: (id: string) => void;
  onRenameDraft: (v: string) => void;
  onFinishRename: (id: string, cancel?: boolean) => void;
}) {
  return (
    <div
      data-board-ui
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "6px 12px",
        background: C.white,
        borderBottom: `1px solid ${C.border}`,
        overflowX: "auto",
        flexShrink: 0,
        minHeight: 36,
      }}
    >
      {boards.map((b) => {
        const active = b.id === activeId;
        const renaming = renamingId === b.id;
        return (
          <div
            key={b.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              flexShrink: 0,
              border: `1px solid ${active ? C.navy : C.border}`,
              background: active ? C.surface : C.white,
              borderRadius: 6,
            }}
          >
            {renaming ? (
              <input
                value={renameDraft}
                onChange={(e) => onRenameDraft(e.target.value)}
                onBlur={() => onFinishRename(b.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onFinishRename(b.id);
                  if (e.key === "Escape") onFinishRename(b.id, true);
                }}
                autoFocus
                style={{ border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 12, padding: "4px 8px", width: 100, color: C.navy, margin: 2, outline: "none" }}
              />
            ) : (
              <button
                type="button"
                onClick={() => onSwitch(b.id)}
                onDoubleClick={() => onStartRename(b.id)}
                style={{ border: "none", background: "transparent", color: C.navy, fontSize: 12, fontWeight: active ? 700 : 600, padding: "5px 10px", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
              >{b.name}</button>
            )}
            {!renaming && (
              <button
                type="button"
                title="Rename board"
                onClick={() => onStartRename(b.id)}
                style={{ border: "none", background: "transparent", color: "#9AA3B2", padding: 2, cursor: "pointer", display: "flex" }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </button>
            )}
            {boards.length > 1 && !renaming && (
              <button
                type="button"
                title="Delete board"
                onClick={() => onDelete(b.id)}
                style={{ border: "none", background: "transparent", color: "#9AA3B2", fontSize: 14, lineHeight: 1, cursor: "pointer", padding: "0 6px 0 2px" }}
              >×</button>
            )}
          </div>
        );
      })}
      <button type="button" onClick={onAdd} title="Add board" style={{ ...btn.ghost, padding: "4px 12px", fontSize: 16, lineHeight: 1, flexShrink: 0 }}>+</button>
    </div>
  );
}

function Board({ onBack }: { onBack: () => void }) {
  const initial = defaultSession();
  const [boards, setBoards] = useState<BoardData[]>(initial.boards);
  const [activeId, setActiveId] = useState(initial.activeId);
  const [renamingBoardId, setRenamingBoardId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const renameOriginal = useRef("");
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  const activeBoard = boards.find((b) => b.id === activeId) ?? boards[0];
  const cards = activeBoard?.cards ?? [];
  const links = activeBoard?.links ?? [];
  const insight = activeBoard?.insight ?? "";

  const boardCtxRef = useRef({ boards, activeId });
  boardCtxRef.current = { boards, activeId };
  useRegisterAskContext({
    label: "Include current board",
    getContext: () => {
      const { boards: bs, activeId: aid } = boardCtxRef.current;
      const board = bs.find((b) => b.id === aid) ?? bs[0];
      if (!board) return null;
      const lines = (board.cards || []).map((c: { theme?: string | null; text: string }) =>
        `[${themeLabel(c.theme)}] ${c.text}`
      );
      let out = `Board: ${board.name}`;
      if (lines.length) out += `\n${lines.join("\n")}`;
      if (board.insight?.trim()) out += `\n\nInsight:\n${board.insight}`;
      return out;
    },
  });

  const setCards = useCallback((updater: React.SetStateAction<any[]>) => {
    setBoards((bs) => bs.map((b) => {
      if (b.id !== activeIdRef.current) return b;
      const nextCards = typeof updater === "function" ? updater(b.cards) : updater;
      return { ...b, cards: nextCards };
    }));
  }, []);

  const setLinks = useCallback((updater: React.SetStateAction<any[]>) => {
    setBoards((bs) => bs.map((b) => {
      if (b.id !== activeIdRef.current) return b;
      const nextLinks = typeof updater === "function" ? updater(b.links) : updater;
      return { ...b, links: nextLinks };
    }));
  }, []);

  const setInsight = useCallback((value: React.SetStateAction<string>) => {
    setBoards((bs) => bs.map((b) => {
      if (b.id !== activeIdRef.current) return b;
      const nextInsight = typeof value === "function" ? value(b.insight) : value;
      return { ...b, insight: nextInsight };
    }));
  }, []);

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
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panDrag, setPanDrag] = useState<{ sx: number; sy: number; spx: number; spy: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editOriginal, setEditOriginal] = useState("");
  const [controlsCardId, setControlsCardId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState({ top: false, right: false, bottom: false });
  const canvasRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);
  const zoomPanRef = useRef({ zoom: 1, panX: 0, panY: 0 });
  const loaded = useRef(false);
  const panelsLoaded = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PANELS_STORE_KEY);
      if (raw) setCollapsed(JSON.parse(raw));
    } catch {}
    panelsLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!panelsLoaded.current) return;
    try { localStorage.setItem(PANELS_STORE_KEY, JSON.stringify(collapsed)); } catch {}
  }, [collapsed]);

  useEffect(() => {
    const t = setTimeout(() => { canvasRef.current?.getBoundingClientRect(); }, 380);
    return () => clearTimeout(t);
  }, [collapsed.top, collapsed.right, collapsed.bottom]);

  const togglePanel = (key: "top" | "right" | "bottom") => {
    setCollapsed((c) => ({ ...c, [key]: !c[key] }));
  };

  zoomPanRef.current = { zoom, panX: pan.x, panY: pan.y };

  useEffect(() => {
    (async () => {
      const apply = (raw: any) => {
        const session = normalizeSession(raw);
        setBoards(session.boards);
        setActiveId(session.activeId);
        const active = session.boards.find((b) => b.id === session.activeId) ?? session.boards[0];
        setZoom(active?.zoom ?? 1);
        setPan(active?.pan ?? { x: 0, y: 0 });
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
    const payload = { boards: boardSnapshot(boards, activeId, zoom, pan), activeId };
    try { localStorage.setItem(STORE_KEY, JSON.stringify(payload)); } catch {}
    const t = setTimeout(() => {
      fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: WORKSHOP_ID, data: payload }),
      }).catch(() => {});
    }, 600);
    return () => clearTimeout(t);
  }, [boards, activeId, zoom, pan]);

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
      if ((e.key === "Delete" || e.key === "Backspace") && selectedLinkId) {
        e.preventDefault();
        setLinks((l) => l.filter((link) => link.id !== selectedLinkId));
        setSelectedLinkId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedLinkId, editingId]);

  const updateCard = useCallback((id: string, patch: Record<string, unknown>) => {
    setCards((c) => c.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }, []);

  const addCard = useCallback((t: string, th: string | null, ai = false, pos?: { x: number; y: number }, openEdit = false) => {
    const txt = (t || "").trim();
    if (!txt && !openEdit) return;
    const reg = th == null ? THEMES.length : THEMES.findIndex((x) => x.id === th);
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
    setControlsCardId(null);
  };

  const duplicateCard = (id: string) => {
    const c = cards.find((x) => x.id === id);
    if (!c) return;
    const copy = { ...c, id: newId(), x: c.x + 24, y: c.y + 24 };
    setCards((prev) => [...prev, copy]);
    setSelectedId(copy.id);
  };

  const removeLink = (id: string) => {
    setLinks((l) => l.filter((link) => link.id !== id));
    setSelectedLinkId(null);
  };

  const updateLink = useCallback((id: string, patch: Partial<LinkData>) => {
    setLinks((l) => l.map((link) => (link.id === id ? { ...link, ...patch } : link)));
  }, [setLinks]);

  const clearBoardUi = () => {
    setEditingId(null);
    setEditText("");
    setSelectedId(null);
    setSelectedLinkId(null);
    setControlsCardId(null);
    setConnecting(null);
    setConnectCursor(null);
    setDrag(null);
    setResize(null);
    setPanDrag(null);
  };

  const switchBoard = (id: string) => {
    if (id === activeId) return;
    setBoards((bs) => boardSnapshot(bs, activeId, zoom, pan));
    setActiveId(id);
  };

  const addBoard = () => {
    const board = createBoard(`Board ${boards.length + 1}`);
    setBoards((bs) => [...boardSnapshot(bs, activeId, zoom, pan), board]);
    setActiveId(board.id);
  };

  const deleteBoard = (id: string) => {
    if (boards.length <= 1) return;
    const board = boards.find((b) => b.id === id);
    if (!board) return;
    if (!window.confirm(`Delete "${board.name}"? This cannot be undone.`)) return;
    const idx = boards.findIndex((b) => b.id === id);
    const remaining = boardSnapshot(boards, activeId, zoom, pan).filter((b) => b.id !== id);
    if (activeId === id) {
      setActiveId(remaining[Math.min(idx, remaining.length - 1)]?.id ?? remaining[0].id);
    }
    setBoards(remaining);
  };

  const startRenameBoard = (id: string) => {
    const board = boards.find((b) => b.id === id);
    if (!board) return;
    renameOriginal.current = board.name;
    setRenamingBoardId(id);
    setRenameDraft(board.name);
  };

  const finishRenameBoard = (id: string, cancel = false) => {
    const name = (cancel ? renameOriginal.current : renameDraft.trim()) || renameOriginal.current;
    setBoards((bs) => bs.map((b) => (b.id === id ? { ...b, name } : b)));
    setRenamingBoardId(null);
    setRenameDraft("");
  };

  useEffect(() => {
    if (!loaded.current) return;
    const board = boards.find((b) => b.id === activeId);
    if (!board) return;
    setZoom(board.zoom ?? 1);
    setPan(board.pan ?? { x: 0, y: 0 });
    clearBoardUi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const toWorld = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const { zoom: z, panX, panY } = zoomPanRef.current;
    return {
      x: (clientX - rect.left - panX) / z,
      y: (clientY - rect.top - panY) / z,
    };
  }, []);

  const addBlankBox = useCallback(() => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const { x: wx, y: wy } = toWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);
      addCard("", null, false, { x: Math.max(0, wx - CARD_W / 2), y: Math.max(0, wy - CARD_H / 2) }, true);
    } else {
      addCard("", null, false, undefined, true);
    }
  }, [addCard, toWorld]);

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
    const t = e.target as HTMLElement;
    if (editingId) {
      if (!t.closest("[data-card]")) finishEdit(editingId, editText);
      return;
    }
    if (e.button !== 0 || connecting) return;
    if (t.closest("[data-board-ui]") || t.closest("[data-panel-ui]") || t.closest("[data-card]") || t.closest("[data-link-ui]")) return;
    setSelectedId(null);
    setSelectedLinkId(null);
    setControlsCardId(null);
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
    if (t.closest("[data-card-action]") || t.closest("[data-handle]")) return;
    const c = cards.find((x) => x.id === id);
    if (!c) return;
    if (!t.closest(".card-controls-popover") && !t.closest("[data-card-header]")) setControlsCardId(null);
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
    setSelectedLinkId(null);
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
        setLinks((l) => [
          ...l,
          { id: newLinkId(), a: connecting.fromId, b: target.id, manual: true, color: C.navy, style: "solid" as const },
        ]);
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
      const reg = card.theme == null ? THEMES.length : THEMES.findIndex((t) => t.id === card.theme);
      const same = c.filter((k) => k.theme === card.theme);
      const row = same.indexOf(card);
      return { ...card, x: 70 + reg * 280, y: 80 + row * 122 };
    }));
  };

  const reviewPrompt = () => buildReviewPrompt(cards);

  async function runReview() {
    if (busy.review || !cards.length) return;
    setBusy((b) => ({ ...b, review: true }));
    const { system, content } = reviewPrompt();
    const out = await callAI(system, content, provider);
    setInsight(out || "— AI review unavailable right now. Capture and save are still working normally.");
    setBusy((b) => ({ ...b, review: false }));
  }

  async function compareModels() {
    if (busy.compare || !cards.length) return;
    setShowCompare(true);
    setBusy((b) => ({ ...b, compare: true }));
    const loading = { text: "", loading: true };
    setCompareResults({ claude: { ...loading }, gemini: { ...loading }, gpt: { ...loading } });
    const { system, content } = buildComparePrompt(cards);
    const results = await Promise.all(
      AI_PROVIDERS.map(async ({ id }) => {
        const { text, error } = await callAIResult(system, content, id);
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
    const { system, content } = buildLinkagesPrompt(cards);
    const out = await callAI(system, content, provider);
    const arr = parseJSON(out);
    if (Array.isArray(arr)) {
      const ids = new Set(cards.map((c) => c.id));
      const aiLinks = arr
        .filter((p: any) => ids.has(p.a) && ids.has(p.b) && p.a !== p.b)
        .map((p: any) => ({
          ...p,
          id: newLinkId(),
          color: C.blue,
          style: "solid" as const,
        }));
      setLinks((l) => [...l.filter((x) => x.manual), ...aiLinks]);
    }
    setBusy((b) => ({ ...b, links: false }));
  }

  async function suggestIdeas() {
    if (busy.ideas) return;
    setBusy((b) => ({ ...b, ideas: true }));
    const { system, content } = buildSuggestPrompt(cards);
    const out = await callAI(system, content, provider);
    const arr = parseJSON(out);
    if (Array.isArray(arr)) arr.slice(0, 3).forEach((it: any, k: number) => {
      const th = THEMES.some((t) => t.id === it.theme) ? it.theme : "accelerate";
      setTimeout(() => addCard(it.text, th, true), k * 220);
    });
    setBusy((b) => ({ ...b, ideas: false }));
  }

  const center = (c: any) => ({
    x: c.x + cardDisplayW(c, c.id === editingId) / 2,
    y: c.y + cardDisplayH(c, c.id === editingId) / 2,
  });

  const zoomBottom = collapsed.bottom ? 12 : 20;
  const zoomRight = collapsed.right ? PANEL_TAB + 8 : 16;
  const linkSlots = pairSlotMaps(links as LinkData[]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.surface, position: "relative", overflow: "hidden" }}>
      {collapsed.top && (
        <button
          type="button"
          data-panel-ui
          className="board-panel-transition"
          aria-label="Show header"
          onClick={() => togglePanel("top")}
          style={{ ...panelTab, position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 48, height: PANEL_TAB, borderRadius: "0 0 8px 8px", zIndex: 20 }}
        >▾</button>
      )}

      <div className="board-panel-transition" style={{ flexShrink: 0, overflow: "hidden", maxHeight: collapsed.top ? 0 : 140 }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "14px 20px", background: C.white, borderBottom: `1px solid ${C.border}`, flexWrap: "wrap", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button style={btn.ghost} onClick={onBack}>← Deck</button>
            <SmartCoLogo scale={0.85} />
            <span style={{ color: C.border }}>×</span>
            <MUFGLogo scale={0.85} />
            <InfoButton
              title="Workshop board"
              description="Capture pains and ideas on a themed whiteboard. Drag cards, draw links between them, and edit inline. Your board autosaves to Supabase every few seconds, with localStorage as an offline fallback."
            />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <select value={provider} onChange={(e) => setProvider(e.target.value as AIProvider)} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 10px", fontSize: 13, color: C.navy, background: C.white, fontWeight: 600 }}>
              {AI_PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <Link href="/tooling" style={{ ...btn.ghost, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Tooling map</Link>
            <AskButton />
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <button style={btn.ai(C.yellow)} onClick={compareModels} disabled={busy.compare || !cards.length}>{busy.compare ? "Comparing…" : "Compare models"}</button>
              <InfoButton
                align="right"
                title="Compare models"
                description="Sends the same prompt to Claude, Gemini, and GPT in parallel and shows the three answers side by side for comparison."
                prompt={() => buildComparePrompt(cards)}
              />
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <button style={btn.ai(C.blue)} onClick={mapLinks} disabled={busy.links}>{busy.links ? "Mapping…" : "Map linkages with AI"}</button>
              <InfoButton
                align="right"
                title="Map linkages with AI"
                description="Analyses the cards on the board and draws links between related items. Returns pairs as JSON and adds them to the canvas."
                prompt={() => buildLinkagesPrompt(cards)}
              />
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <button style={btn.ai(C.mint)} onClick={suggestIdeas} disabled={busy.ideas}>{busy.ideas ? "Thinking…" : "Suggest use cases"}</button>
              <InfoButton
                align="right"
                title="Suggest use cases"
                description="Generates three AI/delivery use-case ideas from the captured pains and adds them as new cards on the board."
                prompt={() => buildSuggestPrompt(cards)}
              />
            </span>
            <button style={btn.ai(C.navy)} onClick={arrange}>Arrange by theme</button>
            <button style={btn.primarySm} onClick={() => setShowPack(true)}>Takeaway pack</button>
          </div>
          <button
            type="button"
            data-panel-ui
            aria-label="Hide header"
            onClick={() => togglePanel("top")}
            style={{ ...panelTab, position: "absolute", top: 10, right: 10, width: PANEL_TAB, height: PANEL_TAB, borderRadius: 6 }}
          >▴</button>
        </header>
      </div>

      <BoardTabBar
        boards={boards}
        activeId={activeId}
        renamingId={renamingBoardId}
        renameDraft={renameDraft}
        onSwitch={switchBoard}
        onAdd={addBoard}
        onDelete={deleteBoard}
        onStartRename={startRenameBoard}
        onRenameDraft={setRenameDraft}
        onFinishRename={finishRenameBoard}
      />

      <div style={{ flex: 1, display: "flex", minHeight: 0, position: "relative" }}>
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
              {links.map((l) => {
                const link = l as LinkData;
                const a = cards.find((c) => c.id === link.a);
                const b = cards.find((c) => c.id === link.b);
                if (!a || !b) return null;
                const pa = center(a);
                const pb = center(b);
                const { slot, total } = linkSlots.nextSlot(pairKey(link.a, link.b));
                const { pathD, midX, midY } = linkGeometry(pa, pb, slot, total);
                const manual = !!link.manual;
                const strokeColor = link.color || (manual ? C.navy : C.blue);
                const dashed = link.style === "dashed";
                const selected = selectedLinkId === link.id;
                return (
                  <g
                    key={link.id}
                    style={{ pointerEvents: "auto" }}
                    data-link-ui
                    onPointerDown={(e) => { e.stopPropagation(); setSelectedLinkId(link.id); setSelectedId(null); }}
                  >
                    <path d={pathD} fill="none" stroke="transparent" strokeWidth="14" />
                    <path
                      className={!manual && !dashed ? "link-path" : undefined}
                      d={pathD}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth="2"
                      strokeOpacity={manual ? 1 : 0.55}
                      strokeDasharray={dashed ? "6 4" : undefined}
                    />
                    {link.reason && !manual && (
                      <text x={midX} y={midY - 6} fill={C.navy} fontSize="11" textAnchor="middle" pointerEvents="none">{link.reason}</text>
                    )}
                    {selected && (
                      <LinkStyleControls
                        l={link}
                        midX={midX}
                        midY={midY}
                        onUpdate={updateLink}
                        onRemove={removeLink}
                      />
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

            {cards.map((c) => (
              <BoardCard
                key={c.id}
                c={c}
                isEditing={editingId === c.id}
                isSelected={selectedId === c.id}
                isDragging={drag?.id === c.id}
                isResizing={resize?.id === c.id}
                controlsOpen={controlsCardId === c.id}
                editText={editText}
                editRef={editRef}
                onDown={onDown}
                onResizeDown={onResizeDown}
                onConnectDown={onConnectDown}
                onStartEdit={startEdit}
                onEditChange={setEditText}
                onFinishEdit={finishEdit}
                onCancelEdit={cancelEdit}
                updateCard={updateCard}
                duplicateCard={duplicateCard}
                removeCard={removeCard}
              />
            ))}
          </div>

          <div
            className="board-panel-transition"
            data-board-ui
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              transform: collapsed.bottom ? "translateY(100%)" : "translateY(0)",
              zIndex: 10,
              pointerEvents: collapsed.bottom ? "none" : "auto",
            }}
          >
            <div style={{ position: "relative", left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8, background: C.white, padding: 8, borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: "0 10px 30px rgba(10,22,40,.12)", width: "min(860px, 96%)", marginBottom: 20, flexWrap: "wrap" }}>
              <button
                type="button"
                data-panel-ui
                aria-label="Hide add-card bar"
                onClick={() => togglePanel("bottom")}
                style={{ ...panelTab, width: PANEL_TAB, height: PANEL_TAB, flexShrink: 0, borderRadius: 6 }}
              >▾</button>
              <select value={theme} onChange={(e) => setTheme(e.target.value)} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "0 8px", fontSize: 13, color: C.navy, background: C.white }}>
                {THEMES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              <input style={{ flex: 1, minWidth: 160, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, outline: "none" }} placeholder="Type a pain point or use case, then Enter" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
              <button style={btn.primarySm} onClick={submit}>Add</button>
              <button style={btn.ghost} onClick={addBlankBox}>Add blank box</button>
            </div>
          </div>

          {collapsed.bottom && (
            <button
              type="button"
              data-panel-ui
              className="board-panel-transition"
              aria-label="Show add-card bar"
              onClick={() => togglePanel("bottom")}
              style={{ ...panelTab, position: "absolute", bottom: 0, left: 24, width: 48, height: PANEL_TAB, borderRadius: "8px 8px 0 0", zIndex: 12 }}
            >▴</button>
          )}

          <div data-board-ui style={{ position: "absolute", right: zoomRight, bottom: zoomBottom, display: "flex", alignItems: "center", gap: 4, zIndex: 10 }}>
            <button style={btn.ghost} onClick={() => zoomStep(-0.15)} aria-label="Zoom out">−</button>
            <span style={{ ...btn.ghost, cursor: "default", minWidth: 52, textAlign: "center", padding: "9px 10px" }}>{Math.round(zoom * 100)}%</span>
            <button style={btn.ghost} onClick={() => zoomStep(0.15)} aria-label="Zoom in">+</button>
            <button style={btn.ghost} onClick={resetView}>Reset</button>
          </div>
        </div>

        <div className="board-panel-transition" style={{ width: collapsed.right ? 0 : RAIL_W, minWidth: collapsed.right ? 0 : RAIL_W, overflow: "hidden", flexShrink: 0, borderLeft: collapsed.right ? "none" : `1px solid ${C.border}` }}>
          <aside style={{ width: RAIL_W, height: "100%", background: C.white, padding: 18, display: "flex", flexDirection: "column", position: "relative", boxSizing: "border-box" }}>
            <button
              type="button"
              data-panel-ui
              aria-label="Hide AI insight panel"
              onClick={() => togglePanel("right")}
              style={{ ...panelTab, position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)", width: PANEL_TAB, height: 40, borderRadius: 6, zIndex: 2 }}
            >›</button>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingLeft: PANEL_TAB + 4 }}>
              <span style={{ fontWeight: 700, color: C.navy, fontFamily: display }}>AI insight</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: C.navy, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: busy.review ? C.yellow : C.mint }}>{busy.review ? "reviewing…" : "live"}</span>
                <InfoButton
                  align="right"
                  title="Refresh review"
                  description="Watches the cards on the board and generates three live insights — the strongest pattern, the biggest AI opportunity, and one gap to probe. Uses the model selected in the header."
                  prompt={() => buildReviewPrompt(cards)}
                />
              </div>
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

        {collapsed.right && (
          <button
            type="button"
            data-panel-ui
            className="board-panel-transition"
            aria-label="Show AI insight panel"
            onClick={() => togglePanel("right")}
            style={{ ...panelTab, position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", width: PANEL_TAB, height: 56, borderRadius: "8px 0 0 8px", zIndex: 20 }}
          >‹</button>
        )}
      </div>

      {showPack && <Pack boards={boards} activeId={activeId} onClose={() => setShowPack(false)} />}
      {showCompare && (
        <CompareModal
          results={compareResults}
          loading={busy.compare}
          onClose={() => { setShowCompare(false); setCompareResults(null); }}
        />
      )}
      {!collapsed.bottom && (
        <div style={{ position: "absolute", left: 16, bottom: 6, fontSize: 11, color: "#9AA3B2", pointerEvents: "none" }}>Replace /public/logos and /public/deck with official assets.</div>
      )}
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

function BoardTakeawayContent({ cards, insight }: { cards: any[]; insight: string }) {
  return (
    <>
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
      {(() => {
        const items = cards.filter((c: any) => !c.theme);
        if (!items.length) return null;
        return (
          <div key="uncategorised" style={{ marginTop: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: C.navy }}><span style={{ width: 12, height: 12, borderRadius: 3, background: C.border, border: `1px solid ${C.border}` }} /> Uncategorised</div>
            <ul style={{ margin: "8px 0 0", paddingLeft: 22 }}>{items.map((c: any) => <li key={c.id} style={{ color: C.navy, marginBottom: 4 }}>{c.text}{c.ai && <span style={{ ...tag.ai, marginLeft: 6 }}>AI</span>}</li>)}</ul>
          </div>
        );
      })()}
      {insight && (
        <div style={{ marginTop: 22, padding: 16, background: C.surface, borderRadius: 10 }}>
          <div style={{ fontWeight: 700, color: C.navy, marginBottom: 6 }}>AI synthesis</div>
          {insight.split("\n").filter(Boolean).map((l: string, k: number) => <p key={k} style={{ margin: "2px 0", color: C.navy, fontSize: 14 }}>{l}</p>)}
        </div>
      )}
    </>
  );
}

function Pack({ boards, activeId, onClose }: { boards: BoardData[]; activeId: string; onClose: () => void }) {
  const [includeAll, setIncludeAll] = useState(false);
  const boardsToShow = includeAll ? boards : boards.filter((b) => b.id === activeId);
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({ boards, activeId }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "mufg-workshop-session.json"; a.click();
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,40,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }} onClick={onClose}>
      <div id="print-area" style={{ background: C.white, borderRadius: 16, padding: 30, width: "min(680px, 96%)", maxHeight: "88vh", overflow: "auto", boxShadow: "0 30px 80px rgba(10,22,40,.3)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><SmartCoLogo scale={0.9} /><MUFGLogo scale={0.9} /></div>
        <h2 style={{ fontFamily: display, color: C.navy, margin: "18px 0 4px", fontSize: 26 }}>Session takeaway</h2>
        <p style={{ color: "#7A8499", marginTop: 0 }}>AI &amp; Delivery Workshop — captured live</p>
        {boardsToShow.map((board, i) => (
          <div key={board.id} style={{ marginTop: i === 0 ? 18 : 28, paddingTop: i === 0 ? 0 : 20, borderTop: i === 0 ? "none" : `1px solid ${C.border}` }}>
            {(includeAll || boards.length > 1) && (
              <h3 style={{ fontFamily: display, color: C.navy, margin: "0 0 8px", fontSize: 18 }}>{board.name}</h3>
            )}
            <BoardTakeawayContent cards={board.cards} insight={board.insight} />
          </div>
        ))}
        <div className="no-print" style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap", alignItems: "center" }}>
          <button style={btn.primarySm} onClick={() => window.print()}>Print / save as PDF</button>
          <button style={btn.ghost} onClick={exportJSON}>Export JSON</button>
          {boards.length > 1 && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.navy, cursor: "pointer" }}>
              <input type="checkbox" checked={includeAll} onChange={(e) => setIncludeAll(e.target.checked)} />
              Include all boards
            </label>
          )}
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
const panelTab: React.CSSProperties = {
  background: C.white,
  color: C.navy,
  border: `1px solid ${C.border}`,
  fontWeight: 700,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  boxShadow: "0 2px 8px rgba(10,22,40,.1)",
  lineHeight: 1,
};
const tag = { ai: { background: C.yellow, color: C.navy, fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 5 } as React.CSSProperties };
