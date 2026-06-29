export type AgendaRow = {
  ref: string;
  topic: string;
  detail: string;
  who: string;
  duration: string;
};

export type CapabilityCard = { title: string; desc: string };

export type PhaseBlock = { title: string; label: string; items: string[] };

export type FocusArea = { title: string; level: string; desc: string };

export type Engagement = {
  sector: string;
  maturity: string;
  data: string;
  doing: string;
  length: string;
  value: string;
};

export type NextStepCard = { title: string; desc: string };

export type CredentialCard = { title: string; desc: string };

export type DeckSlide =
  | { kind: "hero" }
  | { kind: "agenda"; title: string; rows: AgendaRow[] }
  | {
      kind: "who-we-are";
      eyebrow: string;
      title: string;
      tags: string[];
      cards: CapabilityCard[];
      closing: string;
    }
  | {
      kind: "ai-containment";
      eyebrow: string;
      title: string;
      sub: string;
    }
  | {
      kind: "context";
      eyebrow: string;
      title: string;
      intro: string;
      challenges: string[];
      focusHeading: string;
      focusLead: string;
      focusItems: string[];
    }
  | {
      kind: "phase-journey";
      eyebrow: string;
      title: string;
      phases: PhaseBlock[];
    }
  | {
      kind: "ewhiteboard";
      eyebrow: string;
      title: string;
      areas: FocusArea[];
      cta: string;
    }
  | {
      kind: "track-record";
      eyebrow: string;
      title: string;
      engagements: Engagement[];
      signalTitle: string;
      signalBody: string;
    }
  | {
      kind: "next-steps";
      title: string;
      subtitle: string;
      objective: string;
      cards: NextStepCard[];
    }
  | {
      kind: "contact";
      title: string;
      name: string;
      role: string;
      email: string;
    }
  | {
      kind: "credentials";
      title: string;
      cards: CredentialCard[];
      copyright: string;
    }
  | { image: string; cta?: string };

export function isImageSlide(s: DeckSlide): s is { image: string; cta?: string } {
  return "image" in s && !!s.image;
}

export const TRANSFORMATION_PHASES: PhaseBlock[] = [
  {
    title: "Phase 1",
    label: "Align on context · surface pain points",
    items: [
      "Initial Alignment & Context Setting — Establish a shared understanding of the business context, strategic priorities, and key KPIs, ensuring alignment on the high-level problem space.",
      "Challenges & Pain Point Identification — Facilitate targeted workshops to uncover current challenges, operational pain points, capturing insights directly from the PMO function.",
    ],
  },
  {
    title: "Phase 2",
    label: "Validate opportunities · replay insights",
    items: [
      "Focused Deep Dive & Opportunity Validation — Progress priority areas identified in Phase 1 into detailed analysis, validating root causes, quantifying impact, and confirming where targeted intervention will deliver the most value.",
      "Synthesis & Insight Replay — Consolidate findings into key themes and patterns, replaying insights with stakeholders to validate understanding and highlight priority areas for deeper exploration.",
    ],
  },
  {
    title: "Phase 3",
    label: "Design solution · prove value · scale",
    items: [
      "Solution Design & Implementation Roadmap — Develop a pragmatic, fit-for-purpose solution with clearly defined components, supported by a phased roadmap that sequences delivery, aligns to agreed focus areas, and sets out clear milestones for execution.",
      "Proof of Value, Refinement & Rollout — Execute a proof of concept to validate the approach in a controlled setting, refine based on outcomes, and establish a clear pathway for scaled rollout and implementation.",
      "Strategic Scaling & Future Opportunity — Opportunity to extend the solution into a broader strategic capability over time, leveraging established foundations to support wider business objectives and long-term value creation.",
    ],
  },
];

