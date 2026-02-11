// Card definitions for deck-building prototype
// { id, name, cost } — cost is used to acquire from market

// Need more than HAND_SIZE (5) so there are cards left to draw when pushing from center columns
export const STARTER_CARDS = [
  { id: 'strike', name: 'Strike', cost: 0 },
  { id: 'strike-2', name: 'Strike', cost: 0 },
  { id: 'strike-3', name: 'Strike', cost: 0 },
  { id: 'strike-4', name: 'Strike', cost: 0 },
  { id: 'defend', name: 'Defend', cost: 0 },
  { id: 'defend-2', name: 'Defend', cost: 0 },
  { id: 'defend-3', name: 'Defend', cost: 0 },
  { id: 'defend-4', name: 'Defend', cost: 0 },
]

export const MARKET_CARDS = [
  { id: 'slash', name: 'Slash', cost: 1 },
  { id: 'block', name: 'Block', cost: 1 },
  { id: 'draw-card', name: 'Draw', cost: 2 },
  { id: 'heal', name: 'Heal', cost: 2 },
  { id: 'power-strike', name: 'Power Strike', cost: 3 },
]

// Three center decks — one card is drawn from each at start of turn; player can push to draw more.
export const CENTER_DECK_DEFS = [
  [
    { id: 'c1-a', name: 'Bolt', cost: 0 },
    { id: 'c1-b', name: 'Spark', cost: 0 },
    { id: 'c1-c', name: 'Flare', cost: 0 },
    { id: 'c1-d', name: 'Surge', cost: 0 },
    { id: 'c1-e', name: 'Jolt', cost: 0 },
  ],
  [
    { id: 'c2-a', name: 'Shield', cost: 0 },
    { id: 'c2-b', name: 'Ward', cost: 0 },
    { id: 'c2-c', name: 'Barrier', cost: 0 },
    { id: 'c2-d', name: 'Aegis', cost: 0 },
    { id: 'c2-e', name: 'Guard', cost: 0 },
  ],
  [
    { id: 'c3-a', name: 'Draw', cost: 0 },
    { id: 'c3-b', name: 'Scry', cost: 0 },
    { id: 'c3-c', name: 'Peek', cost: 0 },
    { id: 'c3-d', name: 'Focus', cost: 0 },
    { id: 'c3-e', name: 'Rest', cost: 0 },
  ],
]

export const CENTER_DECK_LABELS = ['Left', 'Center', 'Right']

/** Create a copy of a card with a unique instance id (for deck/hand tracking) */
export function createCardInstance(card, instanceId) {
  return { ...card, instanceId: instanceId ?? `${card.id}-${Math.random().toString(36).slice(2, 9)}` }
}
