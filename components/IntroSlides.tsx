"use client";
import React, { useEffect, useState } from "react";
import { C, SmartCoLogo } from "./brand";
import { AIContainment } from "./AIContainment";
import type {
  AgendaRow,
  CapabilityCard,
  CredentialCard,
  DeckSlide,
  Engagement,
  FocusArea,
  NextStepCard,
  PhaseBlock,
} from "./deck";
import { isImageSlide } from "./deck";

const display = "var(--font-outfit), system-ui, sans-serif";

const HEX_BULLET_COLORS = [C.blue, C.mint, C.coral, C.yellow];

function stagger(i: number, base = 0.28) {
  return { className: "intro-stagger", style: { animationDelay: `${base + i * 0.08}s` } as React.CSSProperties };
}

function SlideFit({ children, dense, wide, className }: { children: React.ReactNode; dense?: boolean; wide?: boolean; className?: string }) {
  return (
    <div className={`intro-slide-fit${dense ? " intro-slide-fit--dense" : ""}${wide ? " intro-slide-fit--wide" : ""}${className ? ` ${className}` : ""}`}>
      {children}
    </div>
  );
}

function SlideCornerAccent() {
  return (
    <svg className="intro-slide-corner" viewBox="0 0 180 180" aria-hidden>
      <polygon points="60,0 120,0 80,180 20,180" fill={C.blue} opacity="0.12" />
      <polygon points="120,0 180,0 140,180 80,180" fill={C.mint} opacity="0.14" />
    </svg>
  );
}