/*
  Image slides: replace DECK with e.g.
  { image: "/deck/slide-1.png" },
  { image: "/deck/slide-2.png", cta: "Enter workshop board" },
*/
export const DECK: DeckSlide[] = [
  { kind: "hero" },

  {
    kind: "agenda",
    title: "Agenda",
    rows: [
      {
        ref: "01",
        topic: "Introductions, Context & Objectives",
        detail: "Introductions, align on workshop objectives, scope, and success criteria.",
        who: "SmartCo + MUFG",
        duration: "30 mins",
      },
      {
        ref: "02",
        topic: "Challenges & Whiteboarding Key Themes",
        detail:
          "Facilitated discussion to surface key challenges and inefficiencies, alongside clarity on what improved delivery should look like.",
        who: "SmartCo + MUFG",
        duration: "45 mins",
      },
      {
        ref: "03",
        topic: "Priority Areas & Focus Alignment",
        detail:
          "Present relevant use cases and impact delivered, align on the agenda for Thursday, and agree the highest-impact areas for further analysis.",
        who: "SmartCo",
        duration: "45 mins",
      },
    ],
  },

  {
    kind: "who-we-are",
    eyebrow: "WHO WE ARE",
    title: "We get complex change done",
    tags: ["Cyber, risk and compliance", "Apps and systems", "Data Platforms", "AI", "Cloud, Infra and FinOps"],
    cards: [
      {
        title: "Stabilising ERP, cloud and core system transformations",
        desc: "Drive stability, performance, and value from critical platform changes.",
      },
      {
        title: "Strengthening control and tightening costs across vendors and architectures",
        desc: "Improve visibility, optimise spend, and simplify complexity across your technology landscape.",
      },
      {
        title: "Scaling programme delivery across complex technology estates",
        desc: "Deliver at pace and scale with the right governance, capability, and delivery excellence.",
      },
      {
        title: "Scaling AI and data beyond pilots into enterprise-wide adoption",
        desc: "Move from experimentation to value, embedding AI and data into the core of your business.",
      },
      {
        title: "De-risking M&A technology integration and separation",
        desc: "Plan and execute complex integrations and separations with minimal disruption and maximum value.",
      },
    ],
    closing:
      "Our integrated approach across Advisory, Delivery and Optimisation helps you solve today's challenges, deliver sustainable outcomes and build the foundations for tomorrow.",
  },

  {
    kind: "ai-containment",
    eyebrow: "HOW OUR AI WORKS",
    title: "AI comes in. Your data never leaves.",
    sub: "Gemini and GPT power the workspace — built in your environment, owned by you.",
  },

  {
    kind: "context",
    eyebrow: "WHAT YOU NEED",
    title: "Our understanding of your context",
    intro:
      "Our current understanding, based on prior discussions and pre-workshop inputs, highlights several structural and operational challenges impacting delivery efficiency, visibility and scalability. These challenges are interconnected across processes, tooling and ways of working, and will form the basis for focused discussion and validation during the workshop sessions.",
    challenges: [
      "High manual overhead across delivery and governance, including a document-heavy PRINCE2 methodology.",
      "Fragmented work management and limited end-to-end portfolio visibility.",
      "Disconnected tooling and data landscape, with no integration layer across systems.",
      "Early AI adoption underway, but not yet joined up or turning delivery data into governance-grade insight.",
      "Constrained environment and long enablement cycles slowing the pace of change.",
    ],
    focusHeading: "Implication for workshop focus",
    focusLead: "Given the breadth of challenges, the workshop will focus on:",
    focusItems: [
      "Validating and refining key current-state challenges.",
      "Defining target outcomes and what \"good\" looks like across priority areas.",
      "Identifying a focused set of high-impact areas for further exploration.",
    ],
  },

  {
    kind: "phase-journey",
    eyebrow: "AI ADOPTION & TRANSFORMATION APPROACH",
    title: "AI Adoption & Transformation Approach",
    phases: TRANSFORMATION_PHASES,
  },

  {
    kind: "track-record",
    eyebrow: "TRACK RECORD",
    title: "Where we've made a difference",
    engagements: [
      {
        sector: "Financial services / Markets infrastructure",
        maturity: "Medium (developing)",
        data: "Data captured and stored, but no intelligence layer on top",
        doing:
          "PMO Intelligence Environment — AI status reporting, predictive lessons-learned, financial control mismatch detection. Built in their environment, owned by them.",
        length: "Free discovery → POC (~3 months) → full build",
        value: "First POC output in weeks; proven enough to commit a £400k full-build budget for next year",
      },
      {
        sector: "Financial services / Post-trade",
        maturity: "Advanced (4 of 5 dots filled)",
        data: "Strong data and reporting already in place; ready for a predictive layer",
        doing:
          "An intelligence layer on top of the change portfolio — predictive insights and automated triggers that surface risk, slippage and regulatory change before it lands, rather than reporting it after the fact",
        length: "Discovery → rolling POCs (~4 months, ongoing)",
        value: "Shift from reactive reporting to early-warning — issues caught before they escalate",
      },
      {
        sector: "Consumer goods / Divestiture programme",
        maturity: "Emerging",
        data: "High-volume contract data, unstructured and siloed",
        doing:
          "AI contract analysis supporting divestitures — reading and comparing terms at scale during separation",
        length: "Focused engagement (~6 weeks)",
        value: "Accelerated contract review and due-diligence timelines",
      },
      {
        sector: "Financial services / Universal bank",
        maturity: "Emerging (2 of 5 dots filled)",
        data: "Workforce and location data fragmented across systems",
        doing:
          "Workshop-led engagement on AI workforce and location decisioning, with a proposition to become their programme delivery partner for the next 12 months",
        length: "Workshop → 12-month programme partnership (proposed)",
        value:
          "Structured, data-driven basis for resourcing calls previously made on judgement, and a path to an ongoing partnership",
      },
      {
        sector: "Financial services / Asset management",
        maturity: "Low (early)",
        data: "Largely manual reporting; data in spreadsheets and email",
        doing: "Discovery workshop scoping AI reporting and assurance opportunities ahead of a build",
        length: "Free discovery workshop (2 sessions)",
        value: "Clear, costed roadmap and prioritised use-case backlog",
      },
      {
        sector: "Financial services / Insurance",
        maturity: "Medium (3 of 5 dots filled)",
        data: "Good operational data, fragmented procurement and operating model",
        doing:
          "AI procurement overhaul — redesigning the procurement process and rebuilding the target operating model around AI",
        length: "Discovery → process + TOM rebuild (~3 months)",
        value: "Leaner, AI-enabled procurement and a TOM fit for an AI operating model",
      },
    ],
    signalTitle: "THE SIGNAL · £400k",
    signalBody:
      "One financial services client has moved from proof-of-concept to a £400,000 full-build budget for next year. Prove value fast, then fund the scale — built in their environment, owned by them, no licences.",
  },

  {
    kind: "ewhiteboard",
    eyebrow: "DISCOVERY JOURNEY",
    title: "E-Whiteboard Focus Areas",
    areas: [
      {
        title: "Status Reporting & PMO Consolidation",
        level: "Primary",
        desc: "High manual effort in reporting and aggregation across projects, with significant time spent producing and consolidating updates (e.g. PSRs, portfolio reporting).",
      },
      {
        title: "Governance & Project Lifecycle Processes",
        level: "Primary",
        desc: "Inefficiencies across approvals, workflows, and lifecycle artefacts (e.g. Terms of Reference), creating friction and slowing delivery.",
      },
      {
        title: "Cross-Project Coordination & Ownership",
        level: "Secondary – time permitting",
        desc: "Fragmentation across teams and lack of end-to-end ownership, impacting coordination and delivery consistency.",
      },
    ],
    cta: "Enter workshop board",
  },

  {
    kind: "next-steps",
    title: "Next Steps",
    subtitle: "Thursday – Playback & Next Steps (14:00–16:00).",
    objective: "Objective: Validate findings and outline solution direction.",
    cards: [
      {
        title: "Findings Playback & Validation",
        desc: "Present the synthesised insights from Tuesday and confirm alignment on the key themes.",
      },
      {
        title: "Approach Demonstration",
        desc: "Walk through the approach, grounded in what we've already built, to show what's feasible in your environment.",
      },
      {
        title: "Prioritise & Commit",
        desc: "Agree the priority use case — highest impact, deliverable in your environment — and the next step into a focused discovery and scoped proof of concept.",
      },
    ],
  },

  {
    kind: "contact",
    title: "Your SmartCo Lead",
    name: "Callum Campbell",
    role: "Head of Client Engagement",
    email: "callum.campbell@smart-co.co.uk",
  },

  {
    kind: "credentials",
    title: "Trusted by FTSE 100 organisations to navigate their most complex IT transformation challenges.",
    cards: [
      {
        title: "12+ years of delivery",
        desc: "A track record built on complex programmes — M&A, ERP, cloud, cyber — across enterprise organisations.",
      },
      {
        title: "Advisory · Delivery · Optimisation",
        desc: "A flexible delivery model that meets you where you are and scales to what you need.",
      },
      {
        title: "Five core practices",
        desc: "AI & Data Platforms, Portfolio Management aaS, Cloud Infra & FinOps, Enterprise Applications, and Cyber, Risk & Compliance.",
      },
    ],
    copyright: "Copyright SmartCo 2026",
  },
];

export function getClosingStartIndex(deck: DeckSlide[] = DECK): number {
  return deck.findIndex((s) => !isImageSlide(s) && s.kind === "next-steps");
}

export function getWorkingDeck(deck: DeckSlide[] = DECK): DeckSlide[] {
  const idx = getClosingStartIndex(deck);
  return idx < 0 ? deck : deck.slice(0, idx);
}

export function getClosingDeck(deck: DeckSlide[] = DECK): DeckSlide[] {
  const idx = getClosingStartIndex(deck);
  return idx < 0 ? [] : deck.slice(idx);
}
