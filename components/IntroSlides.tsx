"use client";
import React, { useEffect, useState } from "react";
import { C } from "./brand";
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
const body = "#3A4358";

function stagger(i: number, base = 0.12) {
  return { className: "intro-stagger", style: { animationDelay: `${base + i * 0.06}s` } as React.CSSProperties };
}

function SlideFit({ children, dense }: { children: React.ReactNode; dense?: boolean }) {
  return <div className={`intro-slide-fit${dense ? " intro-slide-fit--dense" : ""}`}>{children}</div>;
}

function Eyebrow({ children, delay = 0.1 }: { children: React.ReactNode; delay?: number }) {
  return (
    <div className="intro-enter intro-eyebrow intro-slide-eyebrow" style={{ animationDelay: `${delay}s` }}>
      {children}
    </div>
  );
}

function SlideTitle({ children, delay = 0.2 }: { children: React.ReactNode; delay?: number }) {
  return (
    <h2 className="intro-enter intro-slide-title" style={{ animationDelay: `${delay}s` }}>
      {children}
    </h2>
  );
}

function Card({ children, i, accent, compact }: { children: React.ReactNode; i: number; accent?: string; compact?: boolean }) {
  return (
    <div
      {...stagger(i, 0.2)}
      style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        borderLeft: accent ? `4px solid ${accent}` : `4px solid ${C.blue}`,
        borderRadius: 8,
        padding: compact ? "6px 8px" : "10px 12px",
        marginBottom: compact ? 6 : 8,
      }}
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

const PHASE_TIMELINE_COLORS = [C.blue, C.mint, C.coral];
const PHASE_JOURNEY_HEX_COLORS = [C.mint, C.yellow, C.coral];

const VB_W = 1600;
const VB_H = 900;
const RAIL_Y = 450;
const RAIL_X1 = 80;
const RAIL_X2 = 1520;
const HEX_R = 56;
const HEX_CX = [0.12, 0.46, 0.79].map((p) => p * VB_W);
const HEX_DELAYS = [0.55, 1.6, 2.7];

type CalloutSide = "above" | "below";

type CalloutSlot = {
  cxPct: number;
  side: CalloutSide;
  phase: number;
  item: number;
  delay: number;
};

