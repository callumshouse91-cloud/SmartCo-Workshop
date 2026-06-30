import { themeLabel, type AIProvider } from "@/components/brand";

export type PromptPayload = { system: string; content: string };

export type CaptureCard = {
  id: string;
  text: string;
  theme?: string | null;
  description?: string;
  dataPoint?: string;
  dataPoints?: string[];
  /** @deprecated legacy flat impacts array — migrated on load */
  impacts?: string[];
  impact?: {
    types?: string[];
    hours?: number;
    severity?: string;
    /** @deprecated legacy single type */
    type?: string;
  } | null;
  classifying?: boolean;
};

export type ThemeLabelFn = (id: string | null | undefined) => string;

export type ToolResearchInput = {
  name: string;
  cat: string;
  scope: string;
  use: string;
  pain?: string;
};

export type AskMessage = { role: "user" | "assistant"; content: string };

export const ASK_SYSTEM =
  "You are a helpful assistant inside the SmartCo workshop app. Answer the user's question clearly and concisely.";

const RESEARCH_SYSTEM =
  "You are a technology research analyst briefing a bank delivery team. " +
  "Provide current, sourced research on: AI features, MCP support, pricing, roadmap/recent changes — " +
  "strongly preferring official vendor pages, pricing pages, release notes, API docs, GitHub repos, and support docs. " +
  "Return ONLY valid JSON (no markdown) with exactly these string keys: " +
  '"aiCapabilities" (AI features, roadmap, what is announced), "mcpIntegrations" (MCP support, APIs, integration ecosystem), ' +
  '"pricing" (licensing model and rough price bands), "marketChanges" (recent launches, acquisitions, competitive moves). ' +
  "Each value: 2–4 concise sentences citing what you found. If uncertain, say so.";

function dataPointsForCard(c: CaptureCard): string[] {
  if (c.dataPoints?.length) {
    return c.dataPoints.filter((d) => d !== "N/A");
  }
  if (c.dataPoint && c.dataPoint !== "N/A") return [c.dataPoint];
  return [];
}

function impactTypesForCard(c: CaptureCard): string[] {
  if (c.impact?.types?.length) return c.impact.types;
  if (c.impacts?.length) return c.impacts;
  if (c.impact?.type) {
    const t = c.impact.type;
    if (t === "Hours saved / week") return ["Time / effort"];
    const map: Record<string, string> = {
      "Increased risk": "Risk / regulatory",
      "Quality issue": "Quality",
      "Regulatory issue": "Risk / regulatory",
      Visibility: "Quality",
      Insights: "Quality",
    };
    return [map[t] ?? t];
  }
  return [];
}

function impactExtrasForCard(c: CaptureCard): string[] {
  const extras: string[] = [];
  const types = impactTypesForCard(c);
  if (types.length) extras.push(`impact types: ${types.join(" + ")}`);
  if (c.impact?.severity) extras.push(`severity: ${c.impact.severity}`);
  if (c.impact?.hours != null && c.impact.hours > 0) extras.push(`hours saved/week: ${c.impact.hours}`);
  else if (c.impact?.type && (c.impact as { hours?: number }).hours) {
    extras.push(`hours saved/week: ${(c.impact as { hours?: number }).hours}`);
  }
  return extras;
}

function cardLine(c: CaptureCard, labelFn: ThemeLabelFn): string {
  const body = (c.description ?? c.text).trim();
  const extras: string[] = [];
  const dps = dataPointsForCard(c);
  if (dps.length) extras.push(`data sources: ${dps.join(" + ")}`);
  const impactExtras = impactExtrasForCard(c);
  if (impactExtras.length) extras.push(...impactExtras);
  const suffix = extras.length ? ` (${extras.join("; ")})` : "";
  return `[${labelFn(c.theme)}] ${body}${suffix}`;
}

function formatCardLines(cards: CaptureCard[], labelFn: ThemeLabelFn = themeLabel): string {
  return cards.map((c) => cardLine(c, labelFn)).join("\n");
}

