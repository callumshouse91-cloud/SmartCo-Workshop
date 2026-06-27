import { THEMES } from "./brand";

export type Slide = {
  image?: string; // e.g. "/deck/slide-1.png" — when set, the slide shows this image full-bleed
  eyebrow?: string;
  title?: string;
  body?: string;
  chips?: { id: string; label: string; color: string }[];
  cta?: string; // text on the final "enter board" button (put on the LAST slide only)
};

/*
  HOW TO INSERT SHEELPA'S DECK (Monday):
  1. Export each slide to PNG/JPG and drop into /public/deck (slide-1.png, slide-2.png, …).
  2. Replace the DECK array below with image slides, e.g.:
       export const DECK: Slide[] = [
         { image: "/deck/slide-1.png" },
         { image: "/deck/slide-2.png" },
         { image: "/deck/slide-3.png", cta: "Enter workshop board" },
       ];
  The last slide should carry `cta` so the "enter board" button appears.
  Until then, the built-in animated intro below is used.
*/
export const DECK: Slide[] = [
  {
    eyebrow: "AI & Delivery Workshop",
    title: "SmartCo × MUFG",
    body: "A working session to find where AI takes real work off your delivery teams — and what it could look like.",
  },
  {
    eyebrow: "Who we are",
    title: "Delivery, engineered with AI",
    body: "We build governance-grade AI into how programmes are run — the intent of your existing methodology, delivered at speed.",
  },
  {
    eyebrow: "Today",
    title: "Three things we want to map",
    body: "Where delivery is slow, where the manual effort sits, and where confidence in delivery breaks down. Your pains, in your words.",
    chips: THEMES,
  },
  {
    eyebrow: "How the day runs",
    title: "Diagnose now, play back next",
    body: "Today we capture and cluster live. Next session we bring it back as prioritised use cases — and show you the real thing.",
    cta: "Enter workshop board",
  },
];