const CALLOUT_SLOTS: CalloutSlot[] = [
  { cxPct: 16, side: "above", phase: 0, item: 1, delay: 1.1 },
  { cxPct: 48, side: "above", phase: 1, item: 0, delay: 1.95 },
  { cxPct: 80, side: "above", phase: 2, item: 1, delay: 3.3 },
  { cxPct: 7, side: "below", phase: 0, item: 0, delay: 0.85 },
  { cxPct: 34, side: "below", phase: 1, item: 1, delay: 2.2 },
  { cxPct: 60, side: "below", phase: 2, item: 0, delay: 3.05 },
  { cxPct: 85, side: "below", phase: 2, item: 2, delay: 3.55 },
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
  return side === "above" ? 205 : 695;
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
  const callouts = CALLOUT_SLOTS.map((slot) => {
    const raw = phases[slot.phase]?.items[slot.item] ?? "";
    const { heading, body } = parseCalloutItem(raw);
    return { ...slot, heading, body };
  });

  return (
    <div className="phase-journey-slide">
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 className="phase-journey-title">{title}</h2>
      <div className="phase-journey-stage" aria-hidden={false}>
        <svg
          className="phase-journey-svg"
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Three-phase transformation journey with callouts on a horizontal rail"
        >
          {/* Grey rail */}
          <rect
            x={RAIL_X1}
            y={RAIL_Y - 7}
            width={RAIL_X2 - RAIL_X1}
            height={14}
            rx={7}
            fill="#EEF0F4"
            className="phase-journey-rail"
          />

          {/* Leader lines + rail dots (behind phase hexagons) */}
          {callouts.map((c, i) => {
            const x = (c.cxPct / 100) * VB_W;
            const y2 = leaderEndY(c.side);
            return (
              <g key={`leader-${i}`}>
                <line
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
                <g transform={`translate(${x}, ${RAIL_Y})`}>
                  <g className="phase-journey-dot" style={{ animationDelay: `${c.delay}s` }}>
                    <path d={hexPath(7)} fill={C.blue} />
                  </g>
                </g>
              </g>
            );
          })}

          {/* Phase hexagons */}
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PhaseTimelineSlide({
  eyebrow, title, phases,
}: {
  eyebrow: string;
  title: string;
  phases: { title: string; label: string }[];
}) {
  return (
    <SlideFit>
      <Eyebrow>{eyebrow}</Eyebrow>
      <SlideTitle>{title}</SlideTitle>
      <div style={{ position: "relative", width: "100%", maxWidth: 900, margin: "clamp(12px, 2vh, 20px) auto 0" }}>
        <div className="intro-phase-timeline-rail" aria-hidden />
        <div className="intro-phase-timeline">
          {phases.map((p, i) => (
            <div key={p.title} className="intro-phase-node" style={{ animationDelay: `${0.2 + i * 0.15}s` }}>
              <div className="intro-phase-dot" style={{ background: PHASE_TIMELINE_COLORS[i] ?? C.blue }}>
                {i + 1}
              </div>
              <div className="intro-phase-label">{p.title}</div>
              <div className="intro-phase-caption">{p.label}</div>
            </div>
          ))}
        </div>
      </div>
    </SlideFit>
  );
}

export function HeroSlide({ titleParts }: { titleParts?: React.ReactNode }) {
  const prompts = [
    "Where does delivery slow down?",
    "Where's the manual effort sitting?",
    "What breaks confidence in delivery?",
  ];
  return (
    <SlideFit>
      <Eyebrow>AI & Delivery Workshop</Eyebrow>
      {titleParts}
      <p className="intro-enter intro-body intro-slide-body" style={{ marginTop: 12, maxWidth: 620, animationDelay: "0.45s" }}>
        A working session to find where AI takes real work off your delivery teams — and what it could look like.
      </p>
      <div className="intro-enter intro-ai-badge" style={{ animationDelay: "0.55s", marginTop: 14 }}>
        <span className="intro-live-dot" aria-hidden />
        <span style={{ fontSize: "clamp(12px, 1.3vw, 13px)" }}>Powered by live AI — Claude · Gemini · GPT</span>
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
      <SlideTitle>{title}</SlideTitle>
      {rows.map((r, i) => (
        <div
          key={r.ref}
          {...stagger(i, 0.22)}
          style={{
            display: "grid",
            gridTemplateColumns: "32px 1fr auto",
            gap: "4px 10px",
            padding: "8px 0",
            borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : "none",
            alignItems: "start",
          }}
        >
          <span style={{ fontFamily: display, fontWeight: 800, fontSize: "clamp(12px, 1.2vw, 14px)", color: C.blue }}>{r.ref}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: "clamp(12px, 1.25vw, 14px)", color: C.navy, marginBottom: 2 }}>{r.topic}</div>
            <div className="intro-slide-body" style={{ fontSize: "clamp(11px, 1.2vw, 13px)" }}>{r.detail}</div>
          </div>
          <div style={{ textAlign: "right", fontSize: "clamp(10px, 1.1vw, 12px)", color: body, minWidth: 88 }}>
            <div style={{ fontWeight: 600, color: C.navy }}>{r.who}</div>
            <div>{r.duration}</div>
          </div>
        </div>
      ))}
    </SlideFit>
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
  return (
    <SlideFit dense>
      <Eyebrow>{eyebrow}</Eyebrow>
      <SlideTitle>{title}</SlideTitle>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {tags.map((t, i) => (
          <span key={t} {...stagger(i, 0.28)} style={{ fontSize: "clamp(9px, 1vw, 11px)", fontWeight: 700, padding: "4px 8px", borderRadius: 999, background: C.surface, border: `1px solid ${C.border}`, color: C.navy }}>
            {t}
          </span>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
        {cards.map((c, i) => (
          <Card key={c.title} i={i} accent={i % 2 === 0 ? C.blue : C.mint} compact>
            <div style={{ fontWeight: 700, fontSize: "clamp(10px, 1.1vw, 12px)", color: C.navy, marginBottom: 4, lineHeight: 1.3 }}>{c.title}</div>
            <div style={{ fontSize: "clamp(9px, 1vw, 11px)", color: body, lineHeight: 1.35 }}>{c.desc}</div>
          </Card>
        ))}
      </div>
      <p {...stagger(cards.length + 1, 0.32)} style={{ fontSize: "clamp(10px, 1.15vw, 12px)", color: body, lineHeight: 1.4, marginTop: 8, marginBottom: 0 }}>
        {closing}
      </p>
    </SlideFit>
  );
}

export function AIContainmentSlide({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <SlideFit>
      <Eyebrow>{eyebrow}</Eyebrow>
      <SlideTitle>{title}</SlideTitle>
      <p className="intro-enter intro-slide-body ai-perimeter-copy" style={{ margin: "0 0 clamp(10px, 1.5vh, 16px)", animationDelay: "0.3s" }}>{sub}</p>
      <div className="intro-enter ai-perimeter-stage" style={{ animationDelay: "0.38s" }}>
        <AIContainment compact />
      </div>
    </SlideFit>
  );
}

export function ContextSlide({
  eyebrow, title, intro, challenges, focusIntro, focusItems,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  challenges: string[];
  focusIntro: string;
  focusItems: string[];
}) {
  return (
    <SlideFit dense>
      <Eyebrow>{eyebrow}</Eyebrow>
      <SlideTitle>{title}</SlideTitle>
      <p {...stagger(0, 0.2)} style={{ fontSize: "clamp(10px, 1.15vw, 12px)", color: body, lineHeight: 1.4, margin: "0 0 8px" }}>{intro}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {challenges.map((c, i) => (
          <Card key={i} i={i + 1} accent={C.coral} compact>
            <div style={{ fontSize: "clamp(9px, 1.05vw, 11px)", color: C.navy, lineHeight: 1.35 }}>{c}</div>
          </Card>
        ))}
      </div>
      <p {...stagger(challenges.length + 2, 0.28)} style={{ fontSize: "clamp(10px, 1.1vw, 11px)", fontWeight: 700, color: C.navy, margin: "8px 0 4px" }}>{focusIntro}</p>
      <ul style={{ margin: 0, paddingLeft: 16 }}>
        {focusItems.map((item, i) => (
          <li key={i} {...stagger(challenges.length + 3 + i, 0.3)} style={{ fontSize: "clamp(9px, 1.05vw, 11px)", color: body, marginBottom: 3, lineHeight: 1.35 }}>{item}</li>
        ))}
      </ul>
    </SlideFit>
  );
}

export function TransformationSlide({ title, phases }: { title: string; phases: PhaseBlock[] }) {
  return <PhaseJourneySlide title={title} phases={phases} />;
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
    <SlideFit dense>
      <Eyebrow>{eyebrow}</Eyebrow>
      <SlideTitle>{title}</SlideTitle>
      {areas.map((a, i) => (
        <Card key={a.title} i={i} accent={a.level.startsWith("Primary") ? C.blue : C.mint} compact>
          <div style={{ fontWeight: 700, fontSize: "clamp(11px, 1.2vw, 13px)", color: C.navy, marginBottom: 3 }}>
            {a.title} <span style={{ fontSize: "clamp(9px, 1vw, 10px)", fontWeight: 700, color: C.blue }}>({a.level})</span>
          </div>
          <div style={{ fontSize: "clamp(10px, 1.1vw, 12px)", color: body, lineHeight: 1.35 }}>{a.desc}</div>
        </Card>
      ))}
      <div {...stagger(areas.length + 1, 0.35)} style={{ marginTop: 12 }}>
        <button type="button" className="intro-cta" style={{
          background: C.blue, color: C.white, border: "none", padding: "12px 22px", borderRadius: 10,
          fontSize: "clamp(14px, 1.5vw, 16px)", fontWeight: 700, cursor: "pointer", boxShadow: "0 10px 24px rgba(0,101,252,.28)", fontFamily: display,
        }} onClick={onEnter}>
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
    <SlideFit dense>
      <Eyebrow>{eyebrow}</Eyebrow>
      <SlideTitle>{title}</SlideTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
        {engagements.map((e, i) => (
          <div
            key={i}
            {...stagger(i, 0.14)}
            style={{
              background: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "6px 8px",
              fontSize: "clamp(8px, 0.95vw, 10px)",
              lineHeight: 1.35,
              color: body,
            }}
          >
            <div style={{ fontWeight: 800, fontSize: "clamp(9px, 1vw, 11px)", color: C.navy, marginBottom: 2 }}>{e.sector}</div>
            <div><strong>AI maturity:</strong> {e.maturity}</div>
            <div><strong>Data:</strong> {e.data}</div>
            <div><strong>Doing:</strong> {e.doing}</div>
            <div><strong>Engagement:</strong> {e.length}</div>
            <div><strong>Value:</strong> {e.value}</div>
          </div>
        ))}
      </div>
      <div
        {...stagger(engagements.length + 1, 0.3)}
        style={{
          marginTop: 8,
          padding: "8px 10px",
          borderRadius: 10,
          background: `linear-gradient(135deg, ${C.surface} 0%, ${C.white} 100%)`,
          border: `2px solid ${C.yellow}`,
        }}
      >
        <div style={{ fontFamily: display, fontWeight: 800, fontSize: "clamp(11px, 1.2vw, 13px)", color: C.navy, marginBottom: 4 }}>
          THE SIGNAL · <CountUp target={400} />
        </div>
        <div style={{ fontSize: "clamp(9px, 1.05vw, 11px)", color: body, lineHeight: 1.35 }}>{signalBody}</div>
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
    <SlideFit dense>
      <SlideTitle>{title}</SlideTitle>
      <p {...stagger(0, 0.18)} style={{ fontSize: "clamp(12px, 1.3vw, 14px)", fontWeight: 600, color: C.navy, margin: "0 0 2px" }}>{subtitle}</p>
      <p {...stagger(1, 0.2)} style={{ fontSize: "clamp(11px, 1.2vw, 13px)", color: body, margin: "0 0 10px" }}>{objective}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {cards.map((c, i) => (
          <Card key={c.title} i={i + 2} accent={C.blue} compact>
            <div style={{ fontWeight: 700, fontSize: "clamp(11px, 1.2vw, 13px)", color: C.navy, marginBottom: 4 }}>{c.title}</div>
            <div style={{ fontSize: "clamp(10px, 1.1vw, 12px)", color: body, lineHeight: 1.35 }}>{c.desc}</div>
          </Card>
        ))}
      </div>
    </SlideFit>
  );
}

export function ContactSlide({ title, name, role, email }: { title: string; name: string; role: string; email: string }) {
  return (
    <SlideFit>
      <SlideTitle>{title}</SlideTitle>
      <div {...stagger(0, 0.28)} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: "clamp(16px, 2vh, 24px)", maxWidth: 400 }}>
        <div style={{ fontFamily: display, fontWeight: 800, fontSize: "clamp(18px, 2.5vw, 22px)", color: C.navy, marginBottom: 4 }}>{name}</div>
        <div className="intro-slide-body" style={{ fontSize: "clamp(13px, 1.4vw, 15px)", marginBottom: 10 }}>{role}</div>
        <a href={`mailto:${email}`} style={{ fontSize: "clamp(14px, 1.5vw, 15px)", color: C.blue, fontWeight: 600, textDecoration: "none" }}>{email}</a>
      </div>
    </SlideFit>
  );
}

export function CredentialsSlide({ title, cards, copyright }: { title: string; cards: CredentialCard[]; copyright: string }) {
  return (
    <SlideFit dense>
      <p {...stagger(0, 0.12)} className="intro-slide-body" style={{ fontWeight: 600, color: C.navy, margin: "0 0 10px", fontSize: "clamp(13px, 1.4vw, 16px)" }}>{title}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
        {cards.map((c, i) => (
          <Card key={c.title} i={i + 1} compact>
            <div style={{ fontWeight: 700, fontSize: "clamp(11px, 1.2vw, 13px)", color: C.navy, marginBottom: 4 }}>{c.title}</div>
            <div style={{ fontSize: "clamp(10px, 1.1vw, 12px)", color: body, lineHeight: 1.35 }}>{c.desc}</div>
          </Card>
        ))}
      </div>
      <p {...stagger(cards.length + 2, 0.35)} style={{ fontSize: "clamp(10px, 1.1vw, 12px)", color: body, marginTop: 10, marginBottom: 0 }}>{copyright}</p>
    </SlideFit>
  );
}

export function renderDeckSlide(s: DeckSlide, onEnter: () => void, heroTitle?: React.ReactNode) {
  if (isImageSlide(s)) return null;
  if ("kind" in s && (s as { kind: string }).kind === "phase-journey") {
    const pj = s as unknown as { kind: "phase-journey"; eyebrow: string; title: string; phases: PhaseBlock[] };
    return <PhaseJourneySlide eyebrow={pj.eyebrow} title={pj.title} phases={pj.phases} />;
  }
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
    case "phase-timeline":
      return <PhaseTimelineSlide {...s} />;
    case "transformation":
      return <TransformationSlide title={s.title} phases={s.phases} />;
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