export function buildReviewPrompt(cards: CaptureCard[], labelFn?: ThemeLabelFn): PromptPayload {
  return {
    system:
      "You are a senior delivery/PMO consultant observing a live MUFG discovery workshop. Given captured pain points across three themes, return 3 sharp insights as plain-text lines, each starting with '— '. Cover: the strongest emerging pattern, the single biggest AI opportunity, and one gap worth probing. No preamble, no headings.",
    content: formatCardLines(cards, labelFn),
  };
}

export function buildComparePrompt(cards: CaptureCard[], labelFn?: ThemeLabelFn): PromptPayload {
  return buildReviewPrompt(cards, labelFn);
}

export function buildLinkagesPrompt(cards: CaptureCard[]): PromptPayload {
  const list = cards.map((c) => ({
    id: c.id,
    text: (c.description ?? c.text).trim(),
    theme: c.theme ?? "uncategorised",
  }));
  return {
    system:
      'Return ONLY a JSON array, no prose. Identify pairs of related captured items. Each element: {"a": id, "b": id, "reason": "<=6 words"}. Use only the provided ids. Max 6 pairs.',
    content: JSON.stringify(list),
  };
}

export function buildSuggestPrompt(
  cards: CaptureCard[],
  opts?: { labelFn?: ThemeLabelFn; themeIds?: string[] }
): PromptPayload {
  const lines = formatCardLines(cards, opts?.labelFn);
  const ids = opts?.themeIds?.length ? opts.themeIds : ["accelerate", "manual", "quality"];
  return {
    system:
      `Return ONLY a JSON array of 3 objects, no prose. Each: {"theme": "<one of: ${ids.join(", ")}>", "text": "<concise AI/delivery use-case idea, <=12 words>"}. Base them on the captured pains.`,
    content: lines || "No cards yet — suggest generic delivery AI use cases.",
  };
}


const SUGGEST_PROVIDER_ANGLES: Record<AIProvider, string> = {
  claude:
    "YOUR ASSIGNED ANGLE (stick to this — do not overlap the other models' angles): REPORTING & STATUS — weekly/monthly reports, PSRs, portfolio roll-ups, dashboard packs, status updates to stakeholders.",
  gpt:
    "YOUR ASSIGNED ANGLE (stick to this — do not overlap the other models' angles): BUSINESS CASES & CONTRACTS — draft business cases from briefs, SOWs, contract review/redline against standards, procurement documentation.",
  gemini:
    "YOUR ASSIGNED ANGLE (stick to this — do not overlap the other models' angles): STAGE-GATE & GOVERNANCE — gate packs, governance artefact templates, approval submissions, planning packs, checklist population.",
};

