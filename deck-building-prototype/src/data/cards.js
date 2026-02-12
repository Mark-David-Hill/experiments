// Card definitions: { id, name (number string), cost, color }
// color is a key in CARD_COLORS (background); text is light or dark for contrast

export const CARD_COLORS = {
  black: '#1a1a1a',
  white: '#f0f0f0',
  red: '#b33030',
  darkBlue: '#1e3a5f',
  gold: '#c9a227',
  violet: '#5a2d82',
}

/** Use dark text for these backgrounds so it's readable */
const LIGHT_BG = new Set(['white', 'gold'])

export function getCardTextColor(colorKey) {
  return LIGHT_BG.has(colorKey) ? '#1a1a1a' : '#f0f0f0'
}

// Need more than HAND_SIZE (5) so there are cards left to draw when pushing from center columns
export const STARTER_CARDS = [
  { id: 's1', name: '1', cost: 0, color: 'black' },
  { id: 's2', name: '2', cost: 0, color: 'white' },
  { id: 's3', name: '3', cost: 0, color: 'red' },
  { id: 's4', name: '4', cost: 0, color: 'darkBlue' },
  { id: 's5', name: '5', cost: 0, color: 'gold' },
  { id: 's6', name: '6', cost: 0, color: 'violet' },
  { id: 's7', name: '7', cost: 0, color: 'black' },
  { id: 's8', name: '8', cost: 0, color: 'red' },
]

export const MARKET_CARDS = [
  { id: 'm1', name: '9', cost: 1, color: 'darkBlue' },
  { id: 'm2', name: '10', cost: 1, color: 'gold' },
  { id: 'm3', name: '11', cost: 2, color: 'violet' },
  { id: 'm4', name: '12', cost: 2, color: 'white' },
  { id: 'm5', name: '13', cost: 3, color: 'red' },
]

// Three center decks — one card is drawn from each at start of turn; player can push to draw more.
export const CENTER_DECK_DEFS = [
  [
    { id: 'c1-a', name: '14', cost: 0, color: 'red' },
    { id: 'c1-b', name: '15', cost: 0, color: 'darkBlue' },
    { id: 'c1-c', name: '16', cost: 0, color: 'gold' },
    { id: 'c1-d', name: '17', cost: 0, color: 'violet' },
    { id: 'c1-e', name: '18', cost: 0, color: 'black' },
  ],
  [
    { id: 'c2-a', name: '19', cost: 0, color: 'white' },
    { id: 'c2-b', name: '20', cost: 0, color: 'violet' },
    { id: 'c2-c', name: '21', cost: 0, color: 'red' },
    { id: 'c2-d', name: '22', cost: 0, color: 'darkBlue' },
    { id: 'c2-e', name: '23', cost: 0, color: 'gold' },
  ],
  [
    { id: 'c3-a', name: '24', cost: 0, color: 'black' },
    { id: 'c3-b', name: '25', cost: 0, color: 'gold' },
    { id: 'c3-c', name: '26', cost: 0, color: 'white' },
    { id: 'c3-d', name: '27', cost: 0, color: 'violet' },
    { id: 'c3-e', name: '28', cost: 0, color: 'red' },
  ],
]

export const CENTER_DECK_LABELS = ['Left', 'Center', 'Right']

/** Create a copy of a card with a unique instance id (for deck/hand tracking) */
export function createCardInstance(card, instanceId) {
  return { ...card, instanceId: instanceId ?? `${card.id}-${Math.random().toString(36).slice(2, 9)}` }
}
