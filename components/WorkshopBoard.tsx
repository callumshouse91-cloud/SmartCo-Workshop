"use client";
import React, { useState, useEffect, useRef, useCallback, useLayoutEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { C, THEMES, SmartCoLogo, MUFGLogo, Corner, callAIResult, parseJSON, type AIProvider, type Theme } from "./brand";
import { AskButton } from "@/components/AskPanel";
import { QuestionsNavLink } from "@/components/QuestionsNavLink";
import { useRegisterAskContext } from "@/components/AskContext";
import { InfoButton } from "@/components/InfoButton";
import {
  buildComparePrompt,
  buildLinkagesPrompt,
  buildReviewPrompt,
  buildSingleSuggestPrompt,
  buildClassifyPrompt,
} from "@/lib/prompts";
import { DECK, getClosingDeck, getWorkingDeck, isImageSlide } from "./deck";
import { renderDeckSlide } from "./IntroSlides";

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
  arrangeBy?: ArrangeByKey;
  duplicateAcrossCategories?: boolean;
  showLinkages?: boolean;
};

type ArrangeByKey = "category" | "dataPoint" | "impact";

const ARRANGE_OPTIONS: { id: ArrangeByKey; label: string }[] = [
  { id: "category", label: "Category" },
  { id: "dataPoint", label: "Data source" },
  { id: "impact", label: "Impact" },
];

type SessionPayload = {
  boards: BoardData[];
  activeId: string;
  customThemes?: Theme[];
  customDataPoints?: string[];
  customImpacts?: string[];
};

const DEFAULT_DATA_POINTS = [
  "SharePoint", "Excel", "Jira", "Confluence", "Outlook/Email", "Teams", "Planview", "ServiceNow", "N/A",
];
const DEFAULT_IMPACTS = [
  "Time / effort", "Cost", "Quality", "Risk / regulatory",
];
const SEVERITY_OPTIONS = ["Low", "Medium", "High", "Critical"] as const;
type ImpactSeverity = (typeof SEVERITY_OPTIONS)[number];
const HOURS_IMPACT_TYPE = "Time / effort";
const SEVERITY_COLORS: Record<ImpactSeverity, string> = {
  Low: C.mint,
  Medium: C.yellow,
  High: C.coral,
  Critical: "#8B1A1A",
};
const ADD_NEW_OPTION = "__add_new__";
const UNSPECIFIED_IMPACT = "Unspecified";

const LEGACY_IMPACT_MAP: Record<string, string> = {
  "hours saved / week": "Time / effort",
  "increased risk": "Risk / regulatory",
  "quality issue": "Quality",
  "regulatory issue": "Risk / regulatory",
  visibility: "Quality",
  insights: "Quality",
  "time / effort": "Time / effort",
  cost: "Cost",
  quality: "Quality",
  "risk / regulatory": "Risk / regulatory",
};

type CardImpact = {
  types: string[];
  hours?: number;
  severity?: ImpactSeverity;
};

const MAX_CATEGORIES = 5;

type WorkshopCard = {
  id: string;
  categories: string[];
  theme: string | null;
  text: string;
  description: string;
  dataPoints: string[];
  impact: CardImpact;
  x: number;
  y: number;
  ai: boolean;
  classifying?: boolean;
  color?: string;
  size?: number;
  w?: number;
  h?: number;
};

function normalizeCategories(raw: any): string[] {
  if (Array.isArray(raw?.categories)) {
    const cleaned = raw.categories
      .filter((id: unknown): id is string => typeof id === "string" && id.trim().length > 0)
      .map((id: string) => id.trim());
    return Array.from(new Set<string>(cleaned)).slice(0, MAX_CATEGORIES);
  }
  const legacy = raw?.theme;
  if (typeof legacy === "string" && legacy.trim()) return [legacy.trim()];
  return [];
}

function syncThemeFromCategories(categories: string[]): string | null {
  return categories.length > 0 ? categories[0] : null;
}

function cardCategories(card: { categories?: string[]; theme?: string | null }): string[] {
  if (card.categories?.length) return card.categories;
  if (card.theme) return [card.theme];
  return [];
}

function primaryCategory(card: { categories?: string[]; theme?: string | null }): string | null {
  return cardCategories(card)[0] ?? null;
}

function mergeStringOptions(defaults: string[], saved?: string[], opts?: { appendNa?: boolean }): string[] {
  const out = [...defaults];
  const seen = new Set(out.map((s) => s.toLowerCase()));
  for (const s of saved ?? []) {
    const t = s?.trim();
    if (!t) continue;
    if (!seen.has(t.toLowerCase())) {
      out.push(t);
      seen.add(t.toLowerCase());
    }
  }
  if (opts?.appendNa && !seen.has("n/a")) out.push("N/A");
  return out;
}

function extractCustomOptions(all: string[], defaults: string[]): string[] {
  const def = new Set(defaults.map((s) => s.toLowerCase()));
  return all.filter((s) => !def.has(s.toLowerCase()));
}

const NA_DATA_POINT = "N/A";

function normalizeDataPoints(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    const cleaned = raw
      .filter((d): d is string => typeof d === "string" && d.trim().length > 0)
      .map((d) => d.trim());
    if (cleaned.length === 0) return [NA_DATA_POINT];
    if (cleaned.some((d) => d.toLowerCase() === "n/a")) return [NA_DATA_POINT];
    return [...new Set(cleaned)];
  }
  if (typeof raw === "string" && raw.trim()) {
    const t = raw.trim();
    if (t.toLowerCase() === "n/a") return [NA_DATA_POINT];
    return [t];
  }
  return [NA_DATA_POINT];
}

function realDataPoints(dataPoints: string[]): string[] {
  return dataPoints.filter((d) => d !== NA_DATA_POINT);
}

function formatDataSourcesSummary(dataPoints: string[]): string | null {
  const real = realDataPoints(dataPoints);
  if (!real.length) return null;
  return real.join(" + ");
}

/** @deprecated use formatDataSourcesSummary */
function formatDataPointsSummary(dataPoints: string[]): string | null {
  return formatDataSourcesSummary(dataPoints);
}

function primaryDataSource(card: WorkshopCard): string {
  const real = realDataPoints(card.dataPoints);
  return real.length ? real[0] : NA_DATA_POINT;
}

function secondaryDataSources(card: WorkshopCard): string[] {
  const real = realDataPoints(card.dataPoints);
  return real.length > 1 ? real.slice(1) : [];
}

type DataSourceLane = { source: string; count: number };