export function buildSingleSuggestPrompt(
  challengeCards: CaptureCard[],
  suggestedCards: CaptureCard[],
  categoryName: string,
  categorySuggestedCards: CaptureCard[],
  provider: AIProvider,
  labelFn?: ThemeLabelFn
): PromptPayload {
  const challengeLines = formatCardLines(challengeCards, labelFn);
  const suggestedLines = formatCardLines(suggestedCards, labelFn);
  const categoryLines = formatCardLines(categorySuggestedCards, labelFn);
  const goal = categoryName.trim() || "Uncategorised";
  const content = [
    `CATEGORY GOAL: "${goal}"`,
    "Suggest AI use cases that specifically serve the goal of this category. Interpret what the category name is asking for and return use cases that directly advance it.",
    "",
    "CAPTURED PAIN POINTS & CHALLENGES (categories, data sources, impacts):",
    challengeLines || "(none captured yet)",
    "",
    "AI USE CASES ALREADY ON THE BOARD (any category) — do NOT repeat or closely paraphrase:",
    suggestedLines || "(none yet)",
    "",
    `AI USE CASES ALREADY UNDER THIS CATEGORY ("${goal}") — do NOT repeat or closely paraphrase:`,
    categoryLines || "(none yet)",
  ].join("\n");
  const angle = SUGGEST_PROVIDER_ANGLES[provider];
  return {
    system:
      "You help a live delivery workshop propose ONE new, practical AI use case. " +
      `The facilitator's category goal is: "${goal}". ` +
      "Suggest AI use cases that specifically serve the goal of this category — interpret what that category is asking for (built-in or custom, e.g. Reduce cost, Improve compliance, Accelerate delivery) and return use cases that directly advance it. " +
      angle + " " +
      'Return ONLY JSON, no prose: {"text":"<concise task-level use case>","justification":"<one short line why this advances the category goal>"}. ' +
      "TASK-LEVEL FRAMING (required): Name a concrete recurring task the team does and the artefact it produces. " +
      "Spread across delivery work: reporting, business cases, contracts/docs, stage-gate packs, planning — NOT three variants of the same task. " +
      "GOOD: automate weekly reporting, draft business cases, review/redline contracts, generate stage-gate packs, populate templates, first-draft governance artefacts. " +
      "AVOID as default: meeting/transcript summarisation, action-item extraction, 'summarise meetings' — only if pains explicitly centre on that and nothing better fits your assigned angle. " +
      "BAD: predictive risk scoring, anomaly detection, real-time insight engine, vague capability statements. " +
      "Rules: (1) Build on gaps in the captured pains. " +
      "(2) Must be clearly distinct from every item already on the board and under this category. " +
      "(3) Reference specific pains, data sources, or impacts where possible. " +
      "(4) Propose a DISTINCT angle within your assignment — not the most obvious generic answer. " +
      "(5) One idea only. text <= 18 words; justification <= 20 words.",
    content,
  };
}

export function buildClassifyPrompt(
  input: string,
  opts: { dataPoints: string[]; impacts: string[]; themeIds: string[] }
): PromptPayload {
  const dps = opts.dataPoints.filter((d) => d !== "N/A");
  return {
    system:
      "You structure workshop capture cards. Return ONLY JSON, no prose: " +
      '{"description":"<expand the input into 1–2 clear sentences>","dataPoint":"<one of the listed data sources or N/A>","impact":{"types":["<one or more from the listed impact types>"],"hours":<number, only if Time / effort is selected>,"severity":"<one of Low, Medium, High, Critical>"},"theme":"<best-fit category id>"}. ' +
      "Pick the closest existing options. Use N/A for dataPoint if none applies. " +
      "For impact.types pick all that genuinely apply (usually 1–2). Estimate severity from the described pain. " +
      "Include hours only when Time / effort is among types. types may be an empty array; omit severity if unclear. " +
      `Data sources: ${[...dps, "N/A"].join(", ")}. ` +
      `Impact types: ${opts.impacts.join(", ")}. ` +
      `Severity options: Low, Medium, High, Critical. ` +
      `Category ids: ${opts.themeIds.join(", ")}.`,
    content: input.trim(),
  };
}

export function buildToolingResearchPrompt(tool: ToolResearchInput): PromptPayload {
  const content =
    `Research the enterprise tool "${tool.name}" (${tool.cat}, ${tool.scope} scope). Used for: ${tool.use}.` +
    (tool.pain ? ` Known pain: ${tool.pain}.` : "") +
    " Focus on current AI features, MCP/API integration support, pricing/licensing, and recent roadmap or product changes. Prefer official vendor documentation and pricing pages.";
  return { system: RESEARCH_SYSTEM, content };
}

export function buildAskPrompt(
  question: string,
  context: string | null,
  messages: AskMessage[] = []
): PromptPayload {
  const recent = messages.slice(-6);
  const parts: string[] = [];
  if (recent.length) {
    parts.push("Previous conversation:");
    for (const m of recent) {
      parts.push(`${m.role === "user" ? "User" : "Assistant"}: ${m.content}`);
    }
    parts.push("");
  }
  parts.push(`Current question: ${question}`);
  if (context?.trim()) {
    parts.push("");
    parts.push("Context from the app:");
    parts.push(context.trim());
  }
  return { system: ASK_SYSTEM, content: parts.join("\n") };
}
