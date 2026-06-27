# SmartCo × MUFG — Workshop Capture

Single-operator workshop app: an animated SmartCo × MUFG deck that flows into a live capture board (draggable use-case boxes, AI-mapped linkages, live LLM review, takeaway pack), plus a tooling-landscape page based on Nikolay's stack. Built in Next.js for Vercel.

## Run locally
```bash
npm install
cp .env.example .env.local        # add your ANTHROPIC_API_KEY
npm run dev                        # http://localhost:3000
```
Capture and save work offline. Only the AI calls and the Anthropic-powered features need a connection.

## Deploy (Cursor → GitHub → Vercel)
1. Open this folder in Cursor, commit, push to a new GitHub repo.
2. In Vercel, **New Project → import the repo**.
3. **Settings → Environment Variables**: add `ANTHROPIC_API_KEY` (your real key). This stays server-side in `app/api/ai/route.ts` — never the client.
4. Deploy. Your live URL is the one to put on the projector.

> If your account uses a different model string, change `"claude-sonnet-4-6"` in `app/api/ai/route.ts`.

## Saving (Supabase backend + offline safety net)
Sessions persist to **Supabase Postgres**, with `localStorage` as an instant, offline fallback.

Set up once:
1. Create a Supabase project (pick an **EU/UK region** for bank-facing work).
2. In **SQL Editor**, run `supabase/schema.sql` (creates the `sessions` table, RLS on).
3. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` and to Vercel env vars.

How it behaves: every change writes to `localStorage` immediately (works with no wifi) and pushes to Supabase ~0.6s later. On load it restores from Supabase first (so the session follows you across devices), falling back to local. The service-role key stays server-side in `app/api/session/route.ts`. One row per workshop, keyed by `WORKSHOP_ID` in `components/WorkshopBoard.tsx` — change it per session. The takeaway pack still exports JSON as a third copy.

Without the Supabase env vars set, the app simply runs on `localStorage` alone — nothing breaks.

## Drop-in assets
- **Logos** — replace `public/logos/smartco.svg` and `public/logos/mufg.svg` with official files (same names, no code change). Add them in Cursor and push — Vercel has no upload UI; assets live in the repo.
- **The deck (Monday)** — see `public/deck/README.txt`. Export slides to PNG, drop them in `public/deck`, and set the `DECK` array in `components/deck.ts` to image slides. The intro then plays the real deck into the board.

## Pages
- `/` — intro deck → capture board
- `/tooling` — current tooling landscape (edit the `TOOLS` list against Nikolay's returned questionnaire)

## Notes
- The tool list and three themes are seeded from the engagement so far — confirm against Nikolay's answers.
- Keep Post-it notes in your pocket as the room fallback.
