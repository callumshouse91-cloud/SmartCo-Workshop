"use client";
import React from "react";
import { C } from "./brand";

const display = "var(--font-outfit), system-ui, sans-serif";

/** Animated on-brand diagram: web AI flows in, Claude wall contains, human prompts in, nothing leaves. */
export function AIContainment({ compact }: { compact?: boolean }) {
  const w = compact ? 640 : 800;
  const h = compact ? 340 : 420;
  const cx = w * 0.5;
  const cy = h * 0.46;
  const wallR = compact ? 95 : 118;
  const coreR = compact ? 44 : 54;

  const geminiX = w * 0.1;
  const geminiY = h * 0.28;
  const gptX = w * 0.1;
  const gptY = h * 0.62;
  const humanX = cx;
  const humanY = h * 0.9;

  const wallLeft = cx - wallR;
  const wallRight = cx + wallR;
  const geminiEnd = { x: wallLeft + 8, y: cy - 28 };
  const gptEnd = { x: wallLeft + 8, y: cy + 28 };
  const humanEnd = { x: cx, y: cy + wallR - 6 };
  const blockedStart = { x: cx + coreR + 4, y: cy };
  const blockedEnd = { x: wallRight - 10, y: cy };

  return (
    <div className="intro-diagram-host">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="AI containment diagram: Gemini and GPT bring intelligence in; Claude forms a sealed wall; your workshop data stays inside; nothing leaves"
        className="ai-containment"
        style={{ display: "block", overflow: "visible" }}
      >
        <defs>
          <marker id="arrow-blue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill={C.blue} />
          </marker>
          <marker id="arrow-mint" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill={C.mint} />
          </marker>
          <marker id="arrow-navy" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill={C.navy} />
          </marker>
          <marker id="arrow-coral" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill={C.coral} />
          </marker>
        </defs>

        {/* Source label */}
        <text x={geminiX} y={geminiY - 52} fill={C.navy} fontSize={11} fontWeight={600} fontFamily={display} opacity={0.75}>
          web AI · brings info in
        </text>

        {/* Gemini node */}
        <rect x={geminiX - 44} y={geminiY - 22} width={88} height={44} rx={10} fill={C.blue} className="containment-node" />
        <text x={geminiX} y={geminiY + 5} textAnchor="middle" fill={C.white} fontSize={14} fontWeight={700} fontFamily={display}>Gemini</text>

        {/* GPT node */}
        <rect x={gptX - 36} y={gptY - 22} width={72} height={44} rx={10} fill={C.mint} className="containment-node" />
        <text x={gptX} y={gptY + 5} textAnchor="middle" fill={C.navy} fontSize={14} fontWeight={700} fontFamily={display}>GPT</text>

        {/* Inbound dotted lines */}
        <path
          id="path-gemini"
          d={`M ${geminiX + 44} ${geminiY} L ${geminiEnd.x} ${geminiEnd.y}`}
          fill="none"
          stroke={C.blue}
          strokeWidth={2.5}
          strokeDasharray="6 5"
          markerEnd="url(#arrow-blue)"
          className="containment-dash-in containment-dash-blue"
        />
        <circle r={4} fill={C.blue} className="containment-travel containment-travel-gemini">
          <animateMotion dur="2.4s" repeatCount="indefinite" path={`M ${geminiX + 44} ${geminiY} L ${geminiEnd.x} ${geminiEnd.y}`} />
        </circle>

        <path
          id="path-gpt"
          d={`M ${gptX + 36} ${gptY} L ${gptEnd.x} ${gptEnd.y}`}
          fill="none"
          stroke={C.mint}
          strokeWidth={2.5}
          strokeDasharray="6 5"
          markerEnd="url(#arrow-mint)"
          className="containment-dash-in containment-dash-mint"
        />
        <circle r={4} fill={C.mint} className="containment-travel">
          <animateMotion dur="2.8s" repeatCount="indefinite" path={`M ${gptX + 36} ${gptY} L ${gptEnd.x} ${gptEnd.y}`} />
        </circle>

        {/* Claude wall — outer faint ring */}
        <circle cx={cx} cy={cy} r={wallR + 10} fill="none" stroke={C.coral} strokeWidth={2} opacity={0.2} className="containment-wall-outer" />
        {/* Main wall ring */}
        <circle cx={cx} cy={cy} r={wallR} fill="none" stroke={C.coral} strokeWidth={14} className="containment-wall-pulse" />
        {/* Padlock on ring (top-right) */}
        <g transform={`translate(${cx + wallR * 0.55}, ${cy - wallR * 0.78})`}>
          <rect x={-7} y={4} width={14} height={11} rx={2} fill={C.coral} />
          <path d="M -5 4 V 1 a 5 5 0 0 1 10 0 v 3" fill="none" stroke={C.coral} strokeWidth={2.5} />
        </g>

        <text x={cx} y={cy - wallR - 18} textAnchor="middle" fill={C.navy} fontSize={15} fontWeight={800} fontFamily={display}>
          Claude · the wall
        </text>

        {/* Core — white with coral border */}
        <circle cx={cx} cy={cy} r={coreR} fill={C.white} stroke={C.coral} strokeWidth={2} />
        <text x={cx} y={cy - 6} textAnchor="middle" fill={C.navy} fontSize={13} fontWeight={800} fontFamily={display}>Your workshop</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#3A4358" fontSize={10} fontWeight={600}>your data stays in</text>

        {/* Blocked outbound arrow */}
        <line
          x1={blockedStart.x}
          y1={blockedStart.y}
          x2={blockedEnd.x}
          y2={blockedEnd.y}
          stroke={C.coral}
          strokeWidth={2}
          strokeDasharray="4 3"
          opacity={0.7}
        />
        <text x={(blockedStart.x + blockedEnd.x) / 2 + 6} y={blockedStart.y - 6} fill={C.coral} fontSize={16} fontWeight={800}>✕</text>

        <text x={cx} y={cy + wallR + 28} textAnchor="middle" fill={C.coral} fontSize={12} fontWeight={700} fontFamily={display}>
          nothing leaves the wall
        </text>

        {/* Human */}
        <g transform={`translate(${humanX}, ${humanY})`}>
          <circle cx={0} cy={-18} r={9} fill={C.navy} />
          <path d="M -14 8 Q 0 -2 14 8 L 14 22 L -14 22 Z" fill={C.navy} />
          <text x={0} y={38} textAnchor="middle" fill={C.navy} fontSize={11} fontWeight={600} fontFamily={display}>you · prompt-driven</text>
        </g>

        <line
          x1={humanX}
          y1={humanY - 28}
          x2={humanEnd.x}
          y2={humanEnd.y}
          stroke={C.navy}
          strokeWidth={2.5}
          markerEnd="url(#arrow-navy)"
          className="containment-human-line"
        />
        <circle r={4} fill={C.navy} className="containment-travel">
          <animateMotion dur="2.2s" repeatCount="indefinite" path={`M ${humanX} ${humanY - 28} L ${humanEnd.x} ${humanEnd.y}`} />
        </circle>
      </svg>
    </div>
  );
}

export function AIContainmentLegend() {
  const chips = [
    { label: "Gemini", color: C.blue, text: C.white },
    { label: "GPT", color: C.mint, text: C.navy },
    { label: "Claude wall", color: C.coral, text: C.white },
    { label: "You", color: C.navy, text: C.white },
  ];
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 12 }}>
      {chips.map((c, k) => (
        <span
          key={c.label}
          className="intro-enter intro-chip"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 12px",
            borderRadius: 999,
            background: c.color,
            color: c.text,
            fontSize: 11,
            fontWeight: 700,
            animationDelay: `${0.5 + k * 0.08}s`,
          }}
        >
          {c.label}
        </span>
      ))}
    </div>
  );
}
