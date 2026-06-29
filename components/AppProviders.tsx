"use client";
import React from "react";
import { AskProvider } from "@/components/AskContext";
import { AskPanel } from "@/components/AskPanel";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AskProvider>
      {children}
      <AskPanel />
    </AskProvider>
  );
}
