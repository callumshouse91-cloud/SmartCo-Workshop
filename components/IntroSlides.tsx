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
      <h2 className="phase-journey-title intro-slide-title">{title}</h2>
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
    <SlideFit className="intro-slide-has-corner">
      <SlideCornerAccent />
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
    <SlideFit dense wide className="intro-slide-has-corner">
      <SlideCornerAccent />
      <div className="intro-slide-split">
        <div className="intro-slide-split-main">
          <Eyebrow>{eyebrow}</Eyebrow>
          <SlideTitle>{title}</SlideTitle>
          <ul className="intro-hex-list">
            {cards.map((c, i) => (
              <HexBulletRow key={c.title} index={i} delay={0.32 + i * 0.08}>
                <div className="intro-hex-title">{c.title}</div>
                <div className="intro-hex-body">{c.desc}</div>
              </HexBulletRow>
            ))}
          </ul>
          <p {...stagger(cards.length, 0.36)} className="intro-slide-body intro-slide-closing">{closing}</p>
        </div>
        <aside className="intro-slide-panel intro-stagger" style={{ animationDelay: "0.4s" }}>
          <div className="intro-tag-stack">
            {tags.map((t, i) => (
              <span key={t} className="intro-tag-pill" style={{ animationDelay: `${0.45 + i * 0.06}s` }}>
                {t}
              </span>
            ))}
          </div>
        </aside>
      </div>
    </SlideFit>
  );
}

export function AIContainmentSlide({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <SlideFit wide className="intro-slide-has-corner">
      <SlideCornerAccent />
      <Eyebrow>{eyebrow}</Eyebrow>
      <SlideTitle>{title}</SlideTitle>
      <p className="intro-enter intro-slide-body ai-perimeter-copy" style={{ animationDelay: "0.3s" }}>{sub}</p>
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
    <SlideFit dense wide className="intro-slide-has-corner">
      <SlideCornerAccent />
      <Eyebrow>{eyebrow}</Eyebrow>
      <SlideTitle>{title}</SlideTitle>
      <p {...stagger(0, 0.28)} className="intro-slide-body intro-slide-intro">{intro}</p>
      <ul className="intro-hex-list intro-hex-list--compact">
        {challenges.map((c, i) => (
          <HexBulletRow key={i} index={i} delay={0.36 + i * 0.08}>
            <div className="intro-hex-body">{c}</div>
          </HexBulletRow>
        ))}
      </ul>
      <p {...stagger(challenges.length + 1, 0.36)} className="intro-focus-intro">{focusIntro}</p>
      <ul className="intro-hex-list intro-hex-list--compact">
        {focusItems.map((item, i) => (
          <HexBulletRow key={i} index={i + challenges.length} delay={0.4 + challenges.length * 0.08 + i * 0.08}>
            <div className="intro-hex-body">{item}</div>
          </HexBulletRow>
        ))}
      </ul>
    </SlideFit>
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
  eyebrow, title, engagements, signalBody,
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
      <div className="intro-track-table-wrap">
        <table className="intro-track-table">
          <thead className="intro-stagger" style={{ animationDelay: "0.3s" }}>
            <tr>
              <th>Sector</th>
              <th>What we did</th>
              <th>Engagement</th>
              <th>Outcome</th>
            </tr>
          </thead>
          <tbody>
            {engagements.map((e, i) => (
              <tr key={i} className="intro-stagger" style={{ animationDelay: `${0.38 + i * 0.08}s` }}>
                <td>{e.sector}</td>
                <td>{e.doing}</td>
                <td>{e.length}</td>
                <td>{e.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div {...stagger(engagements.length + 1, 0.42)} className="intro-signal-strip">
        <div className="intro-signal-title">
          THE SIGNAL · <CountUp target={400} />
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
    case "phase-timeline":
      return <PhaseTimelineSlide {...s} />;
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
