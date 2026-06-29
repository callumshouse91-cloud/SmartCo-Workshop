"use client";
import React, { useEffect, useState } from "react";
import { C } from "./brand";
import { AIContainment, AIContainmentLegend } from "./AIContainment";
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
  return { className: "intro-stagger", style: { animationDelay: `${base + i * 0.08}s` } as React.CSSProperties };
}

function Eyebrow({ children, delay = 0.1 }: { children: React.ReactNode; delay?: number }) {
  return (
    <div
      className="intro-enter intro-eyebrow"
      style={{ textTransform: "uppercase", letterSpacing: 3, fontSize: 12, fontWeight: 700, color: C.blue, marginBottom: 10, animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}

function SlideTitle({ children, delay = 0.2 }: { children: React.ReactNode; delay?: number }) {
  return (
    <h2
      className="intro-enter"
      style={{ fontFamily: display, fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, letterSpacing: -0.5, margin: "0 0 14px", color: C.navy, lineHeight: 1.1, animationDelay: `${delay}s` }}
    >
      {children}
    </h2>
  );
}

function Card({ children, i, accent }: { children: React.ReactNode; i: number; accent?: string }) {
  return (
    <div
      {...stagger(i, 0.2)}
      style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        borderLeft: accent ? `4px solid ${accent}` : `4px solid ${C.blue}`,
        borderRadius: 10,
        padding: "12px 14px",
        marginBottom: 10,
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

export function HeroSlide({ titleParts }: { titleParts?: React.ReactNode }) {
  const prompts = [
    "Where does delivery slow down?",
    "Where's the manual effort sitting?",
    "What breaks confidence in delivery?",
  ];
  return (
    <>
      <Eyebrow>AI & Delivery Workshop</Eyebrow>
      {titleParts}
      <p className="intro-enter intro-body" style={{ fontSize: 18, lineHeight: 1.5, color: body, marginTop: 16, maxWidth: 620, animationDelay: "0.45s" }}>
        A working session to find where AI takes real work off your delivery teams — and what it could look like.
      </p>
      <div className="intro-enter intro-ai-badge" style={{ animationDelay: "0.55s" }}>
        <span className="intro-live-dot" aria-hidden />
        <span>Powered by live AI — Claude · Gemini · GPT</span>
      </div>
      <div className="intro-enter intro-prompts intro-prompt-rotate" aria-live="polite" style={{ animationDelay: "0.65s" }}>
        {prompts.map((p) => <span key={p}>{p}</span>)}
      </div>
    </>
  );
}

export function AgendaSlide({ title, rows }: { title: string; rows: AgendaRow[] }) {
  return (
    <>
      <SlideTitle>{title}</SlideTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {rows.map((r, i) => (
          <div
            key={r.ref}
            {...stagger(i, 0.25)}
            style={{
              display: "grid",
              gridTemplateColumns: "36px 1fr auto",
              gap: "8px 14px",
              padding: "12px 0",
              borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : "none",
              alignItems: "start",
            }}
          >
            <span style={{ fontFamily: display, fontWeight: 800, fontSize: 14, color: C.blue }}>{r.ref}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.navy, marginBottom: 4 }}>{r.topic}</div>
              <div style={{ fontSize: 13, color: body, lineHeight: 1.45 }}>{r.detail}</div>
            </div>
            <div style={{ textAlign: "right", fontSize: 12, color: body, minWidth: 100 }}>
              <div style={{ fontWeight: 600, color: C.navy }}>{r.who}</div>
              <div>{r.duration}</div>
            </div>
          </div>
        ))}
      </div>
    </>
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
    <>
      <Eyebrow>{eyebrow}</Eyebrow>
      <SlideTitle>{title}</SlideTitle>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {tags.map((t, i) => (
          <span key={t} {...stagger(i, 0.3)} style={{ fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 999, background: C.surface, border: `1px solid ${C.border}`, color: C.navy }}>
            {t}
          </span>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
        {cards.map((c, i) => (
          <Card key={c.title} i={i} accent={i % 2 === 0 ? C.blue : C.mint}>
            <div style={{ fontWeight: 700, fontSize: 13, color: C.navy, marginBottom: 6 }}>{c.title}</div>
            <div style={{ fontSize: 12, color: body, lineHeight: 1.45 }}>{c.desc}</div>
          </Card>
        ))}
      </div>
      <p {...stagger(cards.length + 1, 0.35)} style={{ fontSize: 14, color: body, lineHeight: 1.5, marginTop: 14, marginBottom: 0 }}>
        {closing}
      </p>
    </>
  );
}

export function AIContainmentSlide({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <>
      <Eyebrow>{eyebrow}</Eyebrow>
      <SlideTitle>{title}</SlideTitle>
      <p className="intro-enter" style={{ fontSize: 15, color: body, lineHeight: 1.5, margin: "0 0 12px", animationDelay: "0.3s" }}>{sub}</p>
      <div className="intro-enter" style={{ animationDelay: "0.38s" }}>
        <AIContainment compact />
        <AIContainmentLegend />
      </div>
    </>
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
    <>
      <Eyebrow>{eyebrow}</Eyebrow>
      <SlideTitle>{title}</SlideTitle>
      <p {...stagger(0, 0.22)} style={{ fontSize: 14, color: body, lineHeight: 1.5, margin: "0 0 14px" }}>{intro}</p>
      {challenges.map((c, i) => (
        <Card key={i} i={i + 1} accent={C.coral}>
          <div style={{ fontSize: 13, color: C.navy, lineHeight: 1.45 }}>{c}</div>
        </Card>
      ))}
      <p {...stagger(challenges.length + 2, 0.3)} style={{ fontSize: 13, fontWeight: 700, color: C.navy, margin: "14px 0 8px" }}>{focusIntro}</p>
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        {focusItems.map((item, i) => (
          <li key={i} {...stagger(challenges.length + 3 + i, 0.32)} style={{ fontSize: 13, color: body, marginBottom: 6, lineHeight: 1.45 }}>{item}</li>
        ))}
      </ul>
    </>
  );
}

export function TransformationSlide({ title, phases }: { title: string; phases: PhaseBlock[] }) {
  return (
    <>
      <SlideTitle>{title}</SlideTitle>
      <div style={{ position: "relative", paddingLeft: 28 }}>
      <div className="intro-timeline-line" aria-hidden />
      {phases.map((phase, pi) => (
        <div key={phase.title} {...stagger(pi, 0.2)} style={{ marginBottom: pi < phases.length - 1 ? 20 : 0, position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ width: 12, height: 12, borderRadius: 6, background: pi === 0 ? C.blue : pi === 1 ? C.mint : C.yellow, flexShrink: 0, marginLeft: -34 }} />
            <span style={{ fontFamily: display, fontWeight: 800, fontSize: 16, color: C.navy }}>{phase.title}</span>
          </div>
          {phase.items.map((item, ii) => (
            <Card key={ii} i={pi * 3 + ii + 1} accent={pi === 0 ? C.blue : pi === 1 ? C.mint : C.yellow}>
              <div style={{ fontSize: 12, color: body, lineHeight: 1.5 }}>{item}</div>
            </Card>
          ))}
        </div>
      ))}
    </div>
    </>
  );
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
    <>
      <Eyebrow>{eyebrow}</Eyebrow>
      <SlideTitle>{title}</SlideTitle>
      {areas.map((a, i) => (
        <Card key={a.title} i={i} accent={a.level.startsWith("Primary") ? C.blue : C.mint}>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.navy, marginBottom: 4 }}>
            {a.title} <span style={{ fontSize: 11, fontWeight: 700, color: C.blue }}>({a.level})</span>
          </div>
          <div style={{ fontSize: 13, color: body, lineHeight: 1.45 }}>{a.desc}</div>
        </Card>
      ))}
      <div {...stagger(areas.length + 1, 0.4)} style={{ marginTop: 20 }}>
        <button type="button" className="intro-cta" style={{
          background: C.blue, color: C.white, border: "none", padding: "15px 28px", borderRadius: 10,
          fontSize: 16, fontWeight: 700, cursor: "pointer", boxShadow: "0 10px 24px rgba(0,101,252,.28)", fontFamily: display,
        }} onClick={onEnter}>
          Enter workshop board <span className="intro-cta-arrow" aria-hidden>→</span>
        </button>
      </div>
    </>
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
    <>
      <Eyebrow>{eyebrow}</Eyebrow>
      <SlideTitle>{title}</SlideTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {engagements.map((e, i) => (
          <div
            key={i}
            {...stagger(i, 0.18)}
            style={{
              background: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: "10px 12px",
              fontSize: 11,
              lineHeight: 1.45,
              color: body,
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 12, color: C.navy, marginBottom: 4 }}>{e.sector}</div>
            <div><strong>AI maturity:</strong> {e.maturity}</div>
            <div><strong>Data:</strong> {e.data}</div>
            <div><strong>What we're doing:</strong> {e.doing}</div>
            <div><strong>Engagement:</strong> {e.length}</div>
            <div><strong>Value:</strong> {e.value}</div>
          </div>
        ))}
      </div>
      <div
        {...stagger(engagements.length + 1, 0.35)}
        style={{
          marginTop: 14,
          padding: "14px 16px",
          borderRadius: 12,
          background: `linear-gradient(135deg, ${C.surface} 0%, ${C.white} 100%)`,
          border: `2px solid ${C.yellow}`,
        }}
      >
        <div style={{ fontFamily: display, fontWeight: 800, fontSize: 15, color: C.navy, marginBottom: 6 }}>
          THE SIGNAL · <CountUp target={400} />
        </div>
        <div style={{ fontSize: 13, color: body, lineHeight: 1.5 }}>{signalBody}</div>
      </div>
    </>
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
    <>
      <SlideTitle>{title}</SlideTitle>
      <p {...stagger(0, 0.2)} style={{ fontSize: 15, fontWeight: 600, color: C.navy, margin: "0 0 4px" }}>{subtitle}</p>
      <p {...stagger(1, 0.22)} style={{ fontSize: 14, color: body, margin: "0 0 16px" }}>{objective}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
        {cards.map((c, i) => (
          <Card key={c.title} i={i + 2} accent={C.blue}>
            <div style={{ fontWeight: 700, fontSize: 13, color: C.navy, marginBottom: 6 }}>{c.title}</div>
            <div style={{ fontSize: 12, color: body, lineHeight: 1.45 }}>{c.desc}</div>
          </Card>
        ))}
      </div>
    </>
  );
}

export function ContactSlide({ title, name, role, email }: { title: string; name: string; role: string; email: string }) {
  return (
    <>
      <SlideTitle>{title}</SlideTitle>
      <div {...stagger(0, 0.3)} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, maxWidth: 400 }}>
        <div style={{ fontFamily: display, fontWeight: 800, fontSize: 22, color: C.navy, marginBottom: 6 }}>{name}</div>
        <div style={{ fontSize: 14, color: body, marginBottom: 12 }}>{role}</div>
        <a href={`mailto:${email}`} style={{ fontSize: 15, color: C.blue, fontWeight: 600, textDecoration: "none" }}>{email}</a>
      </div>
    </>
  );
}

export function CredentialsSlide({ title, cards, copyright }: { title: string; cards: CredentialCard[]; copyright: string }) {
  return (
    <>
      <p {...stagger(0, 0.15)} style={{ fontSize: 16, fontWeight: 600, color: C.navy, lineHeight: 1.45, margin: "0 0 16px" }}>{title}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
        {cards.map((c, i) => (
          <Card key={c.title} i={i + 1}>
            <div style={{ fontWeight: 700, fontSize: 13, color: C.navy, marginBottom: 6 }}>{c.title}</div>
            <div style={{ fontSize: 12, color: body, lineHeight: 1.45 }}>{c.desc}</div>
          </Card>
        ))}
      </div>
      <p {...stagger(cards.length + 2, 0.4)} style={{ fontSize: 12, color: body, marginTop: 16, marginBottom: 0 }}>{copyright}</p>
    </>
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

export function slideNeedsScroll(s: DeckSlide): boolean {
  if (isImageSlide(s)) return false;
  return ["who-we-are", "context", "transformation", "track-record", "credentials"].includes(s.kind);
}
