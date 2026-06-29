"use client";
import React, { createContext, useCallback, useContext, useRef, useState } from "react";

export type AskPageContext = {
  label: string;
  getContext: () => string | null;
};

type AskContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  pageContext: AskPageContext | null;
  setPageContext: (ctx: AskPageContext | null) => void;
};

const AskContext = createContext<AskContextValue | null>(null);

export function AskProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pageContext, setPageContext] = useState<AskPageContext | null>(null);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  return (
    <AskContext.Provider value={{ open, setOpen, toggle, pageContext, setPageContext }}>
      {children}
    </AskContext.Provider>
  );
}

export function useAsk() {
  const ctx = useContext(AskContext);
  if (!ctx) throw new Error("useAsk must be used within AskProvider");
  return ctx;
}

/** Register optional page context (board cards, tooling list, etc.). */
export function useRegisterAskContext(config: { label: string; getContext: () => string | null } | null) {
  const { setPageContext } = useAsk();
  const configRef = useRef(config);
  configRef.current = config;
  React.useEffect(() => {
    if (!config) {
      setPageContext(null);
      return;
    }
    setPageContext({
      label: config.label,
      getContext: () => configRef.current?.getContext() ?? null,
    });
    return () => setPageContext(null);
  }, [config?.label, setPageContext]);
}
