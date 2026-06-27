DECK INGESTION (Monday):
1. Export each slide of the deck to PNG/JPG, named slide-1.png, slide-2.png, ...
2. Drop them in this folder.
3. In components/deck.ts, replace the DECK array with image slides:
     { image: "/deck/slide-1.png" }, ...
   Put `cta: "Enter workshop board"` on the LAST slide so the enter button appears.
The intro then plays the real deck and flows straight into the capture board.