function hexBulletPoints(r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    pts.push(`${(r * Math.cos(a)).toFixed(1)},${(r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}

function HexBullet({ index }: { index: number }) {
  const color = HEX_BULLET_COLORS[index % HEX_BULLET_COLORS.length];
  return (
    <span className="intro-hex-bullet" aria-hidden>
      <svg viewBox="-8 -9 16 18" width={22} height={24}>
        <polygon points={hexBulletPoints(7)} fill={color} />
      </svg>
      <span className="intro-hex-bullet-mark">{">"}</span>
    </span>
  );
}

function HexBulletRow({
  index,
  children,
  delay,
}: {
  index: number;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <li
      className="intro-hex-row intro-stagger"
      style={{ animationDelay: delay !== undefined ? `${delay}s` : undefined }}
    >
      <HexBullet index={index} />
      <div className="intro-hex-row-copy">{children}</div>
    </li>
  );
}

function Eyebrow({ children, delay = 0.1 }: { children: React.ReactNode; delay?: number }) {
  return (
    <div className="intro-enter intro-eyebrow intro-slide-eyebrow" style={{ animationDelay: `${delay}s` }}>
      {children}
    </div>
  );
}

function SlideTitle({ children, delay = 0.2, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <h2 className={`intro-enter intro-slide-title${className ? ` ${className}` : ""}`} style={{ animationDelay: `${delay}s` }}>
      {children}
    </h2>
  );
}

function Card({ children, i, accent, compact }: { children: React.ReactNode; i: number; accent?: string; compact?: boolean }) {
  return (
    <div
      {...stagger(i, 0.32)}
      className={`intro-brand-card${compact ? " intro-brand-card--compact" : ""}`}
      style={{ borderLeftColor: accent ?? C.blue }}
    >
      {children}
    </div>
  );
}

function CountUp({ target, prefix = "£", suffix = "k" }: { target: number; prefix?: string; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setVal(target);
      return;
    }
    let frame = 0;
    const total = 40;
    const id = requestAnimationFrame(function tick() {
      frame++;
      setVal(Math.round((target * frame) / total));
      if (frame < total) requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(id);
  }, [target]);
  return <span className="intro-count-up">{prefix}{val}{suffix}</span>;
}

const PHASE_JOURNEY_HEX_COLORS = [C.mint, C.yellow, C.coral];

const VB_W = 1600;
const VB_H = 900;
const RAIL_Y = 450;
const RAIL_PAD = 56;
const RAIL_X1 = RAIL_PAD;
const RAIL_X2 = VB_W - RAIL_PAD;
const RAIL_SPAN = RAIL_X2 - RAIL_X1;
const HEX_R = 56;
const HEX_CX = [0, 1, 2].map((i) => RAIL_X1 + (RAIL_SPAN * (i * 2 + 1)) / 6);
const HEX_DELAYS = [0.55, 1.6, 2.7];
const LEADER_ABOVE_Y = 205;
const LEADER_BELOW_Y = 695;

type CalloutSide = "above" | "below";

type CalloutSlot = {
  side: CalloutSide;
  phase: number;
  item: number;
  delay: number;
};

/** Three above, three below — each pair anchored to its phase node at even thirds. */
const CALLOUT_SLOTS: CalloutSlot[] = [
  { side: "above", phase: 0, item: 1, delay: 1.1 },
  { side: "above", phase: 1, item: 0, delay: 1.95 },
  { side: "above", phase: 2, item: 1, delay: 3.3 },
  { side: "below", phase: 0, item: 0, delay: 0.85 },
  { side: "below", phase: 1, item: 1, delay: 2.2 },
  { side: "below", phase: 2, item: 0, delay: 3.05 },
];

function hexPath(r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    pts.push(`${(r * Math.cos(a)).toFixed(1)},${(r * Math.sin(a)).toFixed(1)}`);
  }
  return `M ${pts.join(" L ")} Z`;
}

function parseCalloutItem(item: string) {
  const dash = item.indexOf(" — ");
  if (dash === -1) return { heading: item.trim(), body: "" };
  return { heading: item.slice(0, dash).trim(), body: item.slice(dash + 3).trim() };
}

function leaderEndY(side: CalloutSide) {
  return side === "above" ? LEADER_ABOVE_Y : LEADER_BELOW_Y;
}

function phaseCenterPct(phase: number) {
  return (HEX_CX[phase] / VB_W) * 100;
}

export function PhaseJourneySlide({
  eyebrow,
  title,
  phases,
}: {
  eyebrow?: string;
  title: string;
  phases: PhaseBlock[];
}) {
  const phase2Extra = phases[2]?.items[2] ? parseCalloutItem(phases[2].items[2]) : null;

  const callouts = CALLOUT_SLOTS.map((slot) => {
    const raw = phases[slot.phase]?.items[slot.item] ?? "";
    const { heading, body } = parseCalloutItem(raw);
    return {
      ...slot,
      heading,
      body,
      cxPct: phaseCenterPct(slot.phase),
      extra:
        slot.phase === 2 && slot.side === "below" && slot.item === 0 ? phase2Extra : null,
    };
  });

  return (
    <div className="phase-journey-slide">
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 className="phase-journey-title intro-slide-title">{title}</h2>
      <div className="phase-journey-stage" aria-hidden={false}>
        <svg
          className="phase-journey-svg"
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Three-phase transformation journey with callouts on a horizontal rail"
        >
          <rect
            x={RAIL_X1}
            y={RAIL_Y - 7}
            width={RAIL_SPAN}
            height={14}
            rx={7}
            fill="#EEF0F4"
            className="phase-journey-rail"
          />

          {callouts.map((c, i) => {
            const x = HEX_CX[c.phase];
            const y2 = leaderEndY(c.side);
            return (
              <line
                key={`leader-${i}`}
                x1={x}
                y1={RAIL_Y}
                x2={x}
                y2={y2}
                stroke={C.blue}
                strokeWidth={1.5}
                pathLength={100}
                className="phase-journey-leader"
                style={{ animationDelay: `${c.delay}s` }}
              />
            );
          })}

          {phases.slice(0, 3).map((phase, i) => (
            <g key={phase.title} transform={`translate(${HEX_CX[i]}, ${RAIL_Y})`}>
              <g className="phase-journey-hex" style={{ animationDelay: `${HEX_DELAYS[i]}s` }}>
                <path
                  d={hexPath(HEX_R)}
                  fill={C.white}
                  stroke={PHASE_JOURNEY_HEX_COLORS[i]}
                  strokeWidth={5}
                />
                <text
                  y={5}
                  textAnchor="middle"
                  fill={C.navy}
                  fontSize={22}
                  fontWeight={800}
                  fontFamily={display}
                >
                  {phase.title}
                </text>
              </g>
            </g>
          ))}
        </svg>

        <div className="phase-journey-callouts">
          {callouts.map((c, i) => (
            <div
              key={`callout-${i}`}
              className={`phase-journey-callout phase-journey-callout--${c.side}`}
              style={{
                left: `${c.cxPct}%`,
                animationDelay: `${c.delay}s`,
              }}
            >
              <div className="phase-journey-callout-heading">{c.heading}</div>
              {c.body ? <div className="phase-journey-callout-body">{c.body}</div> : null}
              {c.extra ? (
                <>
                  <div className="phase-journey-callout-heading phase-journey-callout-heading--secondary">
                    {c.extra.heading}
                  </div>
                  {c.extra.body ? (
                    <div className="phase-journey-callout-body">{c.extra.body}</div>
                  ) : null}
                </>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HeroSlide({ titleParts }: { titleParts?: React.ReactNode }) {
  const prompts = [
    "Where does delivery slow down?",
    "Where's the manual effort sitting?",
    "What breaks confidence in delivery?",
  ];
  return (
    <SlideFit className="intro-slide-hero">
      <Eyebrow>AI & Delivery Workshop</Eyebrow>
      {titleParts}
      <p className="intro-enter intro-body intro-slide-body intro-slide-hero-sub" style={{ animationDelay: "0.45s" }}>
        A working session to find where AI takes real work off your delivery teams — and what it could look like.
      </p>
      <div className="intro-enter intro-ai-badge" style={{ animationDelay: "0.55s" }}>
        <span className="intro-live-dot" aria-hidden />
        <span>Powered by live AI — Claude · Gemini · GPT</span>
      </div>
      <div className="intro-enter intro-prompts intro-prompt-rotate" aria-live="polite" style={{ animationDelay: "0.65s" }}>
        {prompts.map((p) => <span key={p}>{p}</span>)}
      </div>
    </SlideFit>
  );
}

export function AgendaSlide({ title, rows }: { title: string; rows: AgendaRow[] }) {
  return (
    <SlideFit dense>
      <SlideCornerAccent />
      <SlideTitle>{title}</SlideTitle>
      <div className="intro-agenda-list">
        {rows.map((r, i) => (
          <div key={r.ref} {...stagger(i, 0.3)} className="intro-agenda-row">
            <span className="intro-agenda-ref">{r.ref}</span>
            <div className="intro-agenda-main">
              <div className="intro-agenda-topic">{r.topic}</div>
              <div className="intro-slide-body intro-agenda-detail">{r.detail}</div>
            </div>
            <div className="intro-agenda-meta">
              <div className="intro-agenda-who">{r.who}</div>
              <div>{r.duration}</div>
            </div>
          </div>
        ))}
      </div>
    </SlideFit>
  );
}

/** Client logos for the who-we-are strip — drop PNGs in /public/logos/clients/ */
const WHO_WE_ARE_CLIENTS = [
  { name: "Aviva", slug: "aviva" },
  { name: "Hiscox", slug: "hiscox" },
  { name: "Aston Martin", slug: "aston-martin" },
  { name: "Boots", slug: "boots" },
  { name: "Canada Life", slug: "canada-life" },
  { name: "LSEG", slug: "lseg" },
  { name: "OFX", slug: "ofx" },
  { name: "reckitt", slug: "reckitt" },
  { name: "vestacy", slug: "vestacy" },
  { name: "WPP", slug: "wpp" },
] as const;

const WHO_VB_W = 1250;
const WHO_VB_H = 720;
const WHO_CX = 625;
const WHO_CY = 368;
const WHO_R = 242;
const WHO_STROKE = 42;
const WHO_ARC_SPAN = 108;
const WHO_ARC_GAP = 12;
const WHO_RING_INNER = WHO_R - WHO_STROKE / 2;
const WHO_HEX_MARGIN = 16;
/** Space reserved beneath each hex for the practice caption (SVG user units). */
const WHO_LABEL_BELOW = 40;

function honeycombLabelHalfWidth(hexR: number) {
  return (Math.sqrt(3) * hexR * 0.98) / 2;
}

function honeycombClusterRadius(hexR: number) {
  const offsets = honeycombOffsets(hexR);
  const labelHalfW = honeycombLabelHalfWidth(hexR);
  let extent = 0;
  for (const { ox, oy } of offsets) {
    const horizontal = Math.abs(ox) + hexR + labelHalfW;
    const vertical = Math.abs(oy) + hexR + WHO_LABEL_BELOW;
    extent = Math.max(extent, horizontal, vertical);
  }
  return extent;
}

function fitHoneycombRadius() {
  const limit = WHO_RING_INNER - WHO_HEX_MARGIN;
  let lo = 36;
  let hi = 88;
  while (hi - lo > 0.5) {
    const mid = (lo + hi) / 2;
    if (honeycombClusterRadius(mid) <= limit) lo = mid;
    else hi = mid;
  }
  return Math.floor(lo);
}

const WHO_ARC_SEGMENTS = [
  { label: "ADVISORY", centerDeg: 0, color: C.coral, delay: "0.3s", arrowDelay: "0.45s" },
  { label: "DELIVERY", centerDeg: 120, color: C.yellow, delay: "0.7s", arrowDelay: "0.85s" },
  { label: "OPTIMISATION", centerDeg: 240, color: C.mint, delay: "1.1s", arrowDelay: "1.25s", long: true },
] as const;

/** Degrees clockwise from 12 o'clock. */
function whoRingPoint(cx: number, cy: number, r: number, degFromTop: number) {
  const rad = (degFromTop * Math.PI) / 180;
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
}

function whoArcPath(cx: number, cy: number, r: number, centerDeg: number) {
  const half = WHO_ARC_SPAN / 2;
  const start = centerDeg - half;
  const end = centerDeg + half;
  const p1 = whoRingPoint(cx, cy, r, start);
  const p2 = whoRingPoint(cx, cy, r, end);
  const large = WHO_ARC_SPAN > 180 ? 1 : 0;
  return `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
}

function honeycombOffsets(hexR: number) {
  const dx = Math.sqrt(3) * hexR;
  const dy = 1.5 * hexR;
  return [
    { ox: -dx / 2, oy: -dy / 2 },
    { ox: dx / 2, oy: -dy / 2 },
    { ox: -dx, oy: dy / 2 },
    { ox: 0, oy: dy / 2 },
    { ox: dx, oy: dy / 2 },
  ];
}

const WHO_HEX_R = fitHoneycombRadius();
const WHO_HONEYCOMB = honeycombOffsets(WHO_HEX_R);

type PracticeKey = "ai" | "cloud" | "cyber" | "apps" | "data";

const PRACTICE_LAYOUT: { key: PracticeKey; match: (tag: string) => boolean; delay: number }[] = [
  { key: "ai", match: (t) => t === "AI", delay: 1.28 },
  { key: "cloud", match: (t) => t.includes("Cloud"), delay: 1.43 },
  { key: "cyber", match: (t) => t.includes("Cyber"), delay: 1.58 },
  { key: "apps", match: (t) => t.includes("Apps"), delay: 1.73 },
  { key: "data", match: (t) => t.includes("Data"), delay: 1.88 },
];

const WHO_CALLOUT_SLOTS = [
  { side: "left" as const, top: 29, index: 0, delay: 1.95 },
  { side: "left" as const, top: 50, index: 1, delay: 2.03 },
  { side: "left" as const, top: 69, index: 2, delay: 2.11 },
  { side: "right" as const, top: 27, index: 3, delay: 2.19 },
  { side: "right" as const, top: 48, index: 4, delay: 2.27 },
];

function whoHexPolygon(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}

function whoHexPathLocal(r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    pts.push(`${(r * Math.cos(a)).toFixed(1)},${(r * Math.sin(a)).toFixed(1)}`);
  }
  return `M ${pts.join(" L ")} Z`;
}