function buildDataSourceLanes(cards: WorkshopCard[]): DataSourceLane[] {
  const counts = new Map<string, number>();
  for (const card of cards) {
    const primary = primaryDataSource(card);
    counts.set(primary, (counts.get(primary) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source, undefined, { sensitivity: "base" }));
}

function dataSourceLaneIndex(lanes: DataSourceLane[], source: string): number {
  return lanes.findIndex((l) => l.source === source);
}

function mapLegacyImpact(value: string): string {
  const mapped = LEGACY_IMPACT_MAP[value.trim().toLowerCase()];
  return mapped ?? value.trim();
}

function normalizeSeverity(raw: unknown): ImpactSeverity | undefined {
  const v = typeof raw === "string" ? raw.trim() : "";
  if (v === "Low" || v === "Medium" || v === "High" || v === "Critical") return v;
  return undefined;
}

function normalizeImpactTypes(raw: unknown, legacyType?: string | null): string[] {
  if (Array.isArray(raw)) {
    const cleaned = raw
      .filter((d): d is string => typeof d === "string" && d.trim().length > 0)
      .map((d) => mapLegacyImpact(d));
    return [...new Set(cleaned)];
  }
  if (legacyType?.trim()) return [mapLegacyImpact(legacyType)];
  if (raw && typeof raw === "object" && "type" in (raw as object)) {
    const t = (raw as { type?: string }).type;
    if (t?.trim()) return [mapLegacyImpact(t)];
  }
  if (typeof raw === "string" && raw.trim()) return [mapLegacyImpact(raw)];
  return [];
}

function normalizeImpact(raw: any): CardImpact {
  const legacyObj = raw?.impact && typeof raw.impact === "object" && !Array.isArray(raw.impact)
    ? raw.impact as { type?: string; types?: unknown; hours?: number; severity?: unknown }
    : null;

  if (legacyObj && Array.isArray(legacyObj.types)) {
    const hours = typeof legacyObj.hours === "number" && legacyObj.hours > 0 ? legacyObj.hours : undefined;
    return {
      types: normalizeImpactTypes(legacyObj.types),
      hours,
      severity: normalizeSeverity(legacyObj.severity),
    };
  }

  if (Array.isArray(raw?.impacts)) {
    const hours = typeof legacyObj?.hours === "number" && legacyObj.hours > 0 ? legacyObj.hours : undefined;
    return {
      types: normalizeImpactTypes(raw.impacts),
      hours,
      severity: normalizeSeverity(legacyObj?.severity),
    };
  }

  if (legacyObj?.type?.trim()) {
    const hours = typeof legacyObj.hours === "number" && legacyObj.hours > 0 ? legacyObj.hours : undefined;
    return {
      types: normalizeImpactTypes(null, legacyObj.type),
      hours,
      severity: normalizeSeverity(legacyObj.severity),
    };
  }

  return { types: [] };
}

function toggleImpactTypes(current: string[], option: string): string[] {
  if (current.includes(option)) return current.filter((d) => d !== option);
  return [...current, option];
}

function primaryImpact(card: WorkshopCard): string {
  return card.impact.types.length ? card.impact.types[0] : UNSPECIFIED_IMPACT;
}

function secondaryImpactTypes(card: WorkshopCard): string[] {
  return card.impact.types.length > 1 ? card.impact.types.slice(1) : [];
}

function formatImpactFaceSummary(impact: CardImpact): string | null {
  const { types, hours, severity } = impact;
  if (!types.length && !severity) return null;
  const parts: string[] = [];
  if (severity) parts.push(severity);
  if (types.length) {
    const typeParts = types.map((t) => {
      if (t === HOURS_IMPACT_TYPE && hours != null && hours > 0) return `${t} · ${hours} hrs/wk`;
      return t;
    });
    parts.push(typeParts.join(" · "));
  }
  return parts.join(" · ");
}

function formatImpactTakeawaySummary(impact: CardImpact): string | null {
  return formatImpactFaceSummary(impact);
}

function impactShowsHours(types: string[]): boolean {
  return types.includes(HOURS_IMPACT_TYPE);
}

type ImpactLane = { impact: string; count: number };

function buildImpactLanes(cards: WorkshopCard[]): ImpactLane[] {
  const counts = new Map<string, number>();
  for (const card of cards) {
    const primary = primaryImpact(card);
    counts.set(primary, (counts.get(primary) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([impact, count]) => ({ impact, count }))
    .sort((a, b) => b.count - a.count || a.impact.localeCompare(b.impact, undefined, { sensitivity: "base" }));
}

function impactLaneIndex(lanes: ImpactLane[], impact: string): number {
  return lanes.findIndex((l) => l.impact === impact);
}

function toggleDataPoints(current: string[], option: string): string[] {
  if (option === NA_DATA_POINT) return [NA_DATA_POINT];
  const withoutNa = current.filter((d) => d !== NA_DATA_POINT);
  if (withoutNa.includes(option)) {
    const next = withoutNa.filter((d) => d !== option);
    return next.length === 0 ? [NA_DATA_POINT] : next;
  }
  return [...withoutNa, option];
}

function removeDataPoint(current: string[], option: string): string[] {
  const next = current.filter((d) => d !== option);
  return next.length === 0 ? [NA_DATA_POINT] : next;
}

function normalizeArrangeBy(raw: unknown): ArrangeByKey | undefined {
  if (raw === "description") return undefined;
  return ARRANGE_OPTIONS.some((o) => o.id === raw) ? (raw as ArrangeByKey) : undefined;
}

function normalizeCard(raw: any): WorkshopCard {
  const text = typeof raw?.text === "string" ? raw.text : "";
  const description = typeof raw?.description === "string" ? raw.description : text;
  const impact = normalizeImpact(raw);
  const categories = normalizeCategories(raw);
  const theme = syncThemeFromCategories(categories);
  return {
    id: raw.id || newId(),
    categories,
    theme,
    text,
    description: description || text,
    dataPoints: normalizeDataPoints(raw?.dataPoints ?? raw?.dataPoint),
    impact,
    x: typeof raw?.x === "number" ? raw.x : 0,
    y: typeof raw?.y === "number" ? raw.y : 0,
    ai: !!raw?.ai,
    classifying: false,
    ...(raw?.color != null ? { color: raw.color } : {}),
    ...(raw?.size != null ? { size: raw.size } : {}),
    ...(raw?.w != null ? { w: raw.w } : {}),
    ...(raw?.h != null ? { h: raw.h } : {}),
  };
}

function columnIndex(theme: string | null, themes: Theme[]): number {
  if (theme == null) return themes.length;
  const i = themes.findIndex((t) => t.id === theme);
  return i < 0 ? themes.length + 1 : i;
}

function layoutCards(
  cards: WorkshopCard[],
  sortBy: ArrangeByKey,
  themes: Theme[],
): WorkshopCard[] {
  const CARD_ROW_H = 122;
  const CARD_Y0 = 80;

  if (sortBy === "dataPoint") {
    const lanes = buildDataSourceLanes(cards);
    if (!lanes.length) return cards;

    const groups = new Map<number, WorkshopCard[]>();
    for (let i = 0; i < lanes.length; i++) groups.set(i, []);

    for (const card of cards) {
      const col = dataSourceLaneIndex(lanes, primaryDataSource(card));
      if (col >= 0) groups.get(col)!.push(card);
    }

    const placed: WorkshopCard[] = [];
    for (let col = 0; col < lanes.length; col++) {
      const colCards = [...(groups.get(col) ?? [])].sort((a, b) =>
        cardDescription(a).localeCompare(cardDescription(b), undefined, { sensitivity: "base" }),
      );
      colCards.forEach((card, row) => {
        placed.push({
          ...card,
          x: SECTION_X0 + col * SECTION_COL_W,
          y: CARD_Y0 + row * CARD_ROW_H,
        });
      });
    }
    return placed;
  }

  if (sortBy === "impact") {
    const lanes = buildImpactLanes(cards);
    if (!lanes.length) return cards;

    const groups = new Map<number, WorkshopCard[]>();
    for (let i = 0; i < lanes.length; i++) groups.set(i, []);

    for (const card of cards) {
      const col = impactLaneIndex(lanes, primaryImpact(card));
      if (col >= 0) groups.get(col)!.push(card);
    }

    const placed: WorkshopCard[] = [];
    for (let col = 0; col < lanes.length; col++) {
      const colCards = [...(groups.get(col) ?? [])].sort((a, b) =>
        cardDescription(a).localeCompare(cardDescription(b), undefined, { sensitivity: "base" }),
      );
      colCards.forEach((card, row) => {
        placed.push({
          ...card,
          x: SECTION_X0 + col * SECTION_COL_W,
          y: CARD_Y0 + row * CARD_ROW_H,
        });
      });
    }
    return placed;
  }

  const groups = new Map<number, WorkshopCard[]>();
  for (const card of cards) {
    const col = columnIndex(primaryCategory(card), themes);
    if (!groups.has(col)) groups.set(col, []);
    groups.get(col)!.push(card);
  }

  const cmp = (a: WorkshopCard, b: WorkshopCard): number =>
    cardDescription(a).localeCompare(cardDescription(b), undefined, { sensitivity: "base" });

  const cols = [...groups.keys()].sort((a, b) => a - b);
  const placed: WorkshopCard[] = [];
  for (const col of cols) {
    const colCards = [...(groups.get(col) ?? [])].sort(cmp);
    colCards.forEach((card, row) => {
      placed.push({
        ...card,
        x: SECTION_X0 + col * SECTION_COL_W,
        y: CARD_Y0 + row * CARD_ROW_H,
      });
    });
  }
  return placed;
}

type CategoryGhost = {
  card: WorkshopCard;
  categoryId: string | null;
  x: number;
  y: number;
};

function computeCategoryGhosts(cards: WorkshopCard[], themes: Theme[]): CategoryGhost[] {
  const CARD_ROW_H = 122;
  const CARD_Y0 = 80;
  const ghosts: CategoryGhost[] = [];
  const cols: { key: string | null; index: number }[] = themes.map((t, i) => ({ key: t.id, index: i }));
  cols.push({ key: null, index: themes.length });

  for (const col of cols) {
    const inColumn = cards.filter((card) => {
      const cats = cardCategories(card);
      if (col.key === null) return cats.length === 0;
      return cats.includes(col.key);
    });
    inColumn.sort((a, b) =>
      cardDescription(a).localeCompare(cardDescription(b), undefined, { sensitivity: "base" }),
    );
    inColumn.forEach((card, row) => {
      const primary = primaryCategory(card);
      const isPrimaryCol = col.key === null ? !primary : primary === col.key;
      if (isPrimaryCol) return;
      ghosts.push({
        card,
        categoryId: col.key,
        x: SECTION_X0 + col.index * SECTION_COL_W,
        y: CARD_Y0 + row * CARD_ROW_H,
      });
    });
  }
  return ghosts;
}

function matchOption(value: string | undefined, options: string[]): string | null {
  if (!value?.trim()) return null;
  const v = value.trim().toLowerCase();
  const exact = options.find((o) => o.toLowerCase() === v);
  if (exact) return exact;
  return options.find((o) => v.includes(o.toLowerCase()) || o.toLowerCase().includes(v)) ?? null;
}

async function fetchClassifyFields(
  seed: string,
  currentTheme: string | null,
  opts: { dataPoints: string[]; impacts: string[]; themes: Theme[]; provider: AIProvider },
): Promise<{ patch: Partial<WorkshopCard>; error?: string }> {
  console.log(`[board-ai] classify-card → provider: ${opts.provider}`);
  const { system, content } = buildClassifyPrompt(seed, {
    dataPoints: opts.dataPoints,
    impacts: opts.impacts,
    themeIds: opts.themes.map((t) => t.id),
  });
  const fallback = { description: seed, dataPoints: [NA_DATA_POINT], impact: { types: [] as string[] } };
  try {
    const { text, error } = await callAIResult(system, content, opts.provider);
    if (error) return { patch: fallback, error };
    const parsed = parseJSON(text) as {
      description?: string;
      dataPoint?: string;
      impact?: { types?: string[]; hours?: number; severity?: string };
      impacts?: string[];
      theme?: string;
    } | null;
    if (!parsed) return { patch: fallback, error: "could not parse response" };
    const matchedDp = matchOption(parsed.dataPoint, opts.dataPoints);
    const patch: Partial<WorkshopCard> = {
      description: typeof parsed.description === "string" && parsed.description.trim() ? parsed.description.trim() : seed,
      dataPoints: matchedDp ? [matchedDp] : [NA_DATA_POINT],
    };
    const rawTypes = Array.isArray(parsed.impact?.types)
      ? parsed.impact.types
      : Array.isArray(parsed.impacts)
        ? parsed.impacts
        : [];
    const matchedTypes = rawTypes
      .map((v) => matchOption(typeof v === "string" ? v : undefined, opts.impacts))
      .filter((v): v is string => !!v);
    const types = normalizeImpactTypes(matchedTypes.length ? matchedTypes : rawTypes);
    const hours = types.includes(HOURS_IMPACT_TYPE) && typeof parsed.impact?.hours === "number" && parsed.impact.hours > 0
      ? parsed.impact.hours
      : undefined;
    patch.impact = {
      types,
      hours,
      severity: normalizeSeverity(parsed.impact?.severity),
    };
    if (currentTheme == null && parsed.theme && opts.themes.some((t) => t.id === parsed.theme)) {
      patch.categories = [parsed.theme];
      patch.theme = parsed.theme;
    }
    return { patch };
  } catch (e) {
    return { patch: fallback, error: String(e) };
  }
}

type ComposerState = {
  mode: "create" | "edit";
  draft: WorkshopCard;
  aiRan: boolean;
};

const COMPOSER_Z = 10002;
const COMPOSER_MENU_Z = COMPOSER_Z + 10;

const chipStyle: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  padding: "2px 6px",
  borderRadius: 4,
  background: C.surface,
  color: "#5A6478",
  border: `1px solid ${C.border}`,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: "46%",
};

const fieldSelectStyle: React.CSSProperties = {
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  padding: "4px 6px",
  fontSize: 11,
  color: C.navy,
  background: C.white,
  fontWeight: 600,
  width: "100%",
  boxSizing: "border-box",
};

function CategoryEditor({
  categories,
  themes,
  onChange,
  onCreateCategory,
}: {
  categories: string[];
  themes: Theme[];
  onChange: (next: string[]) => void;
  onCreateCategory: (label: string) => string | null;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [capHint, setCapHint] = useState(false);

  const toggle = (id: string) => {
    if (categories.includes(id)) {
      onChange(categories.filter((c) => c !== id));
      return;
    }
    if (categories.length >= MAX_CATEGORIES) {
      setCapHint(true);
      window.setTimeout(() => setCapHint(false), 2200);
      return;
    }
    onChange([...categories, id]);
  };

  const chipBase = (selected: boolean): React.CSSProperties => ({
    border: `1.5px solid ${selected ? C.navy : C.border}`,
    background: selected ? C.surface : C.white,
    color: C.navy,
    fontSize: 11,
    fontWeight: selected ? 700 : 600,
    padding: "5px 10px",
    borderRadius: 999,
    cursor: "pointer",
    fontFamily: "inherit",
    lineHeight: 1.3,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: "#7A8499" }}>
        Categories {categories.length > 0 && <span style={{ fontWeight: 600, color: "#9AA3B2" }}>({categories.length}/{MAX_CATEGORIES})</span>}
      </span>
      {capHint && (
        <span style={{ fontSize: 10, fontWeight: 600, color: C.coral }}>Maximum {MAX_CATEGORIES} categories</span>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {themes.map((t) => {
          const order = categories.indexOf(t.id);
          const selected = order >= 0;
          return (
            <button
              key={t.id}
              type="button"
              style={chipBase(selected)}
              onClick={() => toggle(t.id)}
            >
              <span style={{ width: 8, height: 8, borderRadius: 2, background: t.color, flexShrink: 0 }} />
              {t.label}
              {selected && (
                <span style={{
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  background: C.navy,
                  color: C.white,
                  fontSize: 9,
                  fontWeight: 800,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 4px",
                }}>
                  {order + 1}
                </span>
              )}
            </button>
          );
        })}
        {adding ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const label = draft.trim();
                if (label) {
                  const newId = onCreateCategory(label);
                  if (newId && !categories.includes(newId) && categories.length < MAX_CATEGORIES) {
                    onChange([...categories, newId]);
                  }
                }
                setAdding(false);
                setDraft("");
              }
              if (e.key === "Escape") { setAdding(false); setDraft(""); }
            }}
            onBlur={() => { setAdding(false); setDraft(""); }}
            placeholder="New category"
            style={{ ...fieldSelectStyle, fontSize: 11, width: 120, padding: "5px 8px" }}
          />
        ) : (
          <button
            type="button"
            style={{ ...chipBase(false), color: C.blue, borderStyle: "dashed" }}
            onClick={() => setAdding(true)}
          >
            + New category
          </button>
        )}
      </div>
    </div>
  );
}

function ImpactEditor({
  impact,
  impactOptions,
  onChange,
  onAddImpact,
}: {
  impact: CardImpact;
  impactOptions: string[];
  onChange: (next: CardImpact) => void;
  onAddImpact: (label: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const extra = impact.types.filter((t) => !impactOptions.includes(t));
  const options = [...impactOptions, ...extra];

  const toggleType = (opt: string) => {
    const types = toggleImpactTypes(impact.types, opt);
    const next: CardImpact = { ...impact, types };
    if (!impactShowsHours(types)) next.hours = undefined;
    onChange(next);
  };

  const chipBase = (selected: boolean): React.CSSProperties => ({
    border: `1.5px solid ${selected ? C.navy : C.border}`,
    background: selected ? C.surface : C.white,
    color: C.navy,
    fontSize: 11,
    fontWeight: selected ? 700 : 600,
    padding: "5px 10px",
    borderRadius: 999,
    cursor: "pointer",
    fontFamily: "inherit",
    lineHeight: 1.3,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#7A8499" }}>Impact</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              style={chipBase(impact.types.includes(opt))}
              onClick={() => toggleType(opt)}
            >
              {opt}
            </button>
          ))}
          {adding ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const t = draft.trim();
                  if (t) {
                    onAddImpact(t);
                    onChange({ ...impact, types: toggleImpactTypes(impact.types, t) });
                  }
                  setAdding(false);
                  setDraft("");
                }
                if (e.key === "Escape") { setAdding(false); setDraft(""); }
              }}
              onBlur={() => { setAdding(false); setDraft(""); }}
              placeholder="New impact type"
              style={{ ...fieldSelectStyle, fontSize: 11, width: 120, padding: "5px 8px" }}
            />
          ) : (
            <button type="button" style={{ ...chipBase(false), color: C.blue, borderStyle: "dashed" }} onClick={() => setAdding(true)}>
              + Add new…
            </button>
          )}
        </div>
      </div>
      {impactShowsHours(impact.types) && (
        <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 10, fontWeight: 700, color: "#7A8499" }}>
          Hours saved / week
          <input
            type="number"
            min={0}
            step={0.5}
            value={impact.hours ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              const hours = v === "" ? undefined : Math.max(0, Number(v));
              onChange({ ...impact, hours: hours != null && !Number.isNaN(hours) ? hours : undefined });
            }}
            style={{ ...fieldSelectStyle, fontSize: 12 }}
          />
        </label>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#7A8499" }}>Severity</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {SEVERITY_OPTIONS.map((sev) => {
            const selected = impact.severity === sev;
            return (
              <button
                key={sev}
                type="button"
                style={{
                  ...chipBase(selected),
                  borderColor: selected ? SEVERITY_COLORS[sev] : C.border,
                  background: selected ? `${SEVERITY_COLORS[sev]}22` : C.white,
                }}
                onClick={() => onChange({ ...impact, severity: selected ? undefined : sev })}
              >
                {sev}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const DEFAULT_THEME_IDS = new Set(THEMES.map((t) => t.id));

function makeThemeOf(themes: Theme[]) {
  return (id: string | null | undefined): Theme | null =>
    id ? themes.find((t) => t.id === id) ?? null : null;
}

function makeThemeLabel(themes: Theme[]) {
  const resolve = makeThemeOf(themes);
  return (id: string | null | undefined) => resolve(id)?.label ?? "Uncategorised";
}

function extractCustomThemes(themes: Theme[]): Theme[] {
  return themes.filter((t) => !DEFAULT_THEME_IDS.has(t.id));
}

function mergeThemes(saved?: Theme[]): Theme[] {
  const merged: Theme[] = [...THEMES];
  const ids = new Set(merged.map((t) => t.id));
  const labels = new Set(merged.map((t) => t.label.trim().toLowerCase()));
  for (const t of saved ?? []) {
    if (!t?.id || !t?.label || !t?.color) continue;
    if (ids.has(t.id)) continue;
    const norm = t.label.trim().toLowerCase();
    if (labels.has(norm)) continue;
    merged.push({ id: t.id, label: t.label.trim(), color: t.color });
    ids.add(t.id);
    labels.add(norm);
  }
  return merged;
}

function slugifyThemeId(label: string, existing: Set<string>): string {
  let base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!base) base = "category";
  let id = base;
  let n = 2;
  while (existing.has(id)) {
    id = `${base}-${n++}`;
  }
  return id;
}

function cardAccentFor(themes: Theme[]) {
  const resolve = makeThemeOf(themes);
  return (c: { color?: string; theme?: string | null }) =>
    c.color ?? (c.theme ? resolve(c.theme)?.color ?? C.border : C.border);
}

const createBoard = (name: string, cards: any[] = [], links: any[] = [], insight = ""): BoardData => ({
  id: newBoardId(),
  name,
  cards,
  links,
  insight,
  zoom: 1,
  pan: { x: 0, y: 0 },
});

const DEFAULT_AI_PROVIDER: AIProvider = "claude";
const SUGGEST_TEMPERATURE = 0.85;

