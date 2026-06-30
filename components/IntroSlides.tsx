"use client";
import React, { useState } from "react";
import { C, SmartCoLogo } from "./brand";
import { AIContainment } from "./AIContainment";
import type {
  AgendaRow,
  CapabilityCard,
  CredentialCard,
  DeckSlide,
  FocusArea,
  NextStepCard,
  PhaseBlock,
  TeamMemberCard,
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

export function PhaseJourneySlide({
  eyebrow,
  title,
}: {
  eyebrow?: string;
  title: string;
  phases?: PhaseBlock[];
}) {
  return (
    <div className="phase-journey-slide">
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 className="phase-journey-title intro-slide-title">{title}</h2>
      <img
        src="/images/transformation-timeline.png"
        alt="AI adoption and transformation approach timeline — three phases from initial alignment through to strategic scaling, with eight workstream callouts"
        className="phase-journey-img"
      />
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

const TEAM_PILL_ACCENTS = [C.blue, C.mint, C.coral];

function TeamMemberPhoto({ src, initials, name }: { src: string; initials: string; name: string }) {
  const [err, setErr] = useState(false);
  if (err) {
    return (
      <div className="whos-room-photo whos-room-photo--fallback" aria-hidden>
        {initials}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={name}
      className="whos-room-photo"
      onError={() => setErr(true)}
    />
  );
}

export function WhosInTheRoomSlide({
  eyebrow,
  title,
  members,
}: {
  eyebrow: string;
  title: string;
  members: TeamMemberCard[];
}) {
  return (
    <SlideFit className="intro-slide-has-corner whos-in-room-slide">
      <SlideCornerAccent />
      <Eyebrow>{eyebrow}</Eyebrow>
      <SlideTitle>{title}</SlideTitle>
      <div className="whos-room-grid">
        {members.map((m, i) => {
          const accent = TEAM_PILL_ACCENTS[i % TEAM_PILL_ACCENTS.length];
          return (
            <article
              key={m.name}
              {...stagger(i, 0.34)}
              className="whos-room-card"
            >
              <TeamMemberPhoto src={m.photo} initials={m.initials} name={m.name} />
              <h3 className="whos-room-name">{m.name}</h3>
              <p className="whos-room-role">{m.role}</p>
              <span className="whos-room-pill" style={{ background: accent }}>
                {m.rolePill}
              </span>
              <p className="whos-room-bio">{m.bio}</p>
            </article>
          );
        })}
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

function whoHexPathLocal(r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    pts.push(`${(r * Math.cos(a)).toFixed(1)},${(r * Math.sin(a)).toFixed(1)}`);
  }
  return `M ${pts.join(" L ")} Z`;
}

const WHO_CALLOUT_SLOTS = [
  { side: "left" as const, top: 29, index: 0, delay: 1.95 },
  { side: "left" as const, top: 50, index: 1, delay: 2.03 },
  { side: "left" as const, top: 69, index: 2, delay: 2.11 },
  { side: "right" as const, top: 27, index: 3, delay: 2.19 },
  { side: "right" as const, top: 48, index: 4, delay: 2.27 },
];

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
  eyebrow, title, cards, closing,
}: {
  eyebrow: string;
  title: string;
  tags?: string[];
  cards: CapabilityCard[];
  closing: string;
}) {
  return (
    <div className="who-we-are-slide intro-slide-has-corner">
      <SlideCornerAccent />
      <Eyebrow>{eyebrow}</Eyebrow>
      <SlideTitle className="who-we-are-title">{title}</SlideTitle>

      <div className="who-we-are-body">
        <div className="who-we-are-stage">
          <img
            src="/images/capability-ring.png"
            alt="SmartCo capability ring — Advisory, Delivery and Optimisation across AI, Cloud Infra & FinOps, Cyber risk & compliance, Apps and systems, and Data Platforms"
            className="who-capability-ring-img"
          />

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

export function PhaseJourneyDeckSlide(props: { eyebrow: string; title: string; phases?: PhaseBlock[] }) {
  return <PhaseJourneySlide eyebrow={props.eyebrow} title={props.title} />;
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
  eyebrow, title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <SlideFit dense wide className="intro-slide-track">
      <Eyebrow>{eyebrow}</Eyebrow>
      <SlideTitle>{title}</SlideTitle>
      <img
        src="/images/track-record-table.png"
        alt="SmartCo financial services track record — sector, AI maturity, data situation, what we're doing, engagement length and value realisation, with a £400k full-build signal"
        className="intro-track-record-img"
      />
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
    case "whos-in-room":
      return <WhosInTheRoomSlide {...s} />;
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