function PracticeIcon({ kind }: { kind: PracticeKey }) {
  switch (kind) {
    case "ai":
      return (
        <g fill="#fff" aria-hidden>
          <path d="M0,-9 L2.2,-2.2 L9,0 L2.2,2.2 L0,9 L-2.2,2.2 L-9,0 L-2.2,-2.2 Z" />
        </g>
      );
    case "cloud":
      return (
        <g fill="#fff" aria-hidden>
          <ellipse cx={0} cy={3} rx={9} ry={5.5} />
          <circle cx={-5} cy={1} r={4.5} />
          <circle cx={4} cy={0} r={5} />
        </g>
      );
    case "cyber":
      return (
        <g fill="#fff" aria-hidden>
          <path d="M0,-9 L8,-4 V3 C8,7 0,10 0,10 S-8,7 -8,3 V-4 Z" />
        </g>
      );
    case "apps":
      return (
        <g fill="#fff" aria-hidden>
          <rect x={-8} y={-8} width={7} height={7} rx={1} />
          <rect x={1} y={-8} width={7} height={7} rx={1} />
          <rect x={-8} y={1} width={7} height={7} rx={1} />
          <rect x={1} y={1} width={7} height={7} rx={1} />
        </g>
      );
    case "data":
      return (
        <g fill="#fff" aria-hidden>
          <rect x={-8} y={-2} width={4} height={10} rx={1} />
          <rect x={-2} y={-6} width={4} height={14} rx={1} />
          <rect x={4} y={-4} width={4} height={12} rx={1} />
        </g>
      );
  }
}