function isAiUseCasesBoardName(name: string): boolean {
  return /ai\s*use.?cases?/i.test(name) || /^board\s*2$/i.test(name);
}

function findAiUseCasesBoard(boards: BoardData[]): BoardData | undefined {
  return boards.find((b) => isAiUseCasesBoardName(b.name)) ?? boards[1];
}

function getChallengesBoard(boards: BoardData[]): BoardData {
  const named = boards.find((b) => /challenges?|live/i.test(b.name) && !isAiUseCasesBoardName(b.name));
  return named ?? boards[0];
}

function ensureAiUseCasesBoard(boards: BoardData[]): { boards: BoardData[]; boardId: string } {
  const existing = findAiUseCasesBoard(boards);
  if (existing) return { boards, boardId: existing.id };
  const board = createBoard("AI use cases");
  return { boards: [...boards, board], boardId: board.id };
}

const defaultSession = (): SessionPayload => {
  const challenges = createBoard("Live challenges", SEED.map(normalizeCard), [], "");
  const useCases = createBoard("AI use cases", [], [], "");
  return { boards: [challenges, useCases], activeId: challenges.id };
};

const normalizeSession = (v: any): SessionPayload => {
  const customThemes = Array.isArray(v?.customThemes)
    ? v.customThemes.filter((t: Theme) => t?.id && t?.label && t?.color)
    : undefined;
  if (v?.boards?.length) {
    const boards = v.boards.map((b: any, i: number) => ({
      id: b.id || newBoardId(),
      name: b.name || `Board ${i + 1}`,
      cards: Array.isArray(b.cards) ? b.cards.map(normalizeCard) : [],
      links: normalizeLinks(Array.isArray(b.links) ? b.links : []),
      insight: typeof b.insight === "string" ? b.insight : "",
      zoom: typeof b.zoom === "number" ? b.zoom : 1,
      pan: b.pan && typeof b.pan.x === "number" ? b.pan : { x: 0, y: 0 },
      arrangeBy: normalizeArrangeBy(b.arrangeBy),
      duplicateAcrossCategories: b.duplicateAcrossCategories === true ? true : undefined,
      showLinkages: b.showLinkages === false ? false : undefined,
    }));
    const activeId = boards.some((b: BoardData) => b.id === v.activeId) ? v.activeId : boards[0].id;
    return { boards, activeId, customThemes, customDataPoints: v.customDataPoints, customImpacts: v.customImpacts };
  }
  if (v && (Array.isArray(v.cards) || Array.isArray(v.links) || typeof v.insight === "string")) {
    const board = createBoard("Board 1", (v.cards ?? []).map(normalizeCard), normalizeLinks(v.links ?? []), v.insight ?? "");
    return { boards: [board], activeId: board.id, customThemes, customDataPoints: v.customDataPoints, customImpacts: v.customImpacts };
  }
  return { ...defaultSession(), customThemes: undefined, customDataPoints: undefined, customImpacts: undefined };
};

const boardSnapshot = (boards: BoardData[], activeId: string, zoom: number, pan: { x: number; y: number }) =>
  boards.map((b) => (b.id === activeId ? { ...b, zoom, pan } : b));

const cardW = (c: { w?: number }) => c.w ?? CARD_W;
const cardH = (c: { h?: number }) => c.h ?? CARD_H;
const FIT_MIN = 11;
const FIT_MAX = 28;
const EDIT_MIN_W = 340;
const EDIT_MIN_H = 280;
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

const CATEGORY_PALETTE = [
  ...PALETTE,
  { color: C.blueDark, label: "blue-dark" },
  { color: "#9333EA", label: "purple" },
  { color: "#0D9488", label: "teal" },
];

const AI_PROVIDERS: { id: AIProvider; label: string }[] = [
  { id: "claude", label: "Claude" },
  { id: "gemini", label: "Gemini" },
  { id: "gpt", label: "GPT" },
];

const PROVIDER_COLORS: Record<AIProvider, string> = {
  claude: C.blue,
  gemini: C.mint,
  gpt: C.navy,
};

function providerLabel(p: AIProvider): string {
  return AI_PROVIDERS.find((x) => x.id === p)?.label ?? p;
}

function aiErrorMessage(p: AIProvider, detail?: string): string {
  const name = providerLabel(p);
  const d = (detail ?? "").toLowerCase();
  if (!detail || d.includes("api key") || d.includes("not configured") || d.includes("missing")) {
    return `${name}: API key missing or request failed`;
  }
  return `${name}: ${detail}`;
}

type SuggestCandidate = { text: string; justification?: string; error?: string; loading?: boolean };

function parseSuggestCandidate(raw: string, apiError?: string): SuggestCandidate {
  if (apiError) return { text: "", error: "Couldn't generate" };
  const obj = parseJSON(raw) as { text?: string; justification?: string } | null;
  if (obj && typeof obj.text === "string" && obj.text.trim()) {
    return {
      text: obj.text.trim(),
      justification: typeof obj.justification === "string" && obj.justification.trim()
        ? obj.justification.trim()
        : undefined,
    };
  }
  const trimmed = raw?.trim();
  if (trimmed) return { text: trimmed.replace(/^["']|["']$/g, "").slice(0, 160) };
  return { text: "", error: "Couldn't generate" };
}

const findCardAtWorld = (cards: any[], wx: number, wy: number) =>
  cards.find((c) => wx >= c.x && wx <= c.x + cardW(c) && wy >= c.y && wy <= c.y + cardH(c));

function PortaledSelect({
  label,
  value,
  options,
  onChange,
  onAddNew,
  optional,
  optionColors,
  menuZIndex = CARD_MENU_Z,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  onAddNew?: (v: string) => void;
  optional?: boolean;
  optionColors?: Record<string, string>;
  menuZIndex?: number;
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const list = options.some((o) => o.value === value)
    ? options
    : value ? [...options, { value, label: options.find((o) => o.value === value)?.label ?? value }] : options;
  const active = list.find((o) => o.value === value);

  const measurePos = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return null;
    const menu = menuRef.current;
    const r = trigger.getBoundingClientRect();
    const width = Math.max(r.width, 200);
    const gap = 4;
    const menuH = menu?.offsetHeight ?? 160;
    let top = r.bottom + gap;
    if (top + menuH > window.innerHeight - 8) {
      top = Math.max(8, r.top - menuH - gap);
    }
    return {
      left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)),
      top,
      width,
    };
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setAdding(false);
    setDraft("");
    setPos(null);
  }, []);

  const openMenu = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const r = trigger.getBoundingClientRect();
    const width = Math.max(r.width, 200);
    setPos({
      left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)),
      top: Math.max(8, r.bottom + 4),
      width,
    });
    setOpen(true);
    setAdding(false);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const next = measurePos();
    if (next) setPos(next);
    if (adding) inputRef.current?.focus({ preventScroll: true });
  }, [open, adding, list.length, measurePos]);

  useEffect(() => {
    if (!open) return;
    const onReflow = () => { const next = measurePos(); if (next) setPos(next); };
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [open, adding, measurePos]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: Event) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      close();
    };
    const id = requestAnimationFrame(() => {
      document.addEventListener("mousedown", onDoc);
      document.addEventListener("pointerdown", onDoc);
    });
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("pointerdown", onDoc);
    };
  }, [open, close]);

  const itemBtn = (selected: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    border: "none",
    background: selected ? C.surface : "transparent",
    color: C.navy,
    fontSize: 12,
    fontWeight: selected ? 700 : 600,
    padding: "8px 10px",
    cursor: "pointer",
    textAlign: "left",
    fontFamily: "inherit",
  });

  const menu = open && pos ? (
    <div
      ref={menuRef}
      data-card-edit-menu
      data-composer-select-menu={menuZIndex >= COMPOSER_Z ? true : undefined}
      role="listbox"
      style={{
        position: "fixed",
        left: pos.left,
        top: pos.top,
        width: pos.width,
        zIndex: menuZIndex,
        background: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        boxShadow: "0 10px 30px rgba(10,22,40,.14)",
        overflow: "hidden",
        maxHeight: 240,
        overflowY: "auto",
        pointerEvents: "auto",
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {adding ? (
        <div style={{ padding: 10 }}>
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="New option"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const t = draft.trim();
                if (t && onAddNew) { onAddNew(t); onChange(t); }
                close();
              }
              if (e.key === "Escape") setAdding(false);
            }}
            style={{ ...fieldSelectStyle, fontSize: 11 }}
          />
        </div>
      ) : (
        <>
          {optional && (
            <button type="button" style={itemBtn(value === "")} onClick={() => { onChange(""); close(); }}>—</button>
          )}
          {list.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              style={itemBtn(o.value === value)}
              onClick={() => { onChange(o.value); close(); }}
            >
              {optionColors?.[o.value] && (
                <span style={{ width: 8, height: 8, borderRadius: 2, background: optionColors[o.value], flexShrink: 0 }} />
              )}
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.label}</span>
            </button>
          ))}
          {onAddNew && (
            <>
              <div style={{ borderTop: `1px solid ${C.border}` }} />
              <button type="button" style={{ ...itemBtn(false), color: C.blue, fontWeight: 700 }} onClick={() => setAdding(true)}>
                + Add new…
              </button>
            </>
          )}
        </>
      )}
    </div>
  ) : null;

  return (
    <>
      <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 10, fontWeight: 700, color: "#7A8499" }}>
        {label}
        <button
          ref={triggerRef}
          type="button"
          data-composer-select-trigger={menuZIndex >= COMPOSER_Z ? true : undefined}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            if (open) close();
            else openMenu();
          }}
          style={{
            ...fieldSelectStyle,
            display: "flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
            textAlign: "left",
            pointerEvents: "auto",
          }}
        >
          {optionColors?.[value] && (
            <span style={{ width: 8, height: 8, borderRadius: 2, background: optionColors[value], flexShrink: 0 }} />
          )}
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {active?.label ?? (optional && !value ? "—" : value || "Select")}
          </span>
          <span style={{ color: "#9AA3B2", fontSize: 9 }} aria-hidden>▾</span>
        </button>
      </label>
      {typeof document !== "undefined" && menu ? createPortal(menu, document.body) : null}
    </>
  );
}

type MultiSelectBehavior = {
  normalize: (value: string[]) => string[];
  toggle: (current: string[], option: string) => string[];
  remove: (current: string[], option: string) => string[];
  isEmptyDisplay: (current: string[]) => boolean;
  emptyLabel: string;
};

const DATA_SOURCE_MULTI: MultiSelectBehavior = {
  normalize: normalizeDataPoints,
  toggle: toggleDataPoints,
  remove: removeDataPoint,
  isEmptyDisplay: (v) => v.length === 0 || (v.length === 1 && v[0] === NA_DATA_POINT),
  emptyLabel: "N/A",
};


function PortaledMultiSelect({
  label,
  value,
  options,
  onChange,
  onAddNew,
  menuZIndex = CARD_MENU_Z,
  behavior = DATA_SOURCE_MULTI,
}: {
  label: string;
  value: string[];
  options: { value: string; label: string }[];
  onChange: (v: string[]) => void;
  onAddNew?: (v: string) => void;
  menuZIndex?: number;
  behavior?: MultiSelectBehavior;
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = behavior.normalize(value);
  const extraValues = selected.filter((v) => !options.some((o) => o.value === v));
  const list = [
    ...options,
    ...extraValues.map((v) => ({ value: v, label: v })),
  ];

  const measurePos = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return null;
    const menu = menuRef.current;
    const r = trigger.getBoundingClientRect();
    const width = Math.max(r.width, 200);
    const gap = 4;
    const menuH = menu?.offsetHeight ?? 160;
    let top = r.bottom + gap;
    if (top + menuH > window.innerHeight - 8) {
      top = Math.max(8, r.top - menuH - gap);
    }
    return {
      left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)),
      top,
      width,
    };
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setAdding(false);
    setDraft("");
    setPos(null);
  }, []);

  const openMenu = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const r = trigger.getBoundingClientRect();
    const width = Math.max(r.width, 200);
    setPos({
      left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)),
      top: Math.max(8, r.bottom + 4),
      width,
    });
    setOpen(true);
    setAdding(false);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const next = measurePos();
    if (next) setPos(next);
    if (adding) inputRef.current?.focus({ preventScroll: true });
  }, [open, adding, list.length, measurePos]);

  useEffect(() => {
    if (!open) return;
    const onReflow = () => { const next = measurePos(); if (next) setPos(next); };
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [open, adding, measurePos]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: Event) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      close();
    };
    const id = requestAnimationFrame(() => {
      document.addEventListener("mousedown", onDoc);
      document.addEventListener("pointerdown", onDoc);
    });
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("pointerdown", onDoc);
    };
  }, [open, close]);

  const itemBtn = (checked: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    border: "none",
    background: checked ? C.surface : "transparent",
    color: C.navy,
    fontSize: 12,
    fontWeight: checked ? 700 : 600,
    padding: "8px 10px",
    cursor: "pointer",
    textAlign: "left",
    fontFamily: "inherit",
  });

  const isChecked = (opt: string) => selected.includes(opt);

  const menu = open && pos ? (
    <div
      ref={menuRef}
      data-card-edit-menu
      data-composer-select-menu={menuZIndex >= COMPOSER_Z ? true : undefined}
      role="listbox"
      aria-multiselectable
      style={{
        position: "fixed",
        left: pos.left,
        top: pos.top,
        width: pos.width,
        zIndex: menuZIndex,
        background: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        boxShadow: "0 10px 30px rgba(10,22,40,.14)",
        overflow: "hidden",
        maxHeight: 240,
        overflowY: "auto",
        pointerEvents: "auto",
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {adding ? (
        <div style={{ padding: 10 }}>
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="New option"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const t = draft.trim();
                if (t && onAddNew) {
                  onAddNew(t);
                  onChange(behavior.toggle(selected, t));
                }
                setAdding(false);
                setDraft("");
              }
              if (e.key === "Escape") setAdding(false);
            }}
            style={{ ...fieldSelectStyle, fontSize: 11 }}
          />
        </div>
      ) : (
        <>
          {list.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={isChecked(o.value)}
              style={itemBtn(isChecked(o.value))}
              onClick={() => onChange(behavior.toggle(selected, o.value))}
            >
              <span style={{ width: 14, flexShrink: 0, textAlign: "center", color: C.blue, fontSize: 11 }} aria-hidden>
                {isChecked(o.value) ? "✓" : ""}
              </span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.label}</span>
            </button>
          ))}
          {onAddNew && (
            <>
              <div style={{ borderTop: `1px solid ${C.border}` }} />
              <button type="button" style={{ ...itemBtn(false), color: C.blue, fontWeight: 700 }} onClick={() => setAdding(true)}>
                + Add new…
              </button>
            </>
          )}
        </>
      )}
    </div>
  ) : null;

  const chipBtnStyle: React.CSSProperties = {
    ...chipStyle,
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    maxWidth: "100%",
    paddingRight: 2,
  };

  const displayValues = selected;

  return (
    <>
      <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 10, fontWeight: 700, color: "#7A8499" }}>
        {label}
        <button
          ref={triggerRef}
          type="button"
          data-composer-select-trigger={menuZIndex >= COMPOSER_Z ? true : undefined}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            if (open) close();
            else openMenu();
          }}
          style={{
            ...fieldSelectStyle,
            display: "flex",
            alignItems: "center",
            gap: 4,
            cursor: "pointer",
            textAlign: "left",
            pointerEvents: "auto",
            minHeight: 28,
            flexWrap: "wrap",
          }}
        >
          <span style={{ flex: 1, display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center", minWidth: 0 }}>
            {behavior.isEmptyDisplay(displayValues) ? (
              <span style={{ color: "#9AA3B2", fontWeight: 600 }}>{behavior.emptyLabel}</span>
            ) : (
              displayValues.map((v) => (
                <span
                  key={v}
                  style={chipBtnStyle}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{v}</span>
                  <span
                    role="button"
                    tabIndex={-1}
                    aria-label={`Remove ${v}`}
                    style={{ border: "none", background: "transparent", color: "#9AA3B2", cursor: "pointer", padding: "0 2px", fontSize: 12, lineHeight: 1 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(behavior.remove(selected, v));
                    }}
                  >×</span>
                </span>
              ))
            )}
          </span>
          <span style={{ color: "#9AA3B2", fontSize: 9, flexShrink: 0 }} aria-hidden>▾</span>
        </button>
      </label>
      {typeof document !== "undefined" && menu ? createPortal(menu, document.body) : null}
    </>
  );
}

