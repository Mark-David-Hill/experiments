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

/** Color keys for random area / spirit types */
export const CARD_COLOR_KEYS = Object.keys(CARD_COLORS)

/** Display names for area innate color (nature spirit theme) */
export const AREA_COLOR_LABELS = {
  black: 'Shadow',
  white: 'Wind',
  red: 'Flame',
  darkBlue: 'Water',
  gold: 'Earth',
  violet: 'Twilight',
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

// One pool of nature spirits — shuffled and dealt into center decks at game start. When three align, yōkai may cross.
// Color = spirit type: red=flame, darkBlue=water, gold=earth/harvest, violet=twilight, black=shadow, white=wind
export const CENTER_CARD_POOL = [
  { id: 'center-ember', name: 'Ember', cost: 0, color: 'red' },
  { id: 'center-ripple', name: 'Ripple', cost: 0, color: 'darkBlue' },
  { id: 'center-grain', name: 'Grain', cost: 0, color: 'gold' },
  { id: 'center-dusk', name: 'Dusk', cost: 0, color: 'violet' },
  { id: 'center-shadow', name: 'Shadow', cost: 0, color: 'black' },
  { id: 'center-mist', name: 'Mist', cost: 0, color: 'white' },
  { id: 'center-breeze', name: 'Breeze', cost: 0, color: 'white' },
  { id: 'center-veil', name: 'Veil', cost: 0, color: 'violet' },
  { id: 'center-cinder', name: 'Cinder', cost: 0, color: 'red' },
  { id: 'center-stream', name: 'Stream', cost: 0, color: 'darkBlue' },
  { id: 'center-amber', name: 'Amber', cost: 0, color: 'gold' },
  { id: 'center-void', name: 'Void', cost: 0, color: 'black' },
  { id: 'center-umbra', name: 'Umbra', cost: 0, color: 'black' },
  { id: 'center-harvest', name: 'Harvest', cost: 0, color: 'gold' },
  { id: 'center-frost', name: 'Frost', cost: 0, color: 'white' },
  { id: 'center-twilight', name: 'Twilight', cost: 0, color: 'violet' },
  { id: 'center-blaze', name: 'Blaze', cost: 0, color: 'red' },
  { id: 'center-wave', name: 'Wave', cost: 0, color: 'darkBlue' },
  { id: 'center-spark', name: 'Spark', cost: 0, color: 'red' },
  { id: 'center-tide', name: 'Tide', cost: 0, color: 'darkBlue' },
  { id: 'center-honey', name: 'Honey', cost: 0, color: 'gold' },
  { id: 'center-gloom', name: 'Gloom', cost: 0, color: 'violet' },
  { id: 'center-night', name: 'Night', cost: 0, color: 'black' },
  { id: 'center-drift', name: 'Drift', cost: 0, color: 'white' },
  { id: 'center-cloud', name: 'Cloud', cost: 0, color: 'white' },
  { id: 'center-rain', name: 'Rain', cost: 0, color: 'darkBlue' },
  { id: 'center-sun', name: 'Sun', cost: 0, color: 'gold' },
  { id: 'center-shade', name: 'Shade', cost: 0, color: 'violet' },
  { id: 'center-flame', name: 'Flame', cost: 0, color: 'red' },
  { id: 'center-ore', name: 'Ore', cost: 0, color: 'black' },
]

/** Number of cards dealt to each center deck from the pool at game start */
export const CENTER_CARDS_PER_DECK = 6

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
