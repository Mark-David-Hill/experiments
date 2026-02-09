// Card definitions for deck-building prototype
// { id, name, cost } — cost is used to acquire from market

export const STARTER_CARDS = [
  { id: 'strike', name: 'Strike', cost: 0 },
  { id: 'strike-2', name: 'Strike', cost: 0 },
  { id: 'strike-3', name: 'Strike', cost: 0 },
  { id: 'defend', name: 'Defend', cost: 0 },
  { id: 'defend-2', name: 'Defend', cost: 0 },
]

export const MARKET_CARDS = [
  { id: 'slash', name: 'Slash', cost: 1 },
  { id: 'block', name: 'Block', cost: 1 },
  { id: 'draw-card', name: 'Draw', cost: 2 },
  { id: 'heal', name: 'Heal', cost: 2 },
  { id: 'power-strike', name: 'Power Strike', cost: 3 },
]

/** Create a copy of a card with a unique instance id (for deck/hand tracking) */
export function createCardInstance(card, instanceId) {
  return { ...card, instanceId: instanceId ?? `${card.id}-${Math.random().toString(36).slice(2, 9)}` }
}