function CardComposerModal({
  mode,
  draft,
  classifying,
  themes,
  dataPoints,
  impacts,
  onDraftChange,
  onCategoriesChange,
  onCreateCategory,
  onAddDataPoint,
  onAddImpact,
  onDone,
  onCancel,
}: {
  mode: "create" | "edit";
  draft: WorkshopCard;
  classifying: boolean;
  themes: Theme[];
  dataPoints: string[];
  impacts: string[];
  onDraftChange: (patch: Partial<WorkshopCard>) => void;
  onCategoriesChange: (categories: string[]) => void;
  onCreateCategory: (label: string) => string | null;
  onAddDataPoint: (v: string) => void;
  onAddImpact: (v: string) => void;
  onDone: () => void;
  onCancel: () => void;
}) {
  const accent = themes.find((t) => t.id === draft.theme)?.color ?? C.border;
  const desc = cardDescription(draft);

  const modal = (
    <div
      role="dialog"
      aria-modal
      aria-labelledby="card-composer-title"
      style={{ position: "fixed", inset: 0, background: "rgba(10,22,40,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: COMPOSER_Z, padding: 20 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      onPointerDown={(e) => { if (e.target === e.currentTarget) e.stopPropagation(); }}
    >
      <div
        data-card-composer
        style={{
          background: C.white,
          borderRadius: 16,
          width: "min(560px, 96%)",
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 30px 80px rgba(10,22,40,.3)",
          border: `1px solid ${C.border}`,
          display: "flex",
          flexDirection: "column",
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "20px 24px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
            <h2 id="card-composer-title" style={{ fontFamily: display, color: C.navy, margin: 0, fontSize: 20 }}>
              {mode === "create" ? "New card" : "Edit card"}
            </h2>
            {draft.ai && <span style={tag.ai}>AI</span>}
          </div>
          {classifying && (
            <p style={{ margin: "8px 0 0", fontSize: 12, fontWeight: 600, color: C.blue }}>
              AI is suggesting fields…
            </p>
          )}
        </div>

        <div style={{ padding: "16px 24px", flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              borderRadius: 12,
              border: `1px solid ${C.border}`,
              borderTop: `4px solid ${accent}`,
              padding: "12px 14px",
              background: C.surface,
              opacity: classifying ? 0.75 : 1,
              transition: "opacity 0.2s",
            }}
          >
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 10, fontWeight: 700, color: "#7A8499" }}>
              Pain point / description
              <textarea
                value={desc}
                onChange={(e) => {
                  const v = e.target.value;
                  onDraftChange({ description: v, text: v });
                }}
                rows={4}
                placeholder="Describe the pain point or friction…"
                autoFocus
                style={{
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: "8px 10px",
                  fontSize: 14,
                  lineHeight: 1.4,
                  color: C.navy,
                  background: C.white,
                  fontFamily: "inherit",
                  resize: "vertical",
                  minHeight: 88,
                  outline: "none",
                  boxSizing: "border-box",
                  width: "100%",
                }}
              />
            </label>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, opacity: classifying ? 0.6 : 1, transition: "opacity 0.2s" }}>
            <CategoryEditor
              categories={draft.categories}
              themes={themes}
              onChange={onCategoriesChange}
              onCreateCategory={onCreateCategory}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "start" }}>
              <PortaledMultiSelect
                label="Data source"
                value={draft.dataPoints}
                options={dataPoints.map((d) => ({ value: d, label: d }))}
                onChange={(v) => onDraftChange({ dataPoints: v })}
                onAddNew={onAddDataPoint}
                menuZIndex={COMPOSER_MENU_Z}
              />
              <ImpactEditor
                impact={draft.impact}
                impactOptions={impacts}
                onChange={(impact) => onDraftChange({ impact })}
                onAddImpact={onAddImpact}
              />
            </div>
          </div>
        </div>

        <div
          style={{
            padding: "14px 24px 20px",
            borderTop: `1px solid ${C.border}`,
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            flexShrink: 0,
            background: C.white,
            borderRadius: "0 0 16px 16px",
          }}
        >
          <button type="button" onClick={onCancel} style={btn.ghost}>Cancel</button>
          <button type="button" onClick={onDone} style={btn.primarySm}>Done</button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modal, document.body) : null;
}

function BoardCard({
  c, isSelected, isDragging, isResizing, controlsOpen, linkDrawMode, arrangeBy, ghost,
  onDown, onResizeDown, onConnectDown, onStartEdit,
  updateCard, duplicateCard, removeCard,
  themeOf, getCardAccent,
}: {
  c: WorkshopCard;
  isSelected: boolean;
  isDragging: boolean;
  isResizing: boolean;
  controlsOpen: boolean;
  linkDrawMode: boolean;
  arrangeBy: ArrangeByKey;
  ghost?: boolean;
  onDown: (e: React.PointerEvent, id: string) => void;
  onResizeDown: (e: React.PointerEvent, id: string) => void;
  onConnectDown: (e: React.PointerEvent, id: string) => void;
  onStartEdit: (c: WorkshopCard) => void;
  updateCard: (id: string, patch: Record<string, unknown>) => void;
  duplicateCard: (id: string) => void;
  removeCard: (id: string) => void;
  themeOf: (id: string | null | undefined) => Theme | null;
  getCardAccent: (c: { color?: string; theme?: string | null }) => string;
}) {
  const categories = cardCategories(c);
  const t = themeOf(c.theme);
  const uncategorised = categories.length === 0;
  const accent = getCardAccent(c);
  const displayW = cardDisplayW(c, false);
  const displayH = cardDisplayH(c, false);
  const maxFs = sizeCapMax(c);
  const desc = cardDescription(c);
  const textRef = useRef<HTMLDivElement>(null);
  const [fitSize, setFitSize] = useState(maxFs);
  const dataChipLabels = arrangeBy === "dataPoint" ? secondaryDataSources(c) : realDataPoints(c.dataPoints);
  const showDataChips = dataChipLabels.length > 0;
  const impactSummary = arrangeBy === "impact"
    ? (() => {
        const parts: string[] = [];
        if (c.impact.severity) parts.push(c.impact.severity);
        const sec = secondaryImpactTypes(c);
        if (sec.length) parts.push(sec.join(" · "));
        return parts.length ? parts.join(" · ") : null;
      })()
    : formatImpactFaceSummary(c.impact);
  const showImpactChip = !!impactSummary;

  const remeasure = useCallback(() => {
    const el = textRef.current;
    if (!el) return;
    setFitSize(fitFontSize(el, maxFs));
  }, [maxFs, desc, displayW, displayH]);

  useLayoutEffect(() => { remeasure(); }, [remeasure]);

  const handleCardPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (ghost) {
      onDown(e, c.id);
      return;
    }
    const target = e.target as HTMLElement;
    if (target.closest("[data-card-action]") || target.closest("[data-handle]")) return;
    onDown(e, c.id);
  };

  const actionBtn: React.CSSProperties = { border: "none", background: "transparent", color: "#9AA3B2", padding: 2, cursor: "pointer", display: "flex", alignItems: "center", lineHeight: 1 };
  const sizeTransition = isDragging || isResizing ? "none" : "width 0.32s cubic-bezier(.2,.8,.2,1), height 0.32s cubic-bezier(.2,.8,.2,1)";

  return (
    <div
      data-card={ghost ? undefined : true}
      data-card-ghost={ghost ? true : undefined}
      className={`board-card${isSelected && !ghost ? " card-selected" : ""}${linkDrawMode ? " card-link-mode" : ""}`}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: displayW,
        transform: `translate(${c.x}px, ${c.y}px)`,
        transition: isDragging || isResizing ? "none" : "transform .45s cubic-bezier(.2,.8,.2,1)",
        zIndex: ghost ? 3 : (isDragging || isSelected ? 20 : 5),
        pointerEvents: ghost ? "none" : "auto",
      }}
    >
      <div
        className="card-pop"
        style={{
          position: "relative",
          width: displayW,
          height: displayH,
          transition: sizeTransition,
          background: C.white,
          border: `1px solid ${C.border}`,
          borderTop: uncategorised ? `2px solid ${C.border}` : `4px solid ${accent}`,
          borderRadius: 12,
          padding: "10px 12px",
          boxShadow: "0 6px 18px rgba(10,22,40,.08)",
          cursor: ghost ? "default" : "grab",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          opacity: ghost ? 0.52 : 1,
        }}
        onPointerDown={ghost ? undefined : handleCardPointerDown}
      >
        {ghost && (
          <span style={{
            position: "absolute",
            top: 6,
            right: 8,
            fontSize: 9,
            fontWeight: 700,
            color: "#7A8499",
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 4,
            padding: "1px 5px",
            zIndex: 2,
            pointerEvents: "none",
          }}>
            ↗ also here
          </span>
        )}
        <div
          data-card-header
          style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, flexShrink: 0, cursor: "default" }}
        >
          {categories.length > 1 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
              {categories.map((catId, i) => {
                const th = themeOf(catId);
                if (!th) return null;
                return (
                  <span
                    key={catId}
                    title={`${i + 1}. ${th.label}`}
                    style={{ position: "relative", width: 14, height: 14, flexShrink: 0 }}
                  >
                    <span style={{ display: "block", width: 14, height: 14, borderRadius: "50%", background: th.color, border: `1px solid ${C.border}` }} />
                    <span style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 8,
                      fontWeight: 800,
                      color: C.white,
                      textShadow: "0 0 2px rgba(0,0,0,.45)",
                    }}>
                      {i + 1}
                    </span>
                  </span>
                );
              })}
            </div>
          ) : !uncategorised && t ? (
            <span style={{ color: C.white, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: t.color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 100 }}>{t.label}</span>
          ) : null}
          {c.ai && <span style={tag.ai}>AI</span>}
          {!ghost && (
            <>
              <button className="card-dup" data-card-action style={{ marginLeft: "auto", border: `1px solid ${C.border}`, background: C.white, color: C.navy, fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 5, cursor: "pointer", lineHeight: 1.4 }} onPointerDown={(e) => e.stopPropagation()} onClick={() => duplicateCard(c.id)} title="Duplicate">⧉</button>
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
              <button data-card-action style={{ border: "none", background: "transparent", color: "#9AA3B2", fontSize: 18, lineHeight: 1, cursor: "pointer" }} onPointerDown={(e) => e.stopPropagation()} onClick={() => removeCard(c.id)}>×</button>
            </>
          )}
        </div>

        {controlsOpen && !ghost && (
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

        <div data-card-body style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div
            ref={textRef}
            style={{ flex: 1, fontSize: fitSize, lineHeight: 1.35, color: C.navy, overflow: "hidden", wordBreak: "break-word" }}
          >{desc}</div>
          {(showDataChips || showImpactChip) && (
            <div style={{ display: "flex", gap: 4, flexShrink: 0, marginTop: 6, flexWrap: "wrap" }}>
              {dataChipLabels.map((dp) => (
                <span key={dp} style={chipStyle}>{dp}</span>
              ))}
              {showImpactChip && (
                <span style={chipStyle}>{impactSummary}</span>
              )}
            </div>
          )}
        </div>

        {!ghost && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}

const WORKING_DECK = getWorkingDeck();
const CLOSING_DECK = getClosingDeck();

export default function WorkshopBoard() {
  const [mode, setMode] = useState<"intro" | "board">("intro");
  const [deckPhase, setDeckPhase] = useState<"working" | "closing">("working");
  const [slideIndex, setSlideIndex] = useState(0);

  const handleEnterBoard = () => {
    setSlideIndex(WORKING_DECK.length - 1);
    setMode("board");
  };

  const handleBackToDeck = () => {
    setDeckPhase("working");
    setSlideIndex(WORKING_DECK.length - 1);
    setMode("intro");
  };

  const handleEndSession = () => {
    if (
      !window.confirm(
        "End the working session and open the closing slides (Next Steps)?\n\nYou can return to the workshop board if this was accidental.",
      )
    ) {
      return;
    }
    setDeckPhase("closing");
    setSlideIndex(0);
    setMode("intro");
  };

  const handleBackToBoardFromClosing = () => {
    setMode("board");
  };

  return (
    <div style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", color: C.navy, height: "100vh", width: "100%", overflow: "hidden", background: C.white }}>
      {mode === "intro" ? (
        <Intro
          deck={deckPhase === "closing" ? CLOSING_DECK : WORKING_DECK}
          slideIndex={slideIndex}
          onSlideIndexChange={setSlideIndex}
          deckPhase={deckPhase}
          onEnter={handleEnterBoard}
          onBackToBoard={handleBackToBoardFromClosing}
        />
      ) : (
        <Board onBack={handleBackToDeck} onEndSession={handleEndSession} />
      )}
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

function Intro({
  deck,
  slideIndex,
  onSlideIndexChange,
  deckPhase,
  onEnter,
  onBackToBoard,
}: {
  deck: typeof DECK;
  slideIndex: number;
  onSlideIndexChange: (index: number) => void;
  deckPhase: "working" | "closing";
  onEnter: () => void;
  onBackToBoard: () => void;
}) {
  const i = slideIndex;
  const setI = onSlideIndexChange;
  const s = deck[i];
  const last = i === deck.length - 1;
  const imageSlide = isImageSlide(s);
  const isText = !imageSlide;
  const slideKind = isText && "kind" in s ? (s as { kind: string }).kind : null;
  const isBlueSlide = slideKind === "hero" || slideKind === "credentials";
  const heroTitle = (
    <h1 className="intro-title intro-slide-hero-title">
      <span className="intro-title-part" style={{ animationDelay: "0.32s" }}>SmartCo</span>
      <span className="intro-title-part intro-title-x" style={{ animationDelay: "0.41s" }} aria-hidden="true">×</span>
      <span className="intro-title-part" style={{ animationDelay: "0.50s" }}>MUFG</span>
      <span className="intro-title-part" style={{ animationDelay: "0.59s" }}>{" — AI & Delivery Workshop"}</span>
    </h1>
  );

  return (
    <div className={`intro-deck${isBlueSlide ? " intro-deck--blue" : ""}`}>
      {isText && !isBlueSlide && (
        <div className="intro-deck-ambient">
          <IntroAmbient />
        </div>
      )}

      <header className="intro-deck-header">
        <div className={isText ? "intro-enter intro-logo-left" : undefined}>
          <SmartCoLogo scale={isBlueSlide ? 1 : 1} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {deckPhase === "closing" && (
            <button
              type="button"
              className={isText ? "intro-enter" : undefined}
              style={{ ...btn.ghost, padding: "7px 12px", fontSize: 12, animationDelay: "0.12s" }}
              onClick={onBackToBoard}
            >
              ← Back to workshop board
            </button>
          )}
          {!isBlueSlide && deckPhase === "working" && (
            <button
              type="button"
              className={isText ? "intro-enter" : undefined}
              style={{ ...btn.ghost, padding: "7px 12px", fontSize: 12, animationDelay: "0.15s" }}
              onClick={onEnter}
            >
              Enter workshop board
            </button>
          )}
          <div className={isText ? "intro-enter intro-logo-right" : undefined}>
            <MUFGLogo />
          </div>
        </div>
      </header>

      <main className="intro-deck-main">
        {imageSlide ? (
          <div key={i} className="enter-up intro-slide-fit" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
            <img src={s.image} alt={`Slide ${i + 1}`} style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 12, boxShadow: "0 18px 50px rgba(10,22,40,.14)", objectFit: "contain" }} />
            {!isText && <Corner />}
          </div>
        ) : (
          <div key={i} className="intro-deck-slide-wrap">
            {renderDeckSlide(s, onEnter, heroTitle)}
          </div>
        )}
      </main>

      {imageSlide && s.cta && last && (
        <div style={{ position: "absolute", right: 40, bottom: 72, zIndex: 11 }}>
          <button className="enter-up" style={btn.primary} onClick={onEnter}>{s.cta} →</button>
        </div>
      )}

      <footer className="intro-deck-footer">
        {!isBlueSlide && (
          <div className="intro-deck-footer-brand" aria-hidden>
            <SmartCoLogo scale={0.72} />
          </div>
        )}
        <div className="intro-deck-footer-nav">
          <button type="button" className="intro-deck-nav-btn" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}>Back</button>
          <div className="intro-deck-dots">
            {deck.map((_, k) => (
              <button
                key={k}
                type="button"
                aria-label={`Go to slide ${k + 1}`}
                aria-current={k === i ? "step" : undefined}
                onClick={() => setI(k)}
                className={`intro-deck-dot${k === i ? " intro-deck-dot--active" : ""}`}
              />
            ))}
          </div>
          {!last ? (
            <button type="button" className="intro-deck-nav-btn" onClick={() => setI(Math.min(deck.length - 1, i + 1))}>Next</button>
          ) : (
            <span className="intro-deck-nav-spacer" aria-hidden />
          )}
        </div>
      </footer>
    </div>
  );
}

const SECTION_COL_W = 280;
const SECTION_X0 = 70;
function cardDescription(c: { description?: string; text?: string }) {
  return (c.description ?? c.text ?? "").trim();
}

const CATEGORY_POPOVER_Z = 10000;
const CARD_MENU_Z = CATEGORY_POPOVER_Z + 1;

function ImpactIcon({ name }: { name: string }) {
  const glyphs: Record<string, string> = {
    "Time / effort": "T",
    Cost: "$",
    Quality: "Q",
    "Risk / regulatory": "!",
    [UNSPECIFIED_IMPACT]: "—",
  };
  const glyph = glyphs[name] ?? name.slice(0, 1).toUpperCase();
  return (
    <span
      aria-hidden
      style={{
        width: 22,
        height: 22,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 5,
        background: C.surface,
        border: `1px solid ${C.border}`,
        fontSize: 10,
        fontWeight: 800,
        color: C.navy,
        flexShrink: 0,
      }}
    >
      {glyph}
    </span>
  );
}

function ImpactSectionColumns({ lanes }: { lanes: ImpactLane[] }) {
  return (
    <>
      {lanes.map((lane, index) => (
        <div
          key={lane.impact}
          style={{
            position: "absolute",
            left: SECTION_X0 + index * SECTION_COL_W,
            top: 8,
            width: SECTION_COL_W - 4,
            pointerEvents: "none",
            zIndex: 0,
            boxSizing: "border-box",
            padding: "0 4px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: C.white,
              boxShadow: "0 2px 8px rgba(10,22,40,.06)",
            }}
          >
            <ImpactIcon name={lane.impact} />
            <span
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: 12,
                fontWeight: 700,
                color: C.navy,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {lane.impact}
            </span>
            <span
              aria-label={`${lane.count} cards`}
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: C.navy,
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 999,
                padding: "2px 8px",
                minWidth: 24,
                textAlign: "center",
                flexShrink: 0,
              }}
            >
              {lane.count}
            </span>
          </div>
        </div>
      ))}
    </>
  );
}

