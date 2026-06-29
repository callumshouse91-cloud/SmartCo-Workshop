import { themeLabel } from "@/components/brand";

export type PromptPayload = { system: string; content: string };

export type CaptureCard = { id: string; text: string; theme?: string | null };

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

function formatCardLines(cards: CaptureCard[], labelFn: ThemeLabelFn = themeLabel): string {
  return cards.map((c) => `[${labelFn(c.theme)}] ${c.text}`).join("\n");
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
  const list = cards.map((c) => ({ id: c.id, text: c.text, theme: c.theme ?? "uncategorised" }));
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