function ClientLogoItem({ name, slug }: { name: string; slug: string }) {
  const [err, setErr] = useState(false);
  if (err) return <span className="who-client-name">{name}</span>;
  return (
    <img
      src={`/logos/clients/${slug}.png`}
      alt={name}
      className="who-client-logo"
      onError={() => setErr(true)}
    />
  );
}

function WhoWeAreCalloutIcon() {
  return (
    <svg className="who-callout-hex" viewBox="-9 -10 18 20" aria-hidden>
      <path d={whoHexPathLocal(8)} fill="none" stroke={C.blue} strokeWidth={1.8} />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg className="who-target-icon" viewBox="0 0 24 24" aria-hidden>
      <circle cx={12} cy={12} r={9.5} fill="none" stroke={C.blue} strokeWidth={2} />
      <circle cx={12} cy={12} r={5.5} fill="none" stroke={C.blue} strokeWidth={1.5} />
      <circle cx={12} cy={12} r={2} fill={C.blue} />
    </svg>
  );
}

export function WhoWeAreSlide({
  eyebrow, title, tags, cards, closing,
}: {
  eyebrow: string;
  title: string;
  tags: string[];
  cards: CapabilityCard[];
  closing: string;
}) {
  const practices = PRACTICE_LAYOUT.map((slot, i) => {
    const label = tags.find(slot.match) ?? "";
    const cell = WHO_HONEYCOMB[i];
    return { ...slot, label, ox: cell.ox, oy: cell.oy };
  });

  return (
    <div className="who-we-are-slide intro-slide-has-corner">
      <SlideCornerAccent />
      <Eyebrow>{eyebrow}</Eyebrow>
      <SlideTitle className="who-we-are-title">{title}</SlideTitle>

      <div className="who-we-are-body">
        <div className="who-we-are-stage">
          <svg
            className="who-we-are-svg"
            viewBox={`0 0 ${WHO_VB_W} ${WHO_VB_H}`}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="Advisory, Delivery and Optimisation cycle with five core practices"
          >
            {WHO_ARC_SEGMENTS.map((seg) => (
              <path
                key={seg.label}
                d={whoArcPath(WHO_CX, WHO_CY, WHO_R, seg.centerDeg)}
                fill="none"
                stroke={seg.color}
                strokeWidth={WHO_STROKE}
                strokeLinecap="round"
                pathLength={100}
                className="who-ring-arc"
                style={{ animationDelay: seg.delay }}
              />
            ))}

            {WHO_ARC_SEGMENTS.map((seg) => {
              const endDeg = seg.centerDeg + WHO_ARC_SPAN / 2;
              const tip = whoRingPoint(WHO_CX, WHO_CY, WHO_R, endDeg);
              return (
                <g key={`arrow-${seg.label}`} transform={`translate(${tip.x.toFixed(1)},${tip.y.toFixed(1)}) rotate(${endDeg + 90})`}>
                  <g className="who-ring-arrow" style={{ animationDelay: seg.arrowDelay }}>
                    <polygon points="0,-9 16,0 0,9" fill={seg.color} />
                  </g>
                </g>
              );
            })}

            {WHO_ARC_SEGMENTS.map((seg) => {
              const labelPt = whoRingPoint(WHO_CX, WHO_CY, WHO_R, seg.centerDeg);
              const arcFontSize = "long" in seg && seg.long ? 16 : 18;
              return (
                <text
                  key={`label-${seg.label}`}
                  x={labelPt.x}
                  y={labelPt.y}
                  className="who-ring-label"
                  fill={C.white}
                  fontFamily={display}
                  fontWeight={800}
                  fontSize={arcFontSize}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {seg.label}
                </text>
              );
            })}

            {practices.map((p) => {
              const hx = WHO_CX + p.ox;
              const hy = WHO_CY + p.oy;
              const labelW = Math.sqrt(3) * WHO_HEX_R * 1.05;
              const captionY = WHO_HEX_R * 0.72;
              return (
                <g key={p.key} transform={`translate(${hx.toFixed(1)}, ${hy.toFixed(1)})`}>
                  <g className="who-practice-hex" style={{ animationDelay: `${p.delay}s` }}>
                    <polygon points={whoHexPolygon(0, 0, WHO_HEX_R)} fill={C.blue} />
                    <g transform="translate(0, -2)">
                      <PracticeIcon kind={p.key} />
                    </g>
                  </g>
                  <foreignObject
                    x={-labelW / 2}
                    y={captionY}
                    width={labelW}
                    height={WHO_LABEL_BELOW}
                    xmlns="http://www.w3.org/1999/xhtml"
                  >
                    <div className="who-hex-caption">{p.label}</div>
                  </foreignObject>
                </g>
              );
            })}
          </svg>

          <div className="who-we-are-html">
            {WHO_CALLOUT_SLOTS.map((slot) => {
              const card = cards[slot.index];
              if (!card) return null;
              return (
                <div
                  key={slot.index}
                  className={`who-callout who-callout--${slot.side} intro-stagger`}
                  style={{
                    top: `${slot.top}%`,
                    animationDelay: `${slot.delay}s`,
                  }}
                >
                  <WhoWeAreCalloutIcon />
                  <div className="who-callout-copy">
                    <div className="who-callout-title">{card.title}</div>
                    <div className="who-callout-desc">{card.desc}</div>
                  </div>
                </div>
              );
            })}

            <div className="who-integrated-box intro-stagger" style={{ animationDelay: "2.35s" }}>
              <TargetIcon />
              <p className="who-integrated-text">{closing}</p>
            </div>
          </div>
        </div>

        <div className="who-client-strip intro-stagger" style={{ animationDelay: "2.45s" }}>
          <div className="who-client-strip-inner">
            <div className="who-client-smartco">
              <SmartCoLogo scale={0.68} />
            </div>
            <div className="who-client-logos">
              {WHO_WE_ARE_CLIENTS.map((c) => (
                <ClientLogoItem key={c.slug} name={c.name} slug={c.slug} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AIContainmentSlide({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <SlideFit wide className="intro-slide-has-corner intro-slide-ai-containment">
      <SlideCornerAccent />
      <Eyebrow>{eyebrow}</Eyebrow>
      <div className="ai-containment-layout">
        <div className="ai-containment-copy-col">
          <SlideTitle>{title}</SlideTitle>
          <p className="intro-enter intro-slide-body ai-perimeter-copy" style={{ animationDelay: "0.3s" }}>{sub}</p>
        </div>
        <div className="intro-enter ai-perimeter-stage" style={{ animationDelay: "0.38s" }}>
          <AIContainment compact />
        </div>
      </div>
    </SlideFit>
  );
}

function ParallelogramMarker({ variant = "on-blue" }: { variant?: "on-blue" | "on-white" }) {
  const primary = variant === "on-blue" ? "rgba(255,255,255,0.45)" : C.blue;
  const secondary = variant === "on-blue" ? "rgba(255,255,255,0.28)" : C.mint;
  return (
    <svg className="context-challenge-marker" viewBox="0 0 24 32" width={20} height={26} aria-hidden>
      <polygon points="8,0 16,0 12,32 4,32" fill={primary} />
      <polygon points="16,0 24,0 20,32 12,32" fill={secondary} />
    </svg>
  );
}

export function ContextSlide({
  eyebrow, title, intro, challenges, focusHeading, focusLead, focusItems,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  challenges: string[];
  focusHeading: string;
  focusLead: string;
  focusItems: string[];
}) {
  return (
    <div className="intro-slide-context">
      <div className="context-split">
        <div className="context-split-left intro-slide-has-corner">
          <SlideCornerAccent />
          <Eyebrow>{eyebrow}</Eyebrow>
          <SlideTitle>{title}</SlideTitle>
          <p {...stagger(0, 0.28)} className="intro-slide-body intro-slide-intro">{intro}</p>
          <h3 {...stagger(1, 0.34)} className="context-focus-heading">{focusHeading}</h3>
          <p {...stagger(2, 0.36)} className="context-focus-lead">{focusLead}</p>
          <ul className="context-focus-list">
            {focusItems.map((item, i) => (
              <li key={i} {...stagger(i + 3, 0.38)} className="context-focus-item intro-stagger">
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="context-split-right" aria-label="Key challenges">
          <ul className="context-challenge-list">
            {challenges.map((c, i) => (
              <li
                key={i}
                className="context-challenge-item intro-stagger"
                style={{ animationDelay: `${0.32 + i * 0.08}s` }}
              >
                <ParallelogramMarker />
                <p className="context-challenge-text">{c}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function PhaseJourneyDeckSlide(props: { eyebrow: string; title: string; phases: PhaseBlock[] }) {
  return <PhaseJourneySlide {...props} />;
}

export function EWhiteboardSlide({
  eyebrow, title, areas, onEnter,
}: {
  eyebrow: string;
  title: string;
  areas: FocusArea[];
  onEnter: () => void;
}) {
  return (
    <SlideFit dense className="intro-slide-has-corner">
      <SlideCornerAccent />
      <Eyebrow>{eyebrow}</Eyebrow>
      <SlideTitle>{title}</SlideTitle>
      <ul className="intro-hex-list">
        {areas.map((a, i) => (
          <HexBulletRow key={a.title} index={i} delay={0.32 + i * 0.08}>
            <div className="intro-hex-title">
              {a.title}{" "}
              <span className="intro-hex-level">({a.level})</span>
            </div>
            <div className="intro-hex-body">{a.desc}</div>
          </HexBulletRow>
        ))}
      </ul>
      <div {...stagger(areas.length, 0.4)} className="intro-cta-wrap">
        <button type="button" className="intro-cta intro-cta-btn" onClick={onEnter}>
          Enter workshop board <span className="intro-cta-arrow" aria-hidden>→</span>
        </button>
      </div>
    </SlideFit>
  );
}

export function TrackRecordSlide({
  eyebrow, title, engagements, signalTitle, signalBody,
}: {
  eyebrow: string;
  title: string;
  engagements: Engagement[];
  signalTitle: string;
  signalBody: string;
}) {
  return (
    <SlideFit dense wide className="intro-slide-track">
      <Eyebrow>{eyebrow}</Eyebrow>
      <SlideTitle>{title}</SlideTitle>
      <div className="intro-track-cards">
        {engagements.map((e, i) => (
          <article
            key={i}
            className="intro-track-card intro-stagger"
            style={{ animationDelay: `${0.3 + i * 0.07}s` }}
          >
            <svg className="intro-track-card-accent" viewBox="0 0 28 40" aria-hidden>
              <polygon points="10,0 20,0 16,40 6,40" fill={C.blue} opacity="0.18" />
              <polygon points="20,0 28,0 24,40 14,40" fill={C.mint} opacity="0.22" />
            </svg>
            <span className="intro-track-sector">{e.sector}</span>
            <div className="intro-track-field">
              <span className="intro-track-label">What we did</span>
              <p className="intro-track-value">{e.doing}</p>
            </div>
            <div className="intro-track-field">
              <span className="intro-track-label">Engagement</span>
              <p className="intro-track-value">{e.length}</p>
            </div>
            <div className="intro-track-field intro-track-field--outcome">
              <span className="intro-track-label">Outcome</span>
              <p className="intro-track-outcome">{e.value}</p>
            </div>
          </article>
        ))}
      </div>
      <div {...stagger(engagements.length + 1, 0.42)} className="intro-signal-strip intro-signal-strip--anchor">
        <div className="intro-signal-title">
          {signalTitle.includes("£400") ? (
            <>
              THE SIGNAL · <CountUp target={400} />
            </>
          ) : (
            signalTitle
          )}
        </div>
        <div className="intro-signal-body">{signalBody}</div>
      </div>
    </SlideFit>
  );
}

export function NextStepsSlide({
  title, subtitle, objective, cards,
}: {
  title: string;
  subtitle: string;
  objective: string;
  cards: NextStepCard[];
}) {
  return (
    <SlideFit dense className="intro-slide-has-corner">
      <SlideCornerAccent />
      <SlideTitle>{title}</SlideTitle>
      <p {...stagger(0, 0.28)} className="intro-slide-subhead">{subtitle}</p>
      <p {...stagger(1, 0.3)} className="intro-slide-body intro-slide-objective">{objective}</p>
      <div className="intro-cards-grid">
        {cards.map((c, i) => (
          <Card key={c.title} i={i + 2} accent={C.blue} compact>
            <div className="intro-card-title">{c.title}</div>
            <div className="intro-card-body">{c.desc}</div>
          </Card>
        ))}
      </div>
    </SlideFit>
  );
}

export function ContactSlide({ title, name, role, email }: { title: string; name: string; role: string; email: string }) {
  return (
    <SlideFit className="intro-slide-has-corner">
      <SlideCornerAccent />
      <SlideTitle>{title}</SlideTitle>
      <div {...stagger(0, 0.32)} className="intro-contact-card">
        <div className="intro-contact-name">{name}</div>
        <div className="intro-slide-body intro-contact-role">{role}</div>
        <a href={`mailto:${email}`} className="intro-contact-email">{email}</a>
      </div>
    </SlideFit>
  );
}

export function CredentialsSlide({ title, cards, copyright }: { title: string; cards: CredentialCard[]; copyright: string }) {
  return (
    <SlideFit className="intro-slide-credentials">
      <p {...stagger(0, 0.2)} className="intro-credentials-lead">{title}</p>
      <div className="intro-credentials-grid">
        {cards.map((c, i) => (
          <div key={c.title} {...stagger(i + 1, 0.28)} className="intro-credentials-card">
            <div className="intro-credentials-card-title">{c.title}</div>
            <div className="intro-credentials-card-body">{c.desc}</div>
          </div>
        ))}
      </div>
      <p {...stagger(cards.length + 2, 0.4)} className="intro-credentials-copy">{copyright}</p>
    </SlideFit>
  );
}

export function renderDeckSlide(s: DeckSlide, onEnter: () => void, heroTitle?: React.ReactNode) {
  if (isImageSlide(s)) return null;
  switch (s.kind) {
    case "hero":
      return <HeroSlide titleParts={heroTitle} />;
    case "agenda":
      return <AgendaSlide title={s.title} rows={s.rows} />;
    case "who-we-are":
      return <WhoWeAreSlide {...s} />;
    case "ai-containment":
      return <AIContainmentSlide {...s} />;
    case "context":
      return <ContextSlide {...s} />;
    case "phase-journey":
      return <PhaseJourneyDeckSlide {...s} />;
    case "ewhiteboard":
      return <EWhiteboardSlide eyebrow={s.eyebrow} title={s.title} areas={s.areas} onEnter={onEnter} />;
    case "track-record":
      return <TrackRecordSlide {...s} />;
    case "next-steps":
      return <NextStepsSlide {...s} />;
    case "contact":
      return <ContactSlide {...s} />;
    case "credentials":
      return <CredentialsSlide {...s} />;
    default:
      return null;
  }
}