function DataSourceIcon({ name }: { name: string }) {
  const glyphs: Record<string, string> = {
    SharePoint: "SP",
    Excel: "XL",
    Jira: "JR",
    Confluence: "CF",
    "Outlook/Email": "@",
    Teams: "TM",
    Planview: "PV",
    ServiceNow: "SN",
    [NA_DATA_POINT]: "—",
  };
  const glyph = glyphs[name] ?? name.slice(0, 2).toUpperCase();
  return (
    <span
      aria-hidden
      style={{
        width: 22,
        height: 22,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 5,
        background: C.surface,
        border: `1px solid ${C.border}`,
        fontSize: 9,
        fontWeight: 800,
        color: C.navy,
        flexShrink: 0,
        letterSpacing: "-0.02em",
      }}
    >
      {glyph}
    </span>
  );
}

function DataSourceSectionColumns({ lanes }: { lanes: DataSourceLane[] }) {
  return (
    <>
      {lanes.map((lane, index) => (
        <div
          key={lane.source}
          style={{
            position: "absolute",
            left: SECTION_X0 + index * SECTION_COL_W,
            top: 8,
            width: SECTION_COL_W - 4,
            pointerEvents: "none",
            zIndex: 0,
            boxSizing: "border-box",
            padding: "0 4px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: C.white,
              boxShadow: "0 2px 8px rgba(10,22,40,.06)",
            }}
          >
            <DataSourceIcon name={lane.source} />
            <span
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: 12,
                fontWeight: 700,
                color: C.navy,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {lane.source}
            </span>
            <span
              aria-label={`${lane.count} cards`}
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: C.navy,
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 999,
                padding: "2px 8px",
                minWidth: 24,
                textAlign: "center",
                flexShrink: 0,
              }}
            >
              {lane.count}
            </span>
          </div>
        </div>
      ))}
    </>
  );
}

function ThemeSectionColumns({ themes }: { themes: Theme[] }) {
  const columns: { key: string; label: string; color: string; index: number }[] = themes.map((t, i) => ({
    key: t.id,
    label: t.label,
    color: t.color,
    index: i,
  }));
  columns.push({ key: "uncategorised", label: "Uncategorised", color: C.border, index: themes.length });

  return (
    <>
      {columns.map((col) => (
        <div
          key={col.key}
          style={{
            position: "absolute",
            left: SECTION_X0 + col.index * SECTION_COL_W + 12,
            top: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
            pointerEvents: "none",
            zIndex: 0,
            maxWidth: SECTION_COL_W - 24,
          }}
        >
          <span style={{ width: 10, height: 10, borderRadius: 2, background: col.color, flexShrink: 0, border: col.key === "uncategorised" ? `1px solid ${C.border}` : "none" }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#7A8499", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {col.label}
          </span>
        </div>
      ))}
    </>
  );
}

function CategoryDropdown({
  themes,
  value,
  onChange,
  onCreateCategory,
}: {
  themes: Theme[];
  value: string;
  onChange: (id: string) => void;
  onCreateCategory: (label: string) => string | null;
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const active = themes.find((t) => t.id === value);

  const measurePos = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return null;
    const menu = menuRef.current;
    const r = trigger.getBoundingClientRect();
    const width = Math.max(r.width, 240);
    const gap = 6;
    const menuH = menu?.offsetHeight ?? 200;
    const left = Math.max(12, Math.min(r.left, window.innerWidth - width - 12));
    const top = Math.max(12, r.top - menuH - gap);
    return { left, top, width };
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setCreating(false);
    setDraft("");
    setPos(null);
  }, []);

  const openMenu = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const r = trigger.getBoundingClientRect();
    const width = Math.max(r.width, 240);
    const estH = 200;
    setPos({
      left: Math.max(12, Math.min(r.left, window.innerWidth - width - 12)),
      top: Math.max(12, r.top - estH - 6),
      width,
    });
    setCreating(false);
    setDraft("");
    setOpen(true);
  }, []);

  const cancelCreate = useCallback(() => {
    setCreating(false);
    setDraft("");
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const next = measurePos();
    if (next) setPos(next);
    if (creating) inputRef.current?.focus({ preventScroll: true });
  }, [open, creating, themes.length, measurePos]);

  useEffect(() => {
    if (!open) return;
    const onReflow = () => {
      const next = measurePos();
      if (next) setPos(next);
    };
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [open, creating, measurePos]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (creating) cancelCreate();
      else close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, creating, close, cancelCreate]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      close();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, close]);

  const handleCreate = () => {
    if (onCreateCategory(draft)) close();
  };

  const itemStyle = (selected: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    border: "none",
    background: selected ? C.surface : "transparent",
    color: C.navy,
    fontSize: 13,
    fontWeight: selected ? 700 : 600,
    padding: "9px 12px",
    cursor: "pointer",
    textAlign: "left",
    fontFamily: "inherit",
  });

  const menu = open && pos ? (
    <div
      ref={menuRef}
      role="listbox"
      aria-label="Category"
      style={{
        position: "fixed",
        left: pos.left,
        top: pos.top,
        width: pos.width,
        zIndex: CATEGORY_POPOVER_Z,
        background: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        boxShadow: "0 10px 30px rgba(10,22,40,.12)",
        overflow: "hidden",
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {creating ? (
        <div style={{ padding: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 8 }}>New category</div>
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Category label"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") cancelCreate();
            }}
            style={{
              width: "100%",
              boxSizing: "border-box",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "8px 10px",
              fontSize: 13,
              color: C.navy,
              outline: "none",
              marginBottom: 10,
            }}
          />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" style={btn.ghost} onClick={cancelCreate}>Cancel</button>
            <button type="button" style={btn.primarySm} onClick={handleCreate} disabled={!draft.trim()}>Create</button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {themes.map((t) => {
              const selected = t.id === value;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  style={itemStyle(selected)}
                  onClick={() => { onChange(t.id); close(); }}
                >
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: t.color, flexShrink: 0 }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.label}</span>
                </button>
              );
            })}
          </div>
          <div style={{ borderTop: `1px solid ${C.border}` }}>
            <button
              type="button"
              style={{ ...itemStyle(false), color: C.blue, fontWeight: 700 }}
              onClick={() => { setCreating(true); setDraft(""); }}
            >
              + Add category
            </button>
          </div>
        </>
      )}
    </div>
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? close() : openMenu())}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: "9px 10px",
          fontSize: 13,
          color: C.navy,
          background: C.white,
          fontWeight: 600,
          flexShrink: 0,
          cursor: "pointer",
          fontFamily: "inherit",
          maxWidth: 200,
        }}
      >
        {active && (
          <span style={{ width: 10, height: 10, borderRadius: 2, background: active.color, flexShrink: 0 }} />
        )}
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {active?.label ?? "Category"}
        </span>
        <span style={{ marginLeft: "auto", color: "#9AA3B2", fontSize: 10, flexShrink: 0 }} aria-hidden>▾</span>
      </button>
      {typeof document !== "undefined" && menu ? createPortal(menu, document.body) : null}
    </>
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

