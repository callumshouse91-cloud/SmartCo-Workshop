"use client";
import React from "react";
import { AskProvider } from "@/components/AskContext";
import { AskPanel } from "@/components/AskPanel";
import { LoggedQuestionsProvider } from "@/components/LoggedQuestionsProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <LoggedQuestionsProvider>
      <AskProvider>
        {children}
        <AskPanel />
      </AskProvider>
    </LoggedQuestionsProvider>
  );
}
