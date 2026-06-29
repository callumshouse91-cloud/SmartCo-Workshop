export const LOGGED_QUESTIONS_SESSION_ID = "logged-questions";
export const LOGGED_QUESTIONS_STORE_KEY = "smartco-logged-questions";

export type LoggedQuestionStatus = "open" | "answered";
export type LoggedQuestionSource = "agent" | "manual";

export type LoggedQuestion = {
  id: string;
  text: string;
  status: LoggedQuestionStatus;
  note?: string;
  source: LoggedQuestionSource;
  createdAt: number;
};

export type LoggedQuestionsPayload = {
  questions: LoggedQuestion[];
};

let qid = 0;
export const newQuestionId = () => `q${Date.now()}-${++qid}`;

function normalizeOne(raw: unknown): LoggedQuestion | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const text = typeof o.text === "string" ? o.text.trim() : "";
  if (!text) return null;
  const status: LoggedQuestionStatus = o.status === "answered" ? "answered" : "open";
  const source: LoggedQuestionSource = o.source === "agent" ? "agent" : "manual";
  const createdAt = typeof o.createdAt === "number" && Number.isFinite(o.createdAt) ? o.createdAt : Date.now();
  const id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : newQuestionId();
  const note = typeof o.note === "string" && o.note.trim() ? o.note.trim() : undefined;
  return { id, text, status, source, createdAt, note };
}

export function normalizeLoggedQuestions(data: unknown): LoggedQuestion[] {
  let raw: unknown[] = [];
  if (Array.isArray(data)) {
    raw = data;
  } else if (data && typeof data === "object" && Array.isArray((data as LoggedQuestionsPayload).questions)) {
    raw = (data as LoggedQuestionsPayload).questions;
  }
  return raw.map(normalizeOne).filter((q): q is LoggedQuestion => q !== null);
}

export function questionsToMarkdown(questions: LoggedQuestion[]): string {
  const sorted = [...questions].sort((a, b) => b.createdAt - a.createdAt);
  if (!sorted.length) return "# Logged questions\n\n_No questions yet._";
  const lines = sorted.map((q) => {
    const status = q.status === "answered" ? "Answered" : "Open";
    const src = q.source === "agent" ? "agent" : "manual";
    const when = new Date(q.createdAt).toLocaleString();
    let line = `- **${q.text}** — _${status}_ (${src}, ${when})`;
    if (q.note?.trim()) line += `\n  - Note: ${q.note.trim()}`;
    return line;
  });
  return `# Logged questions\n\n${lines.join("\n")}`;
}