function Board({ onBack, onEndSession }: { onBack: () => void; onEndSession: () => void }) {
  const initial = defaultSession();
  const [boards, setBoards] = useState<BoardData[]>(initial.boards);
  const [activeId, setActiveId] = useState(initial.activeId);
  const [themes, setThemes] = useState<Theme[]>(THEMES);
  const [dataPoints, setDataPoints] = useState(DEFAULT_DATA_POINTS);
  const [impacts, setImpacts] = useState(DEFAULT_IMPACTS);
  const [renamingBoardId, setRenamingBoardId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const renameOriginal = useRef("");
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  const activeBoard = boards.find((b) => b.id === activeId) ?? boards[0];
  const cards = activeBoard?.cards ?? [];
  const links = activeBoard?.links ?? [];
  const insight = activeBoard?.insight ?? "";
  const arrangeBy: ArrangeByKey = normalizeArrangeBy(activeBoard?.arrangeBy) ?? "category";
  const duplicateAcrossCategories = activeBoard?.duplicateAcrossCategories === true;
  const showLinkages = activeBoard?.showLinkages !== false;
  const dataSourceLanes = useMemo(
    () => (arrangeBy === "dataPoint" ? buildDataSourceLanes(cards as WorkshopCard[]) : []),
    [arrangeBy, cards],
  );
  const impactLanes = useMemo(
    () => (arrangeBy === "impact" ? buildImpactLanes(cards as WorkshopCard[]) : []),
    [arrangeBy, cards],
  );
  const categoryGhosts = useMemo(
    () => (arrangeBy === "category" && duplicateAcrossCategories
      ? computeCategoryGhosts(cards as WorkshopCard[], themes)
      : []),
    [arrangeBy, duplicateAcrossCategories, cards, themes],
  );

  const boardCtxRef = useRef({ boards, activeId });
  boardCtxRef.current = { boards, activeId };
  const themesRef = useRef(themes);
  themesRef.current = themes;

  const resolveTheme = useMemo(() => makeThemeOf(themes), [themes]);
  const resolveThemeLabel = useMemo(() => makeThemeLabel(themes), [themes]);
  const getCardAccent = useMemo(() => cardAccentFor(themes), [themes]);

  useRegisterAskContext({
    label: "Include current board",
    getContext: () => {
      const { boards: bs, activeId: aid } = boardCtxRef.current;
      const board = bs.find((b) => b.id === aid) ?? bs[0];
      if (!board) return null;
      const labelFn = makeThemeLabel(themesRef.current);
      const lines = (board.cards || []).map((c: WorkshopCard) =>
        `[${labelFn(c.theme)}] ${cardDescription(c)}`
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
  const [aiToast, setAiToast] = useState<string | null>(null);
  const [busy, setBusy] = useState({ review: false, links: false, ideas: false, compare: false });
  const [showPack, setShowPack] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [compareResults, setCompareResults] = useState<Record<AIProvider, { text: string; error?: string; loading?: boolean }> | null>(null);
  const [showSuggestPicker, setShowSuggestPicker] = useState(false);
  const [suggestCandidates, setSuggestCandidates] = useState<Record<AIProvider, SuggestCandidate> | null>(null);
  const [selectedSuggestProvider, setSelectedSuggestProvider] = useState<AIProvider | null>(null);
  const [suggestCategory, setSuggestCategory] = useState("accelerate");
  const [drag, setDrag] = useState<any>(null);
  const [resize, setResize] = useState<{ id: string; startWx: number; startWy: number; startW: number; startH: number } | null>(null);
  const [connecting, setConnecting] = useState<{ fromId: string } | null>(null);
  const [connectCursor, setConnectCursor] = useState<{ x: number; y: number } | null>(null);
  const [linkDrawMode, setLinkDrawMode] = useState(false);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panDrag, setPanDrag] = useState<{ sx: number; sy: number; spx: number; spy: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composer, setComposer] = useState<ComposerState | null>(null);
  const composerClassifyRef = useRef(0);
  const [controlsCardId, setControlsCardId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState({ top: false, right: false, bottom: false });
  const canvasRef = useRef<HTMLDivElement>(null);
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

  const showAiError = useCallback((detail?: string) => {
    setAiToast(aiErrorMessage(DEFAULT_AI_PROVIDER, detail));
  }, []);

  useEffect(() => {
    if (!aiToast) return;
    const t = setTimeout(() => setAiToast(null), 5500);
    return () => clearTimeout(t);
  }, [aiToast]);

  zoomPanRef.current = { zoom, panX: pan.x, panY: pan.y };

  useEffect(() => {
    (async () => {
      const apply = (raw: any) => {
        const session = normalizeSession(raw);
        setBoards(session.boards);
        setActiveId(session.activeId);
        setThemes(mergeThemes(session.customThemes));
        setDataPoints(mergeStringOptions(DEFAULT_DATA_POINTS, session.customDataPoints, { appendNa: true }));
        setImpacts(mergeStringOptions(DEFAULT_IMPACTS, session.customImpacts));
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
    const payload: SessionPayload = {
      boards: boardSnapshot(boards, activeId, zoom, pan).map((b) => ({
        ...b,
        cards: b.cards.map((c) => {
          const { classifying, ...rest } = c as WorkshopCard;
          return rest;
        }),
      })),
      activeId,
      customThemes: extractCustomThemes(themes),
      customDataPoints: extractCustomOptions(dataPoints, DEFAULT_DATA_POINTS),
      customImpacts: extractCustomOptions(impacts, DEFAULT_IMPACTS),
    };
    try { localStorage.setItem(STORE_KEY, JSON.stringify(payload)); } catch {}
    const t = setTimeout(() => {
      fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: WORKSHOP_ID, data: payload }),
      }).catch(() => {});
    }, 600);
    return () => clearTimeout(t);
  }, [boards, activeId, zoom, pan, themes, dataPoints, impacts]);

  const addDataPoint = useCallback((label: string) => {
    const t = label.trim();
    if (!t || t.toLowerCase() === "n/a") return;
    setDataPoints((prev) => (prev.some((p) => p.toLowerCase() === t.toLowerCase()) ? prev : [...prev, t]));
  }, []);

  const addImpact = useCallback((label: string) => {
    const t = label.trim();
    if (!t) return;
    setImpacts((prev) => (prev.some((p) => p.toLowerCase() === t.toLowerCase()) ? prev : [...prev, t]));
  }, []);

  useEffect(() => {
    if (!themes.some((t) => t.id === theme)) {
      setTheme(themes[0]?.id ?? "accelerate");
    }
  }, [themes, theme]);

  const createCategory = useCallback((label: string): string | null => {
    const trimmed = label.trim();
    if (!trimmed) return null;
    const norm = trimmed.toLowerCase();
    const existing = themes.find((t) => t.label.trim().toLowerCase() === norm);
    if (existing) return existing.id;
    const ids = new Set(themes.map((t) => t.id));
    const id = slugifyThemeId(trimmed, ids);
    const color = CATEGORY_PALETTE[themes.length % CATEGORY_PALETTE.length].color;
    const newTheme: Theme = { id, label: trimmed, color };
    setThemes((prev) => [...prev, newTheme]);
    setTheme(id);
    return id;
  }, [themes]);

  useEffect(() => {
    if (!cards.length) return;
    const t = setTimeout(() => runReview(), 1600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards]);

  const updateCard = useCallback((id: string, patch: Record<string, unknown>) => {
    setCards((c) => c.map((x) => {
      if (x.id !== id) return x;
      const next = { ...x, ...patch } as WorkshopCard;
      if (Array.isArray(patch.categories)) {
        next.categories = patch.categories.slice(0, MAX_CATEGORIES);
        next.theme = syncThemeFromCategories(next.categories);
      }
      return next;
    }));
  }, [setCards]);

  const makeDraftCard = useCallback((opts: { text?: string; theme?: string | null; ai?: boolean; pos?: { x: number; y: number } }): WorkshopCard => {
    const categories = opts.theme ? [opts.theme] : [];
    const th = syncThemeFromCategories(categories);
    const txt = (opts.text ?? "").trim();
    const reg = th == null ? themes.length : themes.findIndex((x) => x.id === th);
    const col = reg < 0 ? themes.length : reg;
    return {
      id: newId(),
      categories,
      theme: th,
      text: txt,
      description: txt,
      dataPoints: [NA_DATA_POINT],
      impact: { types: [] },
      x: opts.pos?.x ?? SECTION_X0 + col * SECTION_COL_W + Math.random() * 40,
      y: opts.pos?.y ?? 320 + Math.random() * 140,
      ai: !!opts.ai,
      classifying: false,
    };
  }, [themes]);

  const openComposerCreate = useCallback((opts: { text?: string; theme?: string | null; ai?: boolean; pos?: { x: number; y: number } }) => {
    const draft = makeDraftCard(opts);
    setComposer({ mode: "create", draft, aiRan: false });
    setSelectedId(null);
    setControlsCardId(null);
  }, [makeDraftCard]);

  const openComposerEdit = useCallback((c: WorkshopCard) => {
    setComposer({ mode: "edit", draft: { ...c }, aiRan: true });
    setSelectedId(c.id);
    setControlsCardId(null);
  }, []);

  const updateComposerDraft = useCallback((patch: Partial<WorkshopCard>) => {
    setComposer((prev) => (prev ? { ...prev, draft: { ...prev.draft, ...patch } } : null));
  }, []);

  const composerCategoriesChange = useCallback((categories: string[]) => {
    const synced = categories.slice(0, MAX_CATEGORIES);
    const theme = syncThemeFromCategories(synced);
    const col = columnIndex(theme, themes);
    updateComposerDraft({
      categories: synced,
      theme,
      x: SECTION_X0 + col * SECTION_COL_W + 20 + Math.random() * 40,
    });
  }, [themes, updateComposerDraft]);

  const runComposerClassify = useCallback(async (seed: string, currentTheme: string | null) => {
    const reqId = ++composerClassifyRef.current;
    setComposer((prev) => {
      if (!prev || prev.mode !== "create" || prev.aiRan) return prev;
      return { ...prev, aiRan: true, draft: { ...prev.draft, classifying: true } };
    });
    try {
      const { patch, error } = await fetchClassifyFields(seed, currentTheme, { dataPoints, impacts, themes, provider: DEFAULT_AI_PROVIDER });
      if (error) showAiError(error);
      if (composerClassifyRef.current !== reqId) return;
      setComposer((prev) => {
        if (!prev) return null;
        const nextDraft = { ...prev.draft, ...patch, classifying: false };
        if (patch.theme && prev.draft.categories.length === 0 && themes.some((t) => t.id === patch.theme)) {
          const col = columnIndex(patch.theme, themes);
          nextDraft.categories = patch.categories ?? [patch.theme];
          nextDraft.theme = patch.theme;
          nextDraft.x = SECTION_X0 + col * SECTION_COL_W + 20 + Math.random() * 40;
        }
        return { ...prev, draft: nextDraft };
      });
    } catch {
      if (composerClassifyRef.current === reqId) {
        setComposer((prev) => (prev ? { ...prev, draft: { ...prev.draft, classifying: false } } : null));
      }
    }
  }, [dataPoints, impacts, themes, showAiError]);

  useEffect(() => {
    if (!composer || composer.mode !== "create" || composer.aiRan) return;
    const seed = composer.draft.text?.trim() || composer.draft.description?.trim();
    if (!seed) return;
    const timer = setTimeout(() => { void runComposerClassify(seed, composer.draft.theme); }, 500);
    return () => clearTimeout(timer);
  }, [composer, runComposerClassify]);

  const composerDone = useCallback(() => {
    if (!composer) return;
    const d = composer.draft;
    const desc = cardDescription(d).trim();
    if (!desc) {
      setComposer(null);
      return;
    }
    const final: WorkshopCard = {
      ...d,
      categories: d.categories ?? (d.theme ? [d.theme] : []),
      theme: syncThemeFromCategories(d.categories ?? (d.theme ? [d.theme] : [])),
      text: d.text?.trim() || desc,
      description: desc,
      classifying: false,
    };
    if (composer.mode === "create") {
      setCards((c) => [...c, final]);
      setSelectedId(final.id);
    } else {
      updateCard(final.id, {
        text: final.text,
        description: final.description,
        categories: final.categories,
        theme: final.theme,
        dataPoints: final.dataPoints,
        impact: final.impact,
        x: final.x,
        y: final.y,
        ai: final.ai,
      });
    }
    setComposer(null);
  }, [composer, setCards, updateCard]);

  const composerCancel = useCallback(() => {
    composerClassifyRef.current += 1;
    setComposer(null);
  }, []);

  const setShowLinkages = useCallback((visible: boolean) => {
    setBoards((bs) => bs.map((b) => (b.id === activeIdRef.current ? { ...b, showLinkages: visible } : b)));
  }, []);

  const cancelConnecting = useCallback(() => {
    setConnecting(null);
    setConnectCursor(null);
  }, []);

  useEffect(() => {
    if (!composer) return;
    setDrag(null);
    setPanDrag(null);
    setResize(null);
    cancelConnecting();
  }, [composer, cancelConnecting]);

  const toggleLinkDrawMode = useCallback(() => {
    setLinkDrawMode((on) => {
      if (on) cancelConnecting();
      return !on;
    });
  }, [cancelConnecting]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (connecting) {
          e.preventDefault();
          cancelConnecting();
          return;
        }
        if (linkDrawMode) {
          e.preventDefault();
          setLinkDrawMode(false);
          return;
        }
      }
      if (composer) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedLinkId) {
        e.preventDefault();
        setLinks((l) => l.filter((link) => link.id !== selectedLinkId));
        setSelectedLinkId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedLinkId, composer, connecting, linkDrawMode, cancelConnecting, setLinks]);

  const setDuplicateAcrossCategories = useCallback((on: boolean) => {
    setBoards((bs) => bs.map((b) => (
      b.id === activeIdRef.current ? { ...b, duplicateAcrossCategories: on } : b
    )));
  }, []);

  const applyArrange = useCallback((sortBy: ArrangeByKey) => {
    setBoards((bs) => bs.map((b) => {
      if (b.id !== activeIdRef.current) return b;
      return { ...b, arrangeBy: sortBy, cards: layoutCards(b.cards as WorkshopCard[], sortBy, themes) };
    }));
  }, [themes]);

  const submit = () => {
    openComposerCreate({ text: text.trim(), theme });
    setText("");
  };
  const removeCard = (id: string) => {
    setCards((c) => c.filter((x) => x.id !== id));
    setLinks((l) => l.filter((x) => x.a !== id && x.b !== id));
    if (selectedId === id) setSelectedId(null);
    if (composer?.mode === "edit" && composer.draft.id === id) setComposer(null);
  };

  const startEdit = (c: WorkshopCard) => openComposerEdit(c);

  const duplicateCard = (id: string) => {
    const c = cards.find((x) => x.id === id);
    if (!c) return;
    const copy = { ...c, id: newId(), x: c.x + 24, y: c.y + 24, classifying: false };
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
    setComposer(null);
    setLinkDrawMode(false);
    cancelConnecting();
    setSelectedId(null);
    setSelectedLinkId(null);
    setControlsCardId(null);
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
      openComposerCreate({ pos: { x: wx - CARD_W / 2, y: wy - CARD_H / 2 } });
    } else {
      openComposerCreate({});
    }
  }, [openComposerCreate, toWorld]);

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
    if (composer) return;
    if (connecting) {
      cancelConnecting();
      return;
    }
    if (e.button !== 0) return;
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
    openComposerCreate({ theme, pos: { x: wx - CARD_W / 2, y: wy - CARD_H / 2 } });
  };

  const onDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    if (composer) return;
    const t = e.target as HTMLElement;
    if (t.closest("[data-card-action]") || t.closest("[data-handle]")) return;
    const c = cards.find((x) => x.id === id);
    if (!c) return;
    if (!t.closest(".card-controls-popover") && !t.closest("[data-card-header]")) setControlsCardId(null);
    setSelectedId(id);

    if (linkDrawMode) {
      if (connecting) {
        if (connecting.fromId !== id) {
          setLinks((l) => [
            ...l,
            { id: newLinkId(), a: connecting.fromId, b: id, manual: true, color: C.navy, style: "solid" as const },
          ]);
        }
        cancelConnecting();
      } else {
        setConnecting({ fromId: id });
        setConnectCursor({
          x: c.x + cardDisplayW(c, false) / 2,
          y: c.y + cardDisplayH(c, false) / 2,
        });
      }
      return;
    }

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
    if (!drag || composer) return;
    const { x: wx, y: wy } = toWorld(e.clientX, e.clientY);
    const x = wx - drag.dx;
    const y = wy - drag.dy;
    setCards((c) => c.map((x0) => (x0.id === drag.id ? { ...x0, x, y } : x0)));
  };

  const onUp = (e?: React.PointerEvent) => {
    if (connecting) {
      if (e) {
        const { x: wx, y: wy } = toWorld(e.clientX, e.clientY);
        const target = findCardAtWorld(cards, wx, wy);
        if (target && target.id !== connecting.fromId) {
          setLinks((l) => [
            ...l,
            { id: newLinkId(), a: connecting.fromId, b: target.id, manual: true, color: C.navy, style: "solid" as const },
          ]);
        }
      }
      cancelConnecting();
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

  const reviewPrompt = () => buildReviewPrompt(cards, resolveThemeLabel);

  async function runReview() {
    if (busy.review || !cards.length) return;
    setBusy((b) => ({ ...b, review: true }));
    console.log(`[board-ai] review → provider: ${DEFAULT_AI_PROVIDER}`);
    try {
      const { system, content } = reviewPrompt();
      const { text, error } = await callAIResult(system, content, DEFAULT_AI_PROVIDER);
      if (error) {
        showAiError(error);
        setInsight("—");
      } else {
        setInsight(text || "—");
      }
    } finally {
      setBusy((b) => ({ ...b, review: false }));
    }
  }

  async function compareModels() {
    if (busy.compare || !cards.length) return;
    setShowCompare(true);
    setBusy((b) => ({ ...b, compare: true }));
    const loading = { text: "", loading: true };
    setCompareResults({ claude: { ...loading }, gemini: { ...loading }, gpt: { ...loading } });
    const { system, content } = buildComparePrompt(cards, resolveThemeLabel);
    try {
      const results = await Promise.all(
        AI_PROVIDERS.map(async ({ id }) => {
          console.log(`[board-ai] compare → provider: ${id}`);
          const { text, error } = await callAIResult(system, content, id);
          return { id, text: text || (error ? `— ${error}` : "— No response"), error };
        })
      );
      const mapped = {} as Record<AIProvider, { text: string; error?: string; loading?: boolean }>;
      results.forEach((r) => { mapped[r.id] = { text: r.text, error: r.error, loading: false }; });
      setCompareResults(mapped);
    } finally {
      setBusy((b) => ({ ...b, compare: false }));
    }
  }

  async function mapLinks() {
    if (busy.links || cards.length < 2) return;
    setBusy((b) => ({ ...b, links: true }));
    console.log(`[board-ai] map-linkages → provider: ${DEFAULT_AI_PROVIDER}`);
    try {
      const { system, content } = buildLinkagesPrompt(cards);
      const { text, error } = await callAIResult(system, content, DEFAULT_AI_PROVIDER);
      if (error) {
        showAiError(error);
      } else {
        const arr = parseJSON(text);
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
      }
    } finally {
      setBusy((b) => ({ ...b, links: false }));
    }
  }

  async function runSuggestForCategory(categoryId: string) {
    setBusy((b) => ({ ...b, ideas: true }));
    setSelectedSuggestProvider(null);
    const loading: SuggestCandidate = { text: "", loading: true };
    setSuggestCandidates({ claude: { ...loading }, gemini: { ...loading }, gpt: { ...loading } });

    const categoryName = resolveThemeLabel(categoryId);
    const challengesBoard = getChallengesBoard(boards);
    const aiBoard = findAiUseCasesBoard(boards);
    const challengeCards = challengesBoard?.cards ?? [];
    const suggestedCards = aiBoard?.cards ?? [];
    const categorySuggestedCards = suggestedCards.filter((c) => c.theme === categoryId);

    const tasks = AI_PROVIDERS.map(({ id }) =>
      (async () => {
        const { system, content } = buildSingleSuggestPrompt(
          challengeCards,
          suggestedCards,
          categoryName,
          categorySuggestedCards,
          id,
          resolveThemeLabel,
        );
        const { text, error } = await callAIResult(system, content, id, { temperature: SUGGEST_TEMPERATURE });
        const snippet = (error ? `error: ${error}` : text || "(empty)").slice(0, 160);
        console.log(`[board-ai] suggest-use-case → provider: ${id}, category: ${categoryName}, raw: ${snippet}`);
        const candidate = parseSuggestCandidate(text, error);
        setSuggestCandidates((prev) => ({
          ...(prev ?? { claude: loading, gemini: loading, gpt: loading }),
          [id]: { ...candidate, loading: false },
        }));
        if (candidate.text && !candidate.error) {
          setSelectedSuggestProvider((sel) => sel ?? id);
        }
      })()
    );

    await Promise.all(tasks);
    setBusy((b) => ({ ...b, ideas: false }));
  }

  async function suggestIdeas() {
    if (busy.ideas) return;
    setShowSuggestPicker(true);
    setSuggestCategory(theme);
    await runSuggestForCategory(theme);
  }

  const onSuggestCategoryChange = (categoryId: string) => {
    setSuggestCategory(categoryId);
    if (showSuggestPicker && !busy.ideas) void runSuggestForCategory(categoryId);
  };

  const closeSuggestPicker = () => {
    setShowSuggestPicker(false);
    setSuggestCandidates(null);
    setSelectedSuggestProvider(null);
  };

  const confirmSuggestPick = () => {
    if (!selectedSuggestProvider || !suggestCandidates) return;
    const candidate = suggestCandidates[selectedSuggestProvider];
    if (!candidate?.text || candidate.error) return;

    const col = columnIndex(suggestCategory, themes);
    const card: WorkshopCard = {
      id: newId(),
      categories: [suggestCategory],
      theme: suggestCategory,
      text: candidate.text,
      description: candidate.justification
        ? `${candidate.text}\n\n${candidate.justification}`
        : candidate.text,
      dataPoints: [NA_DATA_POINT],
      impact: { types: [] },
      x: SECTION_X0 + col * SECTION_COL_W + 20 + Math.random() * 40,
      y: 320 + Math.random() * 140,
      ai: true,
      classifying: false,
    };

    const { boards: nextBoards, boardId } = ensureAiUseCasesBoard(boardSnapshot(boards, activeId, zoom, pan));
    setBoards(
      nextBoards.map((b) => (b.id === boardId ? { ...b, cards: [...b.cards, card] } : b))
    );
    setActiveId(boardId);
    setSelectedId(card.id);
    closeSuggestPicker();
  };

  const center = (c: WorkshopCard) => ({
    x: c.x + cardDisplayW(c, false) / 2,
    y: c.y + cardDisplayH(c, false) / 2,
  });

  const linkSlots = pairSlotMaps(links as LinkData[]);

  const bottomDockShadow = "0 10px 30px rgba(10,22,40,.12)";
  const bottomPill: React.CSSProperties = {
    background: C.white,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    boxShadow: bottomDockShadow,
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.surface, position: "relative", overflow: "hidden" }}>
      {aiToast && (
        <div
          role="alert"
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 100,
            background: C.navy,
            color: C.white,
            fontSize: 13,
            fontWeight: 600,
            padding: "10px 18px",
            borderRadius: 10,
            boxShadow: "0 12px 32px rgba(10,22,40,.25)",
            maxWidth: "min(420px, 92vw)",
            textAlign: "center",
          }}
        >
          {aiToast}
        </div>
      )}
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
            <button
              type="button"
              style={{ ...btn.ghost, borderColor: C.coral, color: C.coral, fontWeight: 700 }}
              onClick={onEndSession}
            >
              End session
            </button>
            <SmartCoLogo scale={0.85} />
            <span style={{ color: C.border }}>×</span>
            <MUFGLogo scale={0.85} />
            <InfoButton
              title="Workshop board"
              description="Capture pains and ideas on a themed whiteboard. Drag cards, draw links between them, and edit inline. Your board autosaves to Supabase every few seconds, with localStorage as an offline fallback."
            />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Link href="/tooling" style={{ ...btn.ghost, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Tooling map</Link>
            <QuestionsNavLink style={{ textDecoration: "none" }} />
            <AskButton />
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <button style={btn.ai(C.yellow)} onClick={compareModels} disabled={busy.compare || !cards.length}>{busy.compare ? "Comparing…" : "Compare models"}</button>
              <InfoButton
                align="right"
                title="Compare models"
                description="Sends the same prompt to Claude, Gemini, and GPT in parallel and shows the three answers side by side for comparison."
                prompt={() => buildComparePrompt(cards, resolveThemeLabel)}
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
              <button style={btn.ai(C.mint)} onClick={suggestIdeas} disabled={busy.ideas}>{busy.ideas ? "Thinking…" : "Suggest use case"}</button>
              <InfoButton
                align="right"
                title="Suggest use case"
                description="Asks Claude, Gemini, and GPT for task-level use cases tailored to the selected category goal. Pick one, then add it to the AI use-cases board."
                prompt={() => {
                  const challengesBoard = getChallengesBoard(boards);
                  const aiBoard = findAiUseCasesBoard(boards);
                  const suggested = aiBoard?.cards ?? [];
                  const categoryName = resolveThemeLabel(theme);
                  return buildSingleSuggestPrompt(
                    challengesBoard?.cards ?? [],
                    suggested,
                    categoryName,
                    suggested.filter((c) => c.theme === theme),
                    "claude",
                    resolveThemeLabel,
                  );
                }}
              />
            </span>
            <label style={{ ...btn.ai(C.navy), display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              Arrange by
              <select
                value={arrangeBy}
                onChange={(e) => applyArrange(e.target.value as ArrangeByKey)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: C.navy,
                  fontWeight: 700,
                  fontSize: 13,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                {ARRANGE_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </label>
            {arrangeBy === "category" && (
              <label style={{ ...btn.ghost, display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", ...(duplicateAcrossCategories ? { background: C.surface, borderColor: C.navy, fontWeight: 700 } : {}) }}>
                <input
                  type="checkbox"
                  checked={duplicateAcrossCategories}
                  onChange={(e) => setDuplicateAcrossCategories(e.target.checked)}
                  style={{ accentColor: C.navy, cursor: "pointer" }}
                />
                Duplicate across categories
              </label>
            )}
            <button
              type="button"
              style={{
                ...btn.ghost,
                ...(showLinkages ? { background: C.surface, borderColor: C.navy, fontWeight: 700 } : {}),
              }}
              aria-pressed={showLinkages}
              onClick={() => {
                setShowLinkages(!showLinkages);
                if (showLinkages) setSelectedLinkId(null);
              }}
            >
              {showLinkages ? "Linkages on" : "Linkages off"}
            </button>
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
          style={{
            position: "relative",
            flex: 1,
            overflow: "hidden",
            touchAction: "none",
            cursor: composer ? "default" : linkDrawMode || connecting ? "crosshair" : panDrag ? "grabbing" : drag ? "grabbing" : "grab",
            pointerEvents: composer ? "none" : "auto",
          }}
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
            {arrangeBy === "dataPoint" ? (
              <DataSourceSectionColumns lanes={dataSourceLanes} />
            ) : arrangeBy === "impact" ? (
              <ImpactSectionColumns lanes={impactLanes} />
            ) : (
              <ThemeSectionColumns themes={themes} />
            )}
            <svg style={{ position: "absolute", top: 0, left: 0, width: WORLD_W, height: WORLD_H, pointerEvents: "none", overflow: "visible", zIndex: 1 }}>
              {showLinkages && links.map((l) => {
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
              {showLinkages && connecting && connectCursor && (() => {
                const from = cards.find((c) => c.id === connecting.fromId);
                if (!from) return null;
                const pa = center(from);
                return (
                  <line x1={pa.x} y1={pa.y} x2={connectCursor.x} y2={connectCursor.y} stroke={C.navy} strokeWidth="2" strokeDasharray="6 4" pointerEvents="none" />
                );
              })()}
            </svg>

            {categoryGhosts.map((g) => (
              <BoardCard
                key={`ghost-${g.card.id}-${g.categoryId ?? "uncategorised"}`}
                c={{ ...g.card, x: g.x, y: g.y }}
                arrangeBy={arrangeBy}
                ghost
                isSelected={false}
                isDragging={false}
                isResizing={false}
                controlsOpen={false}
                linkDrawMode={linkDrawMode}
                onDown={() => {}}
                onResizeDown={() => {}}
                onConnectDown={() => {}}
                onStartEdit={() => {}}
                updateCard={updateCard}
                duplicateCard={duplicateCard}
                removeCard={removeCard}
                themeOf={resolveTheme}
                getCardAccent={getCardAccent}
              />
            ))}
            {cards.map((c) => (
              <BoardCard
                key={c.id}
                c={c}
                arrangeBy={arrangeBy}
                isSelected={selectedId === c.id}
                isDragging={drag?.id === c.id}
                isResizing={resize?.id === c.id}
                controlsOpen={controlsCardId === c.id}
                linkDrawMode={linkDrawMode}
                onDown={onDown}
                onResizeDown={onResizeDown}
                onConnectDown={onConnectDown}
                onStartEdit={startEdit}
                updateCard={updateCard}
                duplicateCard={duplicateCard}
                removeCard={removeCard}
                themeOf={resolveTheme}
                getCardAccent={getCardAccent}
              />
            ))}
          </div>

          <div
            className="board-panel-transition"
            data-board-ui
            style={{
              position: "absolute",
              left: 0,
              right: collapsed.right ? PANEL_TAB : 0,
              bottom: 0,
              zIndex: 10,
              padding: `0 clamp(8px, 1.5vw, 16px) 28px`,
              pointerEvents: "auto",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 12,
                width: "100%",
                justifyContent: collapsed.bottom ? "flex-end" : "stretch",
              }}
            >
              <div
                className="board-panel-transition"
                style={{
                  flex: collapsed.bottom ? "0 0 0" : 1,
                  minWidth: 0,
                  overflow: "hidden",
                  maxHeight: collapsed.bottom ? 0 : 200,
                  opacity: collapsed.bottom ? 0 : 1,
                  pointerEvents: collapsed.bottom ? "none" : "auto",
                }}
              >
                <div
                  style={{
                    ...bottomPill,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    data-panel-ui
                    aria-label="Hide add-card bar"
                    onClick={() => togglePanel("bottom")}
                    style={{ ...panelTab, width: PANEL_TAB, height: PANEL_TAB, flexShrink: 0, borderRadius: 6 }}
                  >▾</button>
                  <CategoryDropdown
                    themes={themes}
                    value={theme}
                    onChange={setTheme}
                    onCreateCategory={createCategory}
                  />
                  <input
                    style={{ flex: "1 1 120px", minWidth: 0, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, outline: "none" }}
                    placeholder="Type a pain point or use case, then Enter"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submit()}
                  />
                  <button type="button" style={{ ...btn.primarySm, flexShrink: 0 }} onClick={submit}>Add</button>
                  <InfoButton
                    title="Add card"
                    description="Adds a card immediately, then AI expands it into a description and guesses the data source and impact. All fields stay fully editable on the card."
                    prompt={() => buildClassifyPrompt(text.trim() || "Example pain point", {
                      dataPoints,
                      impacts,
                      themeIds: themes.map((t) => t.id),
                    })}
                  />
                  <button type="button" style={{ ...btn.ghost, flexShrink: 0 }} onClick={addBlankBox}>Add blank box</button>
                </div>
              </div>

              <div
                style={{
                  ...bottomPill,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "6px 8px",
                  flexShrink: 0,
                }}
              >
                <button type="button" style={btn.ghost} onClick={() => zoomStep(-0.15)} aria-label="Zoom out">−</button>
                <span style={{ ...btn.ghost, cursor: "default", minWidth: 52, textAlign: "center", padding: "9px 10px" }}>{Math.round(zoom * 100)}%</span>
                <button type="button" style={btn.ghost} onClick={() => zoomStep(0.15)} aria-label="Zoom in">+</button>
                <button type="button" style={btn.ghost} onClick={resetView}>Reset</button>
                <button
                  type="button"
                  style={{
                    ...btn.ghost,
                    ...(linkDrawMode ? { background: C.surface, borderColor: C.navy, fontWeight: 700 } : {}),
                  }}
                  aria-pressed={linkDrawMode}
                  onClick={toggleLinkDrawMode}
                >
                  {linkDrawMode ? "Done drawing" : "Draw links"}
                </button>
              </div>
            </div>
          </div>

          {collapsed.bottom && (
            <button
              type="button"
              data-panel-ui
              className="board-panel-transition"
              aria-label="Show add-card bar"
              onClick={() => togglePanel("bottom")}
              style={{ ...panelTab, position: "absolute", bottom: 28, left: 24, width: 48, height: PANEL_TAB, borderRadius: "8px 8px 0 0", zIndex: 12 }}
            >▴</button>
          )}

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
                  prompt={() => buildReviewPrompt(cards, resolveThemeLabel)}
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
              {themes.map((t) => <span key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#3A4358" }}><span style={{ width: 10, height: 10, borderRadius: 2, background: t.color }} /> {t.label}</span>)}
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

      {composer && (
        <CardComposerModal
          mode={composer.mode}
          draft={composer.draft}
          classifying={!!composer.draft.classifying}
          themes={themes}
          dataPoints={dataPoints}
          impacts={impacts}
          onDraftChange={updateComposerDraft}
          onCategoriesChange={composerCategoriesChange}
          onCreateCategory={createCategory}
          onAddDataPoint={addDataPoint}
          onAddImpact={addImpact}
          onDone={composerDone}
          onCancel={composerCancel}
        />
      )}
      {showPack && (
        <Pack
          boards={boards}
          activeId={activeId}
          themes={themes}
          customThemes={extractCustomThemes(themes)}
          customDataPoints={extractCustomOptions(dataPoints, DEFAULT_DATA_POINTS)}
          customImpacts={extractCustomOptions(impacts, DEFAULT_IMPACTS)}
          onClose={() => setShowPack(false)}
        />
      )}
      {showCompare && (
        <CompareModal
          results={compareResults}
          loading={busy.compare}
          onClose={() => { setShowCompare(false); setCompareResults(null); }}
        />
      )}
      {showSuggestPicker && (
        <SuggestPickerModal
          candidates={suggestCandidates}
          selected={selectedSuggestProvider}
          onSelect={setSelectedSuggestProvider}
          category={suggestCategory}
          loading={busy.ideas}
          onCategoryChange={onSuggestCategoryChange}
          themes={themes}
          onAdd={confirmSuggestPick}
          onClose={closeSuggestPicker}
        />
      )}
      {!collapsed.bottom && (
        <div style={{ position: "absolute", left: 16, bottom: 6, fontSize: 11, color: "#9AA3B2", pointerEvents: "none" }}>Replace /public/logos and /public/deck with official assets.</div>
      )}
    </div>
  );
}

function SuggestPickerModal({
  candidates,
  selected,
  onSelect,
  category,
  loading,
  onCategoryChange,
  themes,
  onAdd,
  onClose,
}: {
  candidates: Record<AIProvider, SuggestCandidate> | null;
  selected: AIProvider | null;
  onSelect: (id: AIProvider) => void;
  category: string;
  loading?: boolean;
  onCategoryChange: (id: string) => void;
  themes: Theme[];
  onAdd: () => void;
  onClose: () => void;
}) {
  const selectedCandidate = selected && candidates ? candidates[selected] : null;
  const canAdd = !!(selectedCandidate?.text && !selectedCandidate.error && !selectedCandidate.loading);

  const categoryLabel = themes.find((t) => t.id === category)?.label ?? category;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,40,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }} onClick={onClose}>
      <div style={{ background: C.white, borderRadius: 16, padding: 30, width: "min(960px, 96%)", maxHeight: "88vh", overflow: "auto", boxShadow: "0 30px 80px rgba(10,22,40,.3)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h2 style={{ fontFamily: display, color: C.navy, margin: 0, fontSize: 22 }}>Pick a use case</h2>
          <button style={btn.ghost} onClick={onClose}>Cancel</button>
        </div>
        <p style={{ fontSize: 13, color: "#7A8499", margin: "0 0 18px", lineHeight: 1.45 }}>
          Task-level ideas for: <strong style={{ color: C.navy }}>{categoryLabel}</strong>
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {AI_PROVIDERS.map(({ id, label }) => {
            const col = candidates?.[id];
            const borderCol = PROVIDER_COLORS[id];
            const isSelected = selected === id;
            const selectable = !!(col?.text && !col.error && !col.loading);
            return (
              <button
                key={id}
                type="button"
                disabled={!selectable}
                onClick={() => selectable && onSelect(id)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 8,
                  textAlign: "left",
                  width: "100%",
                  border: `${isSelected ? 2.5 : 1.5}px solid ${isSelected ? borderCol : C.border}`,
                  borderRadius: 12,
                  padding: 14,
                  background: isSelected ? C.surface : C.white,
                  cursor: selectable ? "pointer" : "default",
                  fontFamily: "inherit",
                  opacity: col?.loading ? 0.85 : 1,
                  minHeight: 140,
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    border: `2px solid ${isSelected ? borderCol : C.border}`,
                    background: isSelected ? borderCol : C.white,
                    flexShrink: 0,
                    boxSizing: "border-box",
                  }}
                  aria-hidden
                />
                <span style={{ fontSize: 10, fontWeight: 700, color: C.white, background: borderCol, padding: "2px 8px", borderRadius: 999 }}>{label}</span>
                {col?.loading ? (
                  <p style={{ color: "#7A8499", fontSize: 13, margin: 0 }}>Loading…</p>
                ) : col?.error ? (
                  <p style={{ color: C.coral, fontSize: 13, margin: 0 }}>Couldn&apos;t generate — check API key</p>
                ) : col?.text ? (
                  <>
                    <p style={{ fontSize: 14, lineHeight: 1.45, color: C.navy, margin: 0 }}>{col.text}</p>
                    {col.justification && (
                      <p style={{ fontSize: 12, lineHeight: 1.4, color: "#7A8499", margin: 0 }}>{col.justification}</p>
                    )}
                  </>
                ) : (
                  <p style={{ color: "#7A8499", fontSize: 13, margin: 0 }}>No response</p>
                )}
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 20, paddingTop: 18, borderTop: `1px solid ${C.border}`, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.navy, fontWeight: 600 }}>
            Category
            <select
              value={category}
              disabled={loading}
              onChange={(e) => onCategoryChange(e.target.value)}
              style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 13, color: C.navy, background: C.white, fontWeight: 600 }}
            >
              {themes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button type="button" style={btn.ghost} onClick={onClose}>Cancel</button>
            <button type="button" style={btn.primarySm} onClick={onAdd} disabled={!canAdd}>Add to board</button>
          </div>
        </div>
      </div>
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

function takeawayDataSourcesLine(dataPoints: unknown): string | null {
  const summary = formatDataSourcesSummary(normalizeDataPoints(dataPoints));
  if (!summary) return null;
  return `Data sources: ${summary}`;
}

function takeawayImpactsLine(card: any): string | null {
  const summary = formatImpactTakeawaySummary(normalizeImpact(card));
  if (!summary) return null;
  return `Impact: ${summary}`;
}

function BoardTakeawayContent({ cards, insight, themes }: { cards: any[]; insight: string; themes: Theme[] }) {
  const knownIds = new Set(themes.map((t) => t.id));
  return (
    <>
      {themes.map((t) => {
        const items = cards.filter((c: any) => c.theme === t.id);
        if (!items.length) return null;
        return (
          <div key={t.id} style={{ marginTop: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: C.navy }}><span style={{ width: 12, height: 12, borderRadius: 3, background: t.color }} /> {t.label}</div>
            <ul style={{ margin: "8px 0 0", paddingLeft: 22 }}>{items.map((c: any) => {
              const desc = cardDescription(c);
              const meta = [
                takeawayDataSourcesLine(c.dataPoints ?? c.dataPoint),
                takeawayImpactsLine(c),
              ].filter(Boolean).join(" · ");
              return (
                <li key={c.id} style={{ color: C.navy, marginBottom: 6 }}>
                  {desc}
                  {meta && <span style={{ color: "#7A8499", fontSize: 12 }}> — {meta}</span>}
                  {c.ai && <span style={{ ...tag.ai, marginLeft: 6 }}>AI</span>}
                </li>
              );
            })}</ul>
          </div>
        );
      })}
      {(() => {
        const items = cards.filter((c: any) => !c.theme || !knownIds.has(c.theme));
        if (!items.length) return null;
        return (
          <div key="uncategorised" style={{ marginTop: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: C.navy }}><span style={{ width: 12, height: 12, borderRadius: 3, background: C.border, border: `1px solid ${C.border}` }} /> Uncategorised</div>
            <ul style={{ margin: "8px 0 0", paddingLeft: 22 }}>{items.map((c: any) => {
              const desc = cardDescription(c);
              const meta = [
                takeawayDataSourcesLine(c.dataPoints ?? c.dataPoint),
                takeawayImpactsLine(c),
              ].filter(Boolean).join(" · ");
              return (
                <li key={c.id} style={{ color: C.navy, marginBottom: 6 }}>
                  {desc}
                  {meta && <span style={{ color: "#7A8499", fontSize: 12 }}> — {meta}</span>}
                  {c.ai && <span style={{ ...tag.ai, marginLeft: 6 }}>AI</span>}
                </li>
              );
            })}</ul>
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

function Pack({ boards, activeId, themes, customThemes, customDataPoints, customImpacts, onClose }: {
  boards: BoardData[];
  activeId: string;
  themes: Theme[];
  customThemes: Theme[];
  customDataPoints: string[];
  customImpacts: string[];
  onClose: () => void;
}) {
  const [includeAll, setIncludeAll] = useState(false);
  const boardsToShow = includeAll ? boards : boards.filter((b) => b.id === activeId);
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({ boards, activeId, customThemes, customDataPoints, customImpacts }, null, 2)], { type: "application/json" });
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
            <BoardTakeawayContent cards={board.cards} insight={board.insight} themes={themes} />
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
