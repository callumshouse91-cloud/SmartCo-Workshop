"use client";
import Link from "next/link";
import { C } from "@/components/brand";
import { useLoggedQuestions } from "@/components/LoggedQuestionsProvider";

const navLink: React.CSSProperties = {
  color: C.navy,
  textDecoration: "none",
  border: `1px solid ${C.border}`,
  padding: "9px 16px",
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 13,
  background: C.white,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

export function QuestionsNavLink({ style }: { style?: React.CSSProperties }) {
  const { openCount } = useLoggedQuestions();
  return (
    <Link href="/questions" style={{ ...navLink, ...style }}>
      Questions
      {openCount > 0 && (
        <span
          style={{
            minWidth: 20,
            height: 20,
            padding: "0 6px",
            borderRadius: 999,
            background: C.coral,
            color: C.white,
            fontSize: 11,
            fontWeight: 800,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
          }}
          aria-label={`${openCount} open questions`}
        >
          {openCount}
        </span>
      )}
    </Link>
  );
}
