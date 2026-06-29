"use client";
import React from "react";
import { C } from "./brand";

const display = "var(--font-outfit), system-ui, sans-serif";
const body = "var(--font-dm-sans), system-ui, sans-serif";

const LOGOS = {
  claude: "/logos/Claude.jpg",
  gemini: "/logos/Google-Gemini-Logo.png",
  gpt: "/logos/ChatGPT-Logo.jpg",
} as const;

function pct(n: number, total: number) {
  return `${(n / total) * 100}%`;
}

function PersonIcon({ x, y, size = 22 }: { x: number; y: number; size?: number }) {
  const r = size * 0.22;
  return (
    <g transform={`translate(${x}, ${y})`} aria-hidden>
      <circle cx={0} cy={-size * 0.28} r={r} fill={C.navy} />
      <path
        d={`M ${-size * 0.34} ${size * 0.08} Q 0 ${-size * 0.06} ${size * 0.34} ${size * 0.08} L ${size * 0.34} ${size * 0.42} L ${-size * 0.34} ${size * 0.42} Z`}
        fill={C.navy}
      />
    </g>
  );
}

function BadgeLock({ size = 11 }: { size?: number }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 12 12" aria-hidden style={{ flexShrink: 0 }}>
      <rect x={3.2} y={5.2} width={5.6} height={4.4} rx={1.2} fill={C.white} />
      <path
        d="M 4.2 5.2 V 3.6 a 1.8 1.8 0 0 1 3.6 0 V 5.2"
        fill="none"
        stroke={C.white}
        strokeWidth={1.4}
      />
    </svg>
  );
}

function ProviderChipHtml({
  left,
  top,
  width,
  height,
  name,
  logoSrc,
  logoAlt,
}: {
  left: string;
  top: string;
  width: string;
  height: string;
  name: string;
  logoSrc: string;
  logoAlt: string;
}) {
  return (
    <div
      className="containment-provider-chip"
      style={{ left, top, width, height }}
    >
      <div className="containment-logo-slot">
        <img src={logoSrc} alt={logoAlt} />
      </div>
      <div className="containment-provider-copy">
        <span className="containment-provider-name">{name}</span>
        <span className="containment-provider-sub">web LLM</span>
      </div>
    </div>
  );
}

