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

// Three center decks — nature spirits drawn to the threshold. When three align, yōkai may cross.
// Color = spirit type: red=flame, darkBlue=water, gold=earth/harvest, violet=twilight, black=shadow, white=wind
export const CENTER_DECK_DEFS = [
  [
    { id: 'c1-a', name: 'Ember', cost: 0, color: 'red' },
    { id: 'c1-b', name: 'Ripple', cost: 0, color: 'darkBlue' },
    { id: 'c1-c', name: 'Grain', cost: 0, color: 'gold' },
    { id: 'c1-d', name: 'Dusk', cost: 0, color: 'violet' },
    { id: 'c1-e', name: 'Shadow', cost: 0, color: 'black' },
  ],
  [
    { id: 'c2-a', name: 'Breeze', cost: 0, color: 'white' },
    { id: 'c2-b', name: 'Veil', cost: 0, color: 'violet' },
    { id: 'c2-c', name: 'Cinder', cost: 0, color: 'red' },
    { id: 'c2-d', name: 'Stream', cost: 0, color: 'darkBlue' },
    { id: 'c2-e', name: 'Amber', cost: 0, color: 'gold' },
  ],
  [
    { id: 'c3-a', name: 'Umbra', cost: 0, color: 'black' },
    { id: 'c3-b', name: 'Harvest', cost: 0, color: 'gold' },
    { id: 'c3-c', name: 'Frost', cost: 0, color: 'white' },
    { id: 'c3-d', name: 'Twilight', cost: 0, color: 'violet' },
    { id: 'c3-e', name: 'Blaze', cost: 0, color: 'red' },
  ],
]

export const CENTER_DECK_LABELS = ['Left', 'Center', 'Right']

// Liminal deck — draw only when the top card of each center column is the same color (3 in a row).
// Spirit/youkai themed; causes fantastical interactions with regular cards.
// ability: 'discard_center' = play during draw phase to discard any 1 card in the center row
export const LIMINAL_DECK_DEFS = [
  { id: 'lim-kitsune', name: 'Kitsune', cost: 0, color: 'gold', ability: 'discard_center', abilityText: 'Discard 1 card from center' },
  { id: 'lim-tengu', name: 'Tengu', cost: 0, color: 'black' },
  { id: 'lim-kappa', name: 'Kappa', cost: 0, color: 'darkBlue' },
  { id: 'lim-yuki', name: 'Yuki-onna', cost: 0, color: 'white' },
  { id: 'lim-nue', name: 'Nue', cost: 0, color: 'violet' },
  { id: 'lim-oni', name: 'Oni', cost: 0, color: 'red' },
  { id: 'lim-nurari', name: 'Nurarihyon', cost: 0, color: 'black' },
  { id: 'lim-bake', name: 'Bake-danuki', cost: 0, color: 'gold' },
  { id: 'lim-rokuro', name: 'Rokurokubi', cost: 0, color: 'violet' },
  { id: 'lim-mizuki', name: 'Mizuki', cost: 0, color: 'darkBlue' },
]

/** Create a copy of a card with a unique instance id (for deck/hand tracking) */
export function createCardInstance(card, instanceId) {
  return { ...card, instanceId: instanceId ?? `${card.id}-${Math.random().toString(36).slice(2, 9)}` }
}
