"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  LOGGED_QUESTIONS_SESSION_ID,
  LOGGED_QUESTIONS_STORE_KEY,
  type LoggedQuestion,
  type LoggedQuestionSource,
  newQuestionId,
  normalizeLoggedQuestions,
} from "@/lib/loggedQuestions";

type LoggedQuestionsContextValue = {
  questions: LoggedQuestion[];
  openCount: number;
  ready: boolean;
  addQuestion: (text: string, source: LoggedQuestionSource) => boolean;
  updateQuestion: (id: string, patch: Partial<Pick<LoggedQuestion, "text" | "status" | "note">>) => void;
  deleteQuestion: (id: string) => void;
};

const LoggedQuestionsContext = createContext<LoggedQuestionsContextValue | null>(null);

export function LoggedQuestionsProvider({ children }: { children: React.ReactNode }) {
  const [questions, setQuestions] = useState<LoggedQuestion[]>([]);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    (async () => {
      let restored = false;
      try {
        const res = await fetch(`/api/session?id=${LOGGED_QUESTIONS_SESSION_ID}`);
        const json = await res.json();
        if (json?.data != null) {
          setQuestions(normalizeLoggedQuestions(json.data));
          restored = true;
        }
      } catch {}
      if (!restored) {
        try {
          const raw = localStorage.getItem(LOGGED_QUESTIONS_STORE_KEY);
          if (raw) setQuestions(normalizeLoggedQuestions(JSON.parse(raw)));
        } catch {}
      }
      loaded.current = true;
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    const payload = { questions };
    try { localStorage.setItem(LOGGED_QUESTIONS_STORE_KEY, JSON.stringify(payload)); } catch {}
    const t = setTimeout(() => {
      fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: LOGGED_QUESTIONS_SESSION_ID, data: payload }),
      }).catch(() => {});
    }, 500);
    return () => clearTimeout(t);
  }, [questions]);

  const addQuestion = useCallback((text: string, source: LoggedQuestionSource) => {
    const trimmed = text.trim();
    if (!trimmed) return false;
    setQuestions((prev) => [
      { id: newQuestionId(), text: trimmed, status: "open", source, createdAt: Date.now() },
      ...prev,
    ]);
    return true;
  }, []);

  const updateQuestion = useCallback((id: string, patch: Partial<Pick<LoggedQuestion, "text" | "status" | "note">>) => {
    setQuestions((prev) => prev.map((q) => {
      if (q.id !== id) return q;
      const next = { ...q };
      if (patch.text !== undefined) {
        const t = patch.text.trim();
        if (!t) return q;
        next.text = t;
      }
      if (patch.status !== undefined) next.status = patch.status;
      if (patch.note !== undefined) next.note = patch.note.trim() || undefined;
      return next;
    }));
  }, []);

  const deleteQuestion = useCallback((id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }, []);

  const openCount = useMemo(() => questions.filter((q) => q.status === "open").length, [questions]);

  const value = useMemo(
    () => ({ questions, openCount, ready, addQuestion, updateQuestion, deleteQuestion }),
    [questions, openCount, ready, addQuestion, updateQuestion, deleteQuestion],
  );

  return (
    <LoggedQuestionsContext.Provider value={value}>
      {children}
    </LoggedQuestionsContext.Provider>
  );
}

export function useLoggedQuestions() {
  const ctx = useContext(LoggedQuestionsContext);
  if (!ctx) throw new Error("useLoggedQuestions must be used within LoggedQuestionsProvider");
  return ctx;
}