/** Animated on-brand diagram: web LLMs feed in; Claude wall contains; your data never leaves. */
export function AIContainment({ compact }: { compact?: boolean }) {
  const w = compact ? 760 : 920;
  const h = compact ? 300 : 380;
  const cx = w * 0.66;
  const cy = h * 0.52;
  const wallR = compact ? 86 : 108;
  const coreR = compact ? 40 : 50;
  const outerR = wallR + 16;

  const chipW = compact ? 132 : 148;
  const chipH = compact ? 54 : 60;
  const chipX = w * 0.02;
  const geminiY = cy - 58;
  const gptY = cy + 58;
  const chipRight = chipX + chipW;

  const geminiCore = { x: cx - coreR + 6, y: cy - 10 };
  const gptCore = { x: cx - coreR + 6, y: cy + 10 };
  const geminiPath = `M ${chipRight} ${geminiY} L ${geminiCore.x} ${geminiCore.y}`;
  const gptPath = `M ${chipRight} ${gptY} L ${gptCore.x} ${gptCore.y}`;

  const blockedStart = { x: cx + coreR - 2, y: cy };
  const blockedEnd = { x: cx + wallR - 8, y: cy };
  const badgeW = compact ? 178 : 196;
  const badgeH = compact ? 28 : 30;
  const badgeX = cx - badgeW / 2;
  const badgeY = cy - wallR - badgeH - 6;

  return (
    <div className="intro-diagram-host ai-perimeter-diagram">
      <div className="ai-containment-scene">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="AI secure perimeter: Gemini and GPT feed web information in through the wall; your data stays inside and nothing leaves"
          className="ai-containment-svg"
          style={{ display: "block", overflow: "visible" }}
        >
          <defs>
            <marker id="arrow-blue-in" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <path d="M0,0 L7,3.5 L0,7 Z" fill={C.blue} opacity={0.85} />
            </marker>
            <marker id="arrow-mint-in" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <path d="M0,0 L7,3.5 L0,7 Z" fill={C.mint} opacity={0.9} />
            </marker>
          </defs>

          <g transform={`translate(${cx}, ${cy})`}>
            <g className="containment-wall-outer">
              <circle
                cx={0}
                cy={0}
                r={outerR}
                fill="none"
                stroke={C.coral}
                strokeWidth={1.5}
                strokeDasharray="5 7"
                opacity={0.28}
              />
            </g>
          </g>

          <path
            d={geminiPath}
            fill="none"
            stroke={C.blue}
            strokeWidth={2.5}
            strokeDasharray="7 6"
            markerEnd="url(#arrow-blue-in)"
            className="containment-dash-in containment-dash-blue"
          />
          <path
            d={gptPath}
            fill="none"
            stroke={C.mint}
            strokeWidth={2.5}
            strokeDasharray="7 6"
            markerEnd="url(#arrow-mint-in)"
            className="containment-dash-in containment-dash-mint"
            style={{ animationDelay: "0.4s" }}
          />

          <circle cx={cx} cy={cy} r={wallR} fill="none" stroke={C.coral} strokeWidth={compact ? 12 : 14} />

          <g transform={`translate(${cx + wallR * 0.52}, ${cy - wallR * 0.72})`} aria-hidden>
            <rect x={-6} y={3} width={12} height={10} rx={2} fill={C.coral} />
            <path d="M -4 3 V 0.5 a 4 4 0 0 1 8 0 V 3" fill="none" stroke={C.coral} strokeWidth={2} />
          </g>

          <circle cx={cx} cy={cy} r={coreR} fill={C.white} stroke={C.coral} strokeWidth={2} />
          <PersonIcon x={cx} y={cy - 14} size={compact ? 20 : 24} />
          <text x={cx} y={cy + 14} textAnchor="middle" fill={C.navy} fontSize={compact ? 12 : 13} fontWeight={800} fontFamily={display}>
            You
          </text>
          <text x={cx} y={cy + 28} textAnchor="middle" fill={C.body} fontSize={compact ? 9 : 10} fontWeight={600} fontFamily={body}>
            your data stays here
          </text>

          <line
            x1={blockedStart.x}
            y1={blockedStart.y}
            x2={blockedEnd.x}
            y2={blockedEnd.y}
            stroke={C.coral}
            strokeWidth={2}
            strokeDasharray="4 3"
            opacity={0.75}
          />
          <g transform={`translate(${blockedEnd.x + 2}, ${blockedEnd.y})`} aria-hidden>
            <circle r={9} fill={C.white} stroke={C.coral} strokeWidth={1.5} />
            <line x1={-4} y1={-4} x2={4} y2={4} stroke={C.coral} strokeWidth={2} strokeLinecap="round" />
            <line x1={4} y1={-4} x2={-4} y2={4} stroke={C.coral} strokeWidth={2} strokeLinecap="round" />
          </g>
          <text
            x={blockedEnd.x + 18}
            y={blockedEnd.y + 4}
            fill={C.coral}
            fontSize={compact ? 10 : 11}
            fontWeight={700}
            fontFamily={display}
          >
            nothing leaves
          </text>

          <text
            x={chipRight + (cx - wallR - chipRight) * 0.42}
            y={cy + 4}
            textAnchor="middle"
            fill={C.navy}
            fontSize={compact ? 10 : 11}
            fontWeight={600}
            fontFamily={body}
            opacity={0.72}
          >
            web info in
          </text>
        </svg>

        <div className="ai-containment-html">
          <div
            className="containment-wall-badge"
            style={{
              left: pct(badgeX, w),
              top: pct(badgeY, h),
              width: pct(badgeW, w),
              height: pct(badgeH, h),
            }}
          >
            <div className="containment-badge-logo">
              <img src={LOGOS.claude} alt="" />
            </div>
            <BadgeLock size={compact ? 10 : 11} />
            <span className="containment-badge-label">Claude · the wall</span>
          </div>

          <ProviderChipHtml
            left={pct(chipX, w)}
            top={pct(geminiY - chipH / 2, h)}
            width={pct(chipW, w)}
            height={pct(chipH, h)}
            name="Gemini"
            logoSrc={LOGOS.gemini}
            logoAlt="Gemini"
          />
          <ProviderChipHtml
            left={pct(chipX, w)}
            top={pct(gptY - chipH / 2, h)}
            width={pct(chipW, w)}
            height={pct(chipH, h)}
            name="GPT"
            logoSrc={LOGOS.gpt}
            logoAlt="ChatGPT"
          />
        </div>
      </div>
    </div>
  );
}
