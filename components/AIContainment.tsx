"use client";
import React, { useId } from "react";
import { C } from "./brand";

const display = "var(--font-outfit), system-ui, sans-serif";
const bodyFont = "var(--font-dm-sans), system-ui, sans-serif";

const LOGOS = {
  claude: "/logos/Claude.jpg",
  gemini: "/logos/Google-Gemini-Logo.png",
  gpt: "/logos/ChatGPT-Logo.jpg",
} as const;

const VB_W = 760;
const VB_H = 380;

/** Single-SVG "Claude wall" diagram — scales with container, labels cannot drift. */
export function AIContainment(_props?: { compact?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const arrowBlueId = `ab-${uid}`;
  const arrowMintId = `ag-${uid}`;

  return (
    <div className="ai-containment-fixed">
      <svg
        width="100%"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="ai-containment-svg"
        role="img"
        aria-label="AI secure perimeter: Gemini and GPT feed web information in through the wall; your data stays inside and nothing leaves"
      >
        <defs>
          <marker
            id={arrowBlueId}
            viewBox="0 0 10 10"
            refX={8}
            refY={5}
            markerWidth={6}
            markerHeight={6}
            orient="auto-start-reverse"
          >
            <path d="M2 1L8 5L2 9" fill="none" stroke={C.blue} strokeWidth={1.5} strokeLinecap="round" />
          </marker>
          <marker
            id={arrowMintId}
            viewBox="0 0 10 10"
            refX={8}
            refY={5}
            markerWidth={6}
            markerHeight={6}
            orient="auto-start-reverse"
          >
            <path d="M2 1L8 5L2 9" fill="none" stroke={C.mint} strokeWidth={1.5} strokeLinecap="round" />
          </marker>
        </defs>

        <circle
          cx={520}
          cy={190}
          r={114}
          fill="none"
          stroke={C.coral}
          strokeWidth={1.5}
          strokeDasharray="2 11"
          opacity={0.4}
          className="containment-outer-ring"
        />
        <circle cx={520} cy={190} r={92} fill="none" stroke={C.coral} strokeWidth={20} />
        <circle cx={520} cy={190} r={74} fill={C.surface} stroke={C.border} strokeWidth={1} />

        <line
          className="containment-flow"
          x1={240}
          y1={138}
          x2={442}
          y2={172}
          stroke={C.blue}
          strokeWidth={2.5}
          strokeDasharray="8 8"
          strokeLinecap="round"
          markerEnd={`url(#${arrowBlueId})`}
        />
        <line
          className="containment-flow"
          x1={240}
          y1={238}
          x2={442}
          y2={208}
          stroke={C.mint}
          strokeWidth={2.5}
          strokeDasharray="8 8"
          strokeLinecap="round"
          markerEnd={`url(#${arrowMintId})`}
        />

        <line x1={598} y1={190} x2={626} y2={190} stroke={C.coral} strokeWidth={2.5} strokeLinecap="round" />
        <path d="M630 182 L642 198 M642 182 L630 198" stroke={C.coral} strokeWidth={2.5} strokeLinecap="round" />

        <circle cx={520} cy={164} r={10} fill={C.navy} />
        <path d="M502 192 a18 18 0 0 1 36 0 z" fill={C.navy} />
        <text x={520} y={216} textAnchor="middle" fontSize={14} fontWeight={600} fill={C.navy} fontFamily={display}>
          You
        </text>
        <text x={520} y={233} textAnchor="middle" fontSize={12} fill={C.body} fontFamily={bodyFont}>
          your data stays here
        </text>

        <rect x={443} y={74} width={154} height={28} rx={14} fill={C.white} stroke={C.coral} strokeWidth={1.5} />
        <image href={LOGOS.claude} x={452} y={80} width={16} height={16} preserveAspectRatio="xMidYMid meet" aria-hidden />
        <text x={474} y={92} fontSize={13} fontWeight={600} fill={C.navy} fontFamily={display}>
          Claude · the wall
        </text>

        <text x={332} y={180} fontSize={12} fill={C.body} fontFamily={bodyFont}>
          web info in
        </text>
        <text x={650} y={194} fontSize={13} fontWeight={600} fill={C.coral} fontFamily={display}>
          nothing leaves
        </text>

        <rect x={30} y={110} width={200} height={56} rx={12} fill={C.white} stroke={C.border} strokeWidth={1} />
        <image href={LOGOS.gemini} x={44} y={126} width={32} height={24} preserveAspectRatio="xMidYMid meet" aria-label="Gemini" />
        <text x={88} y={135} fontSize={14} fontWeight={600} fill={C.navy} fontFamily={display}>
          Gemini
        </text>
        <text x={88} y={153} fontSize={12} fill={C.body} fontFamily={bodyFont}>
          web LLM
        </text>

        <rect x={30} y={210} width={200} height={56} rx={12} fill={C.white} stroke={C.border} strokeWidth={1} />
        <image href={LOGOS.gpt} x={46} y={224} width={28} height={28} preserveAspectRatio="xMidYMid meet" aria-label="ChatGPT" />
        <text x={88} y={235} fontSize={14} fontWeight={600} fill={C.navy} fontFamily={display}>
          GPT
        </text>
        <text x={88} y={253} fontSize={12} fill={C.body} fontFamily={bodyFont}>
          web LLM
        </text>
      </svg>
    </div>
  );
}
