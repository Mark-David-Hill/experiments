// Region-specific decks for each travel map. When you enter a travel map,
// cards are drawn from that region's deck and laid out on the top row.
import { CARD_TYPES } from './cardTypes'

// Card shape: { id, name, type }
// IDs must be unique across all decks for lookup when cards are in hand.

const forestDeck = [
  { id: 'forest-torch', name: 'Torch', type: CARD_TYPES.ITEM },
  { id: 'forest-rope', name: 'Rope', type: CARD_TYPES.ITEM },
  { id: 'forest-scout', name: 'Scout', type: CARD_TYPES.CHARACTER },
  { id: 'forest-guide', name: 'Guide', type: CARD_TYPES.CHARACTER },
  { id: 'forest-strength', name: 'Strength', type: CARD_TYPES.ATTRIBUTE },
  { id: 'forest-compass', name: 'Compass', type: CARD_TYPES.ITEM },
  { id: 'forest-herb', name: 'Healing Herb', type: CARD_TYPES.ITEM },
  { id: 'forest-owl', name: 'Owl', type: CARD_TYPES.CHARACTER },
  { id: 'forest-courage', name: 'Courage', type: CARD_TYPES.ATTRIBUTE },
  { id: 'forest-axe', name: 'Axe', type: CARD_TYPES.ITEM },
]

const mountainDeck = [
  { id: 'mountain-pick', name: 'Pick', type: CARD_TYPES.ITEM },
  { id: 'mountain-rope', name: 'Rope', type: CARD_TYPES.ITEM },
  { id: 'mountain-guide', name: 'Guide', type: CARD_TYPES.CHARACTER },
  { id: 'mountain-endurance', name: 'Endurance', type: CARD_TYPES.ATTRIBUTE },
  { id: 'mountain-lantern', name: 'Lantern', type: CARD_TYPES.ITEM },
  { id: 'mountain-scout', name: 'Scout', type: CARD_TYPES.CHARACTER },
  { id: 'mountain-cloak', name: 'Warm Cloak', type: CARD_TYPES.ITEM },
  { id: 'mountain-eagle', name: 'Eagle', type: CARD_TYPES.CHARACTER },
  { id: 'mountain-focus', name: 'Focus', type: CARD_TYPES.ATTRIBUTE },
  { id: 'mountain-crampon', name: 'Crampon', type: CARD_TYPES.ITEM },
]

const desertDeck = [
  { id: 'desert-canteen', name: 'Canteen', type: CARD_TYPES.ITEM },
  { id: 'desert-compass', name: 'Compass', type: CARD_TYPES.ITEM },
  { id: 'desert-guide', name: 'Guide', type: CARD_TYPES.CHARACTER },
  { id: 'desert-resolve', name: 'Resolve', type: CARD_TYPES.ATTRIBUTE },
  { id: 'desert-tent', name: 'Tent', type: CARD_TYPES.ITEM },
  { id: 'desert-scout', name: 'Scout', type: CARD_TYPES.CHARACTER },
  { id: 'desert-scarf', name: 'Scarf', type: CARD_TYPES.ITEM },
  { id: 'desert-camel', name: 'Camel', type: CARD_TYPES.CHARACTER },
  { id: 'desert-patience', name: 'Patience', type: CARD_TYPES.ATTRIBUTE },
  { id: 'desert-map', name: 'Map', type: CARD_TYPES.ITEM },
]

const riverDeck = [
  { id: 'river-paddle', name: 'Paddle', type: CARD_TYPES.ITEM },
  { id: 'river-net', name: 'Net', type: CARD_TYPES.ITEM },
  { id: 'river-ferryman', name: 'Ferryman', type: CARD_TYPES.CHARACTER },
  { id: 'river-balance', name: 'Balance', type: CARD_TYPES.ATTRIBUTE },
  { id: 'river-hook', name: 'Hook', type: CARD_TYPES.ITEM },
  { id: 'river-scout', name: 'Scout', type: CARD_TYPES.CHARACTER },
  { id: 'river-float', name: 'Float', type: CARD_TYPES.ITEM },
  { id: 'river-heron', name: 'Heron', type: CARD_TYPES.CHARACTER },
  { id: 'river-adapt', name: 'Adaptability', type: CARD_TYPES.ATTRIBUTE },
  { id: 'river-line', name: 'Line', type: CARD_TYPES.ITEM },
]

/** Decks keyed by travel map pathId (must match keys in travelMaps.js) */
export const regionDecks = {
  'a-b': forestDeck,
  'a-d': mountainDeck,
  'b-c-e': desertDeck,
  'b-d-e': riverDeck,
}

/** Get the deck for a path, or empty array if none */
export function getDeckForPath(pathId) {
  return regionDecks[pathId] ?? []
}

/** All region cards flattened, for looking up a card by id (e.g. when in hand) */
const allRegionCards = Object.values(regionDecks).flat()

export { allRegionCards }
