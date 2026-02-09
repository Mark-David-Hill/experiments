# Deck-building prototype

A minimal prototype for testing moment-to-moment deck-building gameplay.

## Run

```bash
npm install
npm run dev
```

## What’s in it

- **Deck / hand / discard** — Start with a small starter deck. Draw a hand of 5. Play cards into a “played this turn” area.
- **End turn** — Hand and played cards go to discard; draw a new hand of 5 (reshuffle discard into deck when needed).
- **Market** — Acquire cards from the market; they’re added to your discard and will appear after the next reshuffle.
- **Energy** — Shown in the header (for future use; playing cards could cost energy).

Extend `src/data/cards.js` for new cards and tweak `src/App.jsx` for rules and UI.
