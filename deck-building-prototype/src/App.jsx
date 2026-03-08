import { useState, useCallback } from 'react'
import {
  STARTER_CARDS,
  CENTER_CARD_POOL,
  CENTER_CARDS_PER_DECK,
  LIMINAL_DECK_DEFS,
  CARD_COLORS,
  CARD_COLOR_KEYS,
  AREA_COLOR_LABELS,
  getCardTextColor,
  createCardInstance,
} from './data/cards'
import './App.css'

const HAND_SIZE = 5
const STARTING_ENERGY = 3
const DRAW_ACTIONS_PER_TURN = 5
const MAX_CARDS_PER_COLUMN = 4

// Bonus when the yōkai drawn from Liminal matches the color of the 3 spirits used to open it.
const LIMINAL_COLOR_MATCH_BONUS = 'token' // grant 1 token of that color

function shuffle(array) {
  const a = [...array]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function drawFromPlayerPile(deck, discard, count) {
  let source = [...deck]
  let newDiscard = [...discard]
  if (source.length < count && newDiscard.length > 0) {
    source = shuffle([...source, ...newDiscard])
    newDiscard = []
  }
  const toDraw = Math.min(count, source.length)
  const drawn = source.slice(0, toDraw)
  const newDeck = source.slice(toDraw)
  return { drawn, newDeck, newDiscard }
}

const initialGameState = () => ({
  gameStarted: false,
  phase: 'draw',
  deck: [],
  hand: [],
  discard: [],
  played: [],
  energy: STARTING_ENERGY,
  centerDecks: [[], [], [], [], []],
  centerColumns: [[], [], [], [], []],
  liminalDeck: [],
  drawActionsRemaining: 0,
  moveSourceColumn: null, // when set, waiting to pick destination to move bottom card (costs 1 action)
  pendingDiscardCenterCard: null, // when set, waiting to pick a center card to discard (ability played in draw phase)
  handCardToPlace: null, // when set, waiting to pick a column to place this hand card at the bottom (costs 1 action)
  liminalColorMatchThisDraw: false, // true when last Liminal draw was same color as match (shows bonus message)
  areaColor: null, // innate color of current area (random at game start); match this color for bonus token
  tokens: {}, // color -> count (from Liminal color-match bonus)
  bonusModal: null, // { title, message } when set, show modal until dismissed
  playedModalOpen: false, // when true, show modal listing cards played this turn
})

const NUM_CENTER_COLUMNS = 5

/** Finds first 3/4/5-in-a-row (same color). Returns match and run length (3, 4, or 5). 4 = +1 token, 5 = +2 tokens. */
function findFirstMatch(centerColumns) {
  const cols = centerColumns || Array(NUM_CENTER_COLUMNS).fill([])
  // Horizontal: check each triple (or more) of consecutive columns
  for (let startCol = 0; startCol + 3 <= NUM_CENTER_COLUMNS; startCol++) {
    const len0 = cols[startCol]?.length ?? 0
    const len1 = cols[startCol + 1]?.length ?? 0
    const len2 = cols[startCol + 2]?.length ?? 0
    const minLenTriple = Math.min(len0, len1, len2)
    for (let d = 0; d < minLenTriple; d++) {
      const color = cols[startCol][d].color
      if (cols[startCol + 1][d].color !== color || cols[startCol + 2][d].color !== color) continue
      let runLength = 3
      if (startCol + 3 < NUM_CENTER_COLUMNS && (cols[startCol + 3]?.length ?? 0) > d && cols[startCol + 3][d].color === color) {
        runLength = 4
        if (startCol + 4 < NUM_CENTER_COLUMNS && (cols[startCol + 4]?.length ?? 0) > d && cols[startCol + 4][d].color === color) {
          runLength = 5
        }
      }
      return { type: 'horizontal', rowIndex: d, startColIndex: startCol, runLength }
    }
  }
  for (let col = 0; col < NUM_CENTER_COLUMNS; col++) {
    const colArr = cols[col] || []
    for (let start = 0; start + 3 <= colArr.length; start++) {
      const color = colArr[start].color
      if (colArr[start + 1].color !== color || colArr[start + 2].color !== color) continue
      let runLength = 3
      if (start + 3 < colArr.length && colArr[start + 3].color === color) {
        runLength = 4
        if (start + 4 < colArr.length && colArr[start + 4].color === color) runLength = 5
      }
      return { type: 'vertical', colIndex: col, startIndex: start, runLength }
    }
  }
  return null
}

function App() {
  const [state, setState] = useState(initialGameState)
  const {
    gameStarted,
    phase,
    deck,
    hand,
    discard,
    played,
    energy,
    centerDecks,
    centerColumns,
  liminalDeck,
  drawActionsRemaining,
  moveSourceColumn,
  pendingDiscardCenterCard,
  handCardToPlace,
  liminalColorMatchThisDraw,
  areaColor,
  tokens,
  bonusModal,
  playedModalOpen,
  } = state

  const liminalMatch = findFirstMatch(centerColumns)
  const liminalMatchColor = liminalMatch
    ? liminalMatch.type === 'horizontal'
      ? centerColumns[liminalMatch.startColIndex][liminalMatch.rowIndex].color
      : centerColumns[liminalMatch.colIndex][liminalMatch.startIndex].color
    : null
  const canDrawFromLiminal = liminalMatch != null && liminalMatchColor != null
  // Liminal draw never costs an action; you can draw multiple times per turn for the same color
  const liminalUnlocked = canDrawFromLiminal && liminalDeck.length > 0
  const mustDrawFromLiminal = liminalUnlocked

  const startGame = useCallback(() => {
    const playerDeck = shuffle(STARTER_CARDS.map((c) => createCardInstance(c)))
    const { drawn, newDeck } = drawFromPlayerPile(playerDeck, [], HAND_SIZE)

    const poolInstances = shuffle(
      CENTER_CARD_POOL.map((c) => createCardInstance(c))
    )
    const totalCenter = NUM_CENTER_COLUMNS * CENTER_CARDS_PER_DECK
    const dealt = poolInstances.slice(0, totalCenter)
    const centerDecksInit = []
    for (let i = 0; i < NUM_CENTER_COLUMNS; i++) {
      centerDecksInit.push(
        dealt.slice(i * CENTER_CARDS_PER_DECK, (i + 1) * CENTER_CARDS_PER_DECK)
      )
    }
    const newColumns = centerDecksInit.map((d) => {
      if (d.length === 0) return []
      const [card, ...rest] = d
      return [card]
    })
    const centerDecksAfterFirstDraw = centerDecksInit.map((d) =>
      d.length > 0 ? d.slice(1) : []
    )
    const liminalDeckInit = shuffle(
      LIMINAL_DECK_DEFS.map((c) => createCardInstance(c))
    )
    const areaColor =
      CARD_COLOR_KEYS[Math.floor(Math.random() * CARD_COLOR_KEYS.length)]

    setState((s) => ({
      ...s,
      gameStarted: true,
      areaColor,
      phase: 'draw',
      deck: newDeck,
      hand: drawn,
      discard: [],
      played: [],
      energy: STARTING_ENERGY,
      centerDecks: centerDecksAfterFirstDraw,
      centerColumns: newColumns,
      liminalDeck: liminalDeckInit,
      drawActionsRemaining: DRAW_ACTIONS_PER_TURN,
      moveSourceColumn: null,
      pendingDiscardCenterCard: null,
      handCardToPlace: null,
      liminalColorMatchThisDraw: false,
      tokens: {},
      playedModalOpen: false,
    }))
  }, [])

  const drawFromCenter = useCallback((columnIndex) => {
    setState((s) => {
      if (s.drawActionsRemaining <= 0) return s
      const decks = s.centerDecks[columnIndex]
      if (!decks.length) return s
      const [card, ...restDeck] = decks
      const newCenterDecks = s.centerDecks.map((d, i) =>
        i === columnIndex ? restDeck : d
      )
      const col = s.centerColumns[columnIndex] || []
      let newCol = [card, ...col]
      let addedToDiscard = []
      if (newCol.length > MAX_CARDS_PER_COLUMN) {
        addedToDiscard = [newCol.pop()]
        newCol = newCol.slice(0, MAX_CARDS_PER_COLUMN)
      }
      const newCenterColumns = s.centerColumns.map((c, i) =>
        i === columnIndex ? newCol : c
      )
      return {
        ...s,
        centerDecks: newCenterDecks,
        centerColumns: newCenterColumns,
        discard: [...s.discard, ...addedToDiscard],
        drawActionsRemaining: s.drawActionsRemaining - 1,
      }
    })
  }, [])

  const drawFromLiminal = useCallback(() => {
    setState((s) => {
      if (!s.liminalDeck.length) return s
      const match = findFirstMatch(s.centerColumns)
      if (!match) return s
      const runLength = match.runLength ?? 3
      const [card, ...rest] = s.liminalDeck
      let matchingCards
      let newCenterColumns
      if (match.type === 'horizontal') {
        const d = match.rowIndex
        const startCol = match.startColIndex
        matchingCards = []
        for (let i = 0; i < runLength; i++) {
          matchingCards.push(s.centerColumns[startCol + i][d])
        }
        newCenterColumns = s.centerColumns.map((col, i) =>
          i >= startCol && i < startCol + runLength
            ? [...col.slice(0, d), ...col.slice(d + 1)]
            : col
        )
      } else {
        const { colIndex, startIndex } = match
        matchingCards = s.centerColumns[colIndex].slice(startIndex, startIndex + runLength)
        newCenterColumns = s.centerColumns.map((col, i) =>
          i === colIndex
            ? [...col.slice(0, startIndex), ...col.slice(startIndex + runLength)]
            : col
        )
      }
      const matchColor = matchingCards[0].color
      const colorMatch = matchColor === card.color
      const areaMatch = matchColor === s.areaColor
      const runBonus = runLength === 4 ? 1 : runLength === 5 ? 2 : 0

      let newTokens = { ...s.tokens }
      if (colorMatch && LIMINAL_COLOR_MATCH_BONUS === 'token') {
        newTokens = { ...newTokens, [matchColor]: (newTokens[matchColor] ?? 0) + 1 }
      }
      if (areaMatch) {
        newTokens = { ...newTokens, [matchColor]: (newTokens[matchColor] ?? 0) + 1 }
      }
      if (runBonus > 0) {
        newTokens = { ...newTokens, [matchColor]: (newTokens[matchColor] ?? 0) + runBonus }
      }

      let bonusModal = null
      const tokenParts = []
      if (colorMatch && LIMINAL_COLOR_MATCH_BONUS === 'token') tokenParts.push('yōkai matched spirits')
      if (areaMatch) tokenParts.push('match matched area')
      if (runBonus > 0) tokenParts.push(`${runLength}-in-a-row (+${runBonus})`)
      const totalTokens = (colorMatch ? 1 : 0) + (areaMatch ? 1 : 0) + runBonus
      if (totalTokens > 0) {
        bonusModal = {
          title: 'Bonus!',
          message: `${tokenParts.join(', ')} — +${totalTokens} token${totalTokens !== 1 ? 's' : ''} (${matchColor}).`,
        }
      }

      return {
        ...s,
        liminalDeck: rest,
        hand: [...s.hand, card],
        centerColumns: newCenterColumns,
        discard: [...s.discard, ...matchingCards],
        liminalColorMatchThisDraw: colorMatch || areaMatch || runBonus > 0,
        tokens: newTokens,
        bonusModal,
      }
    })
  }, [])

  const selectMoveSourceFromCard = useCallback((columnIndex) => {
    setState((s) => {
      if (s.moveSourceColumn !== null) return s
      const col = s.centerColumns[columnIndex] || []
      if (col.length === 0 || s.drawActionsRemaining <= 0) return s
      return { ...s, moveSourceColumn: columnIndex }
    })
  }, [])

  const cancelMoveCard = useCallback(() => {
    setState((s) => ({ ...s, moveSourceColumn: null }))
  }, [])

  const takeBottomCardToHand = useCallback(() => {
    setState((s) => {
      if (typeof s.moveSourceColumn !== 'number' || s.drawActionsRemaining <= 0) return s
      const colIndex = s.moveSourceColumn
      const col = s.centerColumns[colIndex] || []
      if (col.length === 0) return s
      const card = col[col.length - 1]
      const newCol = col.slice(0, -1)
      return {
        ...s,
        centerColumns: s.centerColumns.map((c, i) => (i === colIndex ? newCol : c)),
        hand: [...s.hand, card],
        drawActionsRemaining: s.drawActionsRemaining - 1,
        moveSourceColumn: null,
      }
    })
  }, [])

  const selectMoveSourceOrDest = useCallback((columnIndex) => {
    setState((s) => {
      if (typeof s.moveSourceColumn === 'number') {
        if (s.moveSourceColumn === columnIndex) {
          return { ...s, moveSourceColumn: null }
        }
        const src = s.moveSourceColumn
        const srcCol = s.centerColumns[src] || []
        if (srcCol.length === 0 || s.drawActionsRemaining <= 0) return s
        const card = srcCol[srcCol.length - 1]
        const newSourceCol = srcCol.slice(0, -1)
        const destCol = s.centerColumns[columnIndex] || []
        let newDestCol = [...destCol, card]
        let addedToDiscard = []
        if (newDestCol.length > MAX_CARDS_PER_COLUMN) {
          addedToDiscard = [newDestCol.pop()]
          newDestCol = newDestCol.slice(0, MAX_CARDS_PER_COLUMN)
        }
        const newCenterColumns = s.centerColumns.map((col, i) =>
          i === src ? newSourceCol : i === columnIndex ? newDestCol : col
        )
        return {
          ...s,
          centerColumns: newCenterColumns,
          discard: [...s.discard, ...addedToDiscard],
          drawActionsRemaining: s.drawActionsRemaining - 1,
          moveSourceColumn: null,
        }
      }
      return s
    })
  }, [])

  const doneDrawing = useCallback(() => {
    setState((s) => ({
      ...s,
      phase: 'play',
      moveSourceColumn: null,
      pendingDiscardCenterCard: null,
      handCardToPlace: null,
      liminalColorMatchThisDraw: false,
    }))
  }, [])

  const selectHandCardToPlace = useCallback((card) => {
    setState((s) => {
      if (s.pendingDiscardCenterCard || typeof s.moveSourceColumn === 'number') return s
      if (s.drawActionsRemaining <= 0) return s
      const match = findFirstMatch(s.centerColumns)
      const mustDraw = match != null && s.liminalDeck.length > 0
      if (mustDraw) return s
      return {
        ...s,
        handCardToPlace: s.handCardToPlace?.instanceId === card.instanceId ? null : card,
      }
    })
  }, [])

  const placeHandCardOnColumn = useCallback((columnIndex) => {
    setState((s) => {
      if (!s.handCardToPlace || s.drawActionsRemaining <= 0) return s
      const col = s.centerColumns[columnIndex] || []
      let newCol = [...col, s.handCardToPlace]
      let addedToDiscard = []
      if (newCol.length > MAX_CARDS_PER_COLUMN) {
        addedToDiscard = [newCol.pop()]
        newCol = newCol.slice(0, MAX_CARDS_PER_COLUMN)
      }
      return {
        ...s,
        centerColumns: s.centerColumns.map((c, i) => (i === columnIndex ? newCol : c)),
        hand: s.hand.filter((c) => c.instanceId !== s.handCardToPlace.instanceId),
        handCardToPlace: null,
        discard: [...s.discard, ...addedToDiscard],
        drawActionsRemaining: s.drawActionsRemaining - 1,
      }
    })
  }, [])

  const cancelPlaceHandCard = useCallback(() => {
    setState((s) => (s.handCardToPlace ? { ...s, handCardToPlace: null } : s))
  }, [])

  const dismissBonusModal = useCallback(() => {
    setState((s) => (s.bonusModal ? { ...s, bonusModal: null } : s))
  }, [])

  const openPlayedModal = useCallback(() => {
    setState((s) => ({ ...s, playedModalOpen: true }))
  }, [])

  const dismissPlayedModal = useCallback(() => {
    setState((s) => ({ ...s, playedModalOpen: false }))
  }, [])

  const playDiscardCenterAbility = useCallback((card) => {
    setState((s) => ({
      ...s,
      hand: s.hand.filter((c) => c.instanceId !== card.instanceId),
      pendingDiscardCenterCard: card,
    }))
  }, [])

  const discardCenterCard = useCallback((columnIndex, cardIndex) => {
    setState((s) => {
      if (!s.pendingDiscardCenterCard) return s
      const col = s.centerColumns[columnIndex] || []
      const card = col[cardIndex]
      if (!card) return s
      const newCenterColumns = s.centerColumns.map((c, i) =>
        i === columnIndex ? [...c.slice(0, cardIndex), ...c.slice(cardIndex + 1)] : c
      )
      return {
        ...s,
        centerColumns: newCenterColumns,
        discard: [...s.discard, card, s.pendingDiscardCenterCard],
        pendingDiscardCenterCard: null,
      }
    })
  }, [])

  const cancelDiscardCenterTarget = useCallback(() => {
    setState((s) => {
      if (!s.pendingDiscardCenterCard) return s
      return {
        ...s,
        hand: [...s.hand, s.pendingDiscardCenterCard],
        pendingDiscardCenterCard: null,
      }
    })
  }, [])

  const playCard = useCallback((card) => {
    setState((s) => ({
      ...s,
      hand: s.hand.filter((c) => c.instanceId !== card.instanceId),
      played: [...s.played, card],
      energy: Math.max(0, s.energy - (card.cost ?? 0)),
    }))
  }, [])

  const endTurn = useCallback(() => {
    setState((s) => ({
      ...s,
      phase: 'draw',
      discard: [...s.discard, ...s.played],
      played: [],
      energy: STARTING_ENERGY,
      centerDecks: s.centerDecks,
      centerColumns: s.centerColumns,
      liminalDeck: s.liminalDeck,
      drawActionsRemaining: DRAW_ACTIONS_PER_TURN,
      moveSourceColumn: null,
    }))
  }, [])

  return (
    <div className="app">
      <header className="header">
        <h1>Deck-building prototype</h1>
        <div className="piles">
          {gameStarted && phase === 'draw' && (
            <span className="pile pile-actions">Actions: {drawActionsRemaining}</span>
          )}
          <span className="pile">Deck: {deck.length}</span>
          <span className="pile">Discard: {discard.length}</span>
          <span className="pile">Hand: {hand.length}</span>
          <span className="pile">Energy: {energy}</span>
          {gameStarted && areaColor && (
            <span className="pile pile-area" title="Match this color for a bonus token">
              Area:{' '}
              <span
                className="area-color-card"
                style={{
                  background: CARD_COLORS[areaColor] ?? '#555',
                  color: getCardTextColor(areaColor),
                }}
              >
                {AREA_COLOR_LABELS[areaColor] ?? areaColor}
              </span>
            </span>
          )}
          {gameStarted && Object.keys(tokens).length > 0 && (
            <span className="pile pile-tokens">
              Tokens:{' '}
              {Object.entries(tokens)
                .filter(([, n]) => n > 0)
                .map(([color, n]) => (
                  <span
                    key={color}
                    className="token-badge"
                    style={{
                      background: CARD_COLORS[color] ?? '#555',
                      color: getCardTextColor(color),
                    }}
                    title={`${color} token${n !== 1 ? 's' : ''}`}
                  >
                    {n}× {color}
                  </span>
                ))}
            </span>
          )}
        </div>
        <button type="button" className="btn btn-primary" onClick={startGame}>
          {gameStarted ? 'New game' : 'Start game'}
        </button>
      </header>

      {!gameStarted && (
        <p className="hint">
          Click &quot;Start game&quot; to draw 5 and see one card from each center deck.
        </p>
      )}

      {gameStarted && (
        <>
          <section className="center-decks">
            <h2 className={phase === 'play' ? 'center-decks-play-h2' : ''}>
              {phase === 'draw'
                ? `Center row — 1 action: draw from deck into column, move bottom card, take bottom to hand, or place card from hand to bottom (${drawActionsRemaining} actions left)`
                : 'Center row'}
            </h2>
            {phase === 'draw' && typeof moveSourceColumn === 'number' && (
              <div className="move-card-hint">
                Bottom card: move to column or take to hand (1 action each)
                <button
                  type="button"
                  className="btn"
                  onClick={takeBottomCardToHand}
                  disabled={drawActionsRemaining <= 0}
                  title={drawActionsRemaining <= 0 ? 'No actions left' : 'Take this card to your hand (1 action)'}
                >
                  Take to hand (1 action)
                </button>
                <button type="button" className="btn btn-cancel-move" onClick={cancelMoveCard}>
                  Cancel
                </button>
              </div>
            )}
            {phase === 'draw' && handCardToPlace && (
              <div className="move-card-hint">
                Click a column to place the selected card at the bottom (1 action)
                <button type="button" className="btn btn-cancel-move" onClick={cancelPlaceHandCard}>
                  Cancel
                </button>
              </div>
            )}
            <div
              className={`center-columns ${phase === 'play' ? 'center-columns-readonly' : ''}`}
            >
              {Array.from({ length: NUM_CENTER_COLUMNS }, (_, i) => i).map((i) => {
                const colFull = (centerColumns[i]?.length ?? 0) >= MAX_CARDS_PER_COLUMN
                const canPlaceOrMoveHere = phase === 'draw' && !colFull && (handCardToPlace || (typeof moveSourceColumn === 'number' && moveSourceColumn !== i && !pendingDiscardCenterCard))
                return (
                <div
                  key={i}
                  className={`center-column ${i === Math.floor(NUM_CENTER_COLUMNS / 2) ? 'center-column-middle' : ''} ${
                    phase === 'draw' && handCardToPlace && !colFull ? 'center-column-dest' : phase === 'draw' && typeof moveSourceColumn === 'number' && moveSourceColumn !== i && !pendingDiscardCenterCard && !colFull ? 'center-column-dest' : ''
                  } ${phase === 'draw' && typeof moveSourceColumn === 'number' && moveSourceColumn === i ? 'center-column-source' : ''}`}
                  onClick={
                    phase === 'draw' && handCardToPlace && !colFull
                      ? (e) => { e.stopPropagation(); placeHandCardOnColumn(i); }
                      : phase === 'draw' && !pendingDiscardCenterCard && typeof moveSourceColumn === 'number' && moveSourceColumn !== i && !colFull
                        ? () => selectMoveSourceOrDest(i)
                        : undefined
                  }
                  role={canPlaceOrMoveHere ? 'button' : undefined}
                  tabIndex={canPlaceOrMoveHere ? 0 : undefined}
                >
                  {phase === 'draw' && (
                    <button
                      type="button"
                      className="btn draw-center-btn"
                      onClick={(e) => { e.stopPropagation(); drawFromCenter(i); }}
                      disabled={!centerDecks[i]?.length || mustDrawFromLiminal || drawActionsRemaining <= 0}
                      title={mustDrawFromLiminal ? 'Draw from the Liminal deck first' : drawActionsRemaining <= 0 ? 'No actions left' : '1 action: add a card from this deck to the column'}
                    >
                      Deck ({centerDecks[i]?.length ?? 0})
                    </button>
                  )}
                  <div className="center-column-stack">
                    <div className="center-cards-column">
                      {(centerColumns[i] || []).map((card, idx) => {
                        const isBottom = idx === (centerColumns[i]?.length ?? 0) - 1
                        const canSelectAsSource =
                          phase === 'draw' &&
                          moveSourceColumn === null &&
                          !pendingDiscardCenterCard &&
                          drawActionsRemaining > 0 &&
                          !mustDrawFromLiminal &&
                          (centerColumns[i]?.length ?? 0) > 0
                        const isDiscardTarget = phase === 'draw' && !!pendingDiscardCenterCard
                        const isPlaceTarget = phase === 'draw' && !!handCardToPlace && !colFull
                        const runLength = liminalMatch?.runLength ?? 0
                        const isInMatch =
                          liminalMatch &&
                          (liminalMatch.type === 'horizontal'
                            ? i >= liminalMatch.startColIndex &&
                              i < liminalMatch.startColIndex + runLength &&
                              idx === liminalMatch.rowIndex
                            : liminalMatch.type === 'vertical' &&
                              i === liminalMatch.colIndex &&
                              idx >= liminalMatch.startIndex &&
                              idx < liminalMatch.startIndex + runLength)
                        return (
                          <div
                            key={card.instanceId}
                            className={`card center-card ${isBottom ? 'center-card-bottom' : ''} ${isBottom && canSelectAsSource ? 'center-card-moveable' : ''} ${isDiscardTarget ? 'center-card-discard-target' : ''} ${isPlaceTarget ? 'center-card-place-target' : ''} ${isInMatch ? 'center-card-in-match' : ''}`}
                            style={{
                              background: CARD_COLORS[card.color] ?? '#444',
                              color: getCardTextColor(card.color),
                            }}
                            onClick={
                              isPlaceTarget
                                ? (e) => {
                                    e.stopPropagation()
                                    placeHandCardOnColumn(i)
                                  }
                                : isDiscardTarget
                                  ? (e) => {
                                      e.stopPropagation()
                                      discardCenterCard(i, idx)
                                    }
                                  : isBottom && canSelectAsSource
                                    ? (e) => {
                                        e.stopPropagation()
                                        selectMoveSourceFromCard(i)
                                      }
                                    : undefined
                            }
                            role={isPlaceTarget || isDiscardTarget || (isBottom && canSelectAsSource) ? 'button' : undefined}
                            title={isPlaceTarget ? 'Place selected card at bottom of this column (1 action)' : isDiscardTarget ? 'Discard this card' : isBottom && canSelectAsSource ? 'Click to move this card (1 action)' : undefined}
                          >
                            {card.name}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              );
              })}
            </div>

            <section className="liminal-deck">
              <h2>Liminal deck ({liminalDeck.length})</h2>
              {phase === 'draw' && (
                <>
                  <p className="liminal-hint">
                    When 3+ same-color cards align (in consecutive columns at a row, or in one column), draw 1 from the Liminal deck. 4 in a row = +1 token; 5 in a row = +2 tokens. The 3 matching cards are discarded. You can draw multiple times per turn. Doesn’t cost an action.
                  </p>
                  {liminalColorMatchThisDraw && (
                    <p className="liminal-color-match-bonus" role="status">
                      Color match! Gained token(s) — yōkai matched spirits and/or match matched area.
                    </p>
                  )}
                  <button
                    type="button"
                    className="btn liminal-btn"
                    onClick={drawFromLiminal}
                    disabled={!liminalUnlocked}
                    title={liminalUnlocked ? 'Draw 1 Liminal card (no action—you can draw multiple times per turn)' : 'Match 3 same-color cards in a row or in one column'}
                  >
                    Draw from Liminal (no action)
                  </button>
                </>
              )}
              {phase === 'play' && (
                <p className="liminal-deck-count">Liminal deck: {liminalDeck.length} cards</p>
              )}
            </section>
          </section>

          {phase === 'draw' && (
          <section className="hand hand-draw-phase">
            <h2>Your hand ({hand.length})</h2>
            {pendingDiscardCenterCard && (
              <div className="ability-target-hint">
                <span>Click a card in the center to discard it.</span>
                <button type="button" className="btn btn-cancel-move" onClick={cancelDiscardCenterTarget}>
                  Cancel
                </button>
              </div>
            )}
            <div className="card-row">
              {hand.length === 0 && (
                <span className="placeholder">No cards in hand</span>
              )}
              {hand.map((card) => {
                const canPlayAbility = card.ability === 'discard_center' && !pendingDiscardCenterCard
                const canPlaceOnColumn =
                  !pendingDiscardCenterCard &&
                  drawActionsRemaining > 0 &&
                  !mustDrawFromLiminal
                const isSelectedForPlace = handCardToPlace?.instanceId === card.instanceId
                if (canPlayAbility) {
                  return (
                    <button
                      key={card.instanceId}
                      type="button"
                      className="card in-hand card-with-ability"
                      onClick={() => playDiscardCenterAbility(card)}
                      style={{
                        background: CARD_COLORS[card.color] ?? '#444',
                        color: getCardTextColor(card.color),
                      }}
                      title={card.abilityText ?? 'Play during draw: discard 1 center card'}
                    >
                      {card.name}
                      {card.abilityText && <span className="ability-text">{card.abilityText}</span>}
                    </button>
                  )
                }
                if (canPlaceOnColumn) {
                  return (
                    <button
                      key={card.instanceId}
                      type="button"
                      className={`card in-hand ${isSelectedForPlace ? 'selected-for-place' : ''}`}
                      onClick={() => selectHandCardToPlace(card)}
                      style={{
                        background: CARD_COLORS[card.color] ?? '#444',
                        color: getCardTextColor(card.color),
                      }}
                      title={isSelectedForPlace ? 'Click a column to place, or click again to cancel' : 'Select to place at bottom of a column (1 action)'}
                    >
                      {card.name}
                      {card.cost > 0 && <span className="cost">{card.cost}</span>}
                    </button>
                  )
                }
                return (
                  <div
                    key={card.instanceId}
                    className="card in-hand display-only"
                    style={{
                      background: CARD_COLORS[card.color] ?? '#444',
                      color: getCardTextColor(card.color),
                    }}
                  >
                    {card.name}
                    {card.cost > 0 && <span className="cost">{card.cost}</span>}
                  </div>
                )
              })}
            </div>
            <div className="end-turn-row">
              {mustDrawFromLiminal && (
                <span className="done-blocked-hint">Draw from the Liminal deck first.</span>
              )}
              <button
                type="button"
                className="btn"
                onClick={endTurn}
                disabled={mustDrawFromLiminal}
                title={mustDrawFromLiminal ? 'Draw from the Liminal deck first' : undefined}
              >
                End turn
              </button>
            </div>
          </section>
          )}

          {phase === 'play' && (
            <>
              <button
                type="button"
                className="btn btn-played-modal"
                onClick={openPlayedModal}
              >
                Played this turn ({played.length})
              </button>
              <section className="hand">
                <h2>Hand ({hand.length})</h2>
                <div className="card-row">
                  {hand.map((card) => (
                    <button
                      key={card.instanceId}
                      type="button"
                      className="card in-hand"
                      onClick={() => playCard(card)}
                      style={{
                        background: CARD_COLORS[card.color] ?? '#444',
                        color: getCardTextColor(card.color),
                      }}
                    >
                      {card.name}
                      {card.cost > 0 && <span className="cost">{card.cost}</span>}
                    </button>
                  ))}
                </div>
                <button type="button" className="btn" onClick={endTurn}>
                  End turn
                </button>
              </section>
            </>
          )}
        </>
      )}

      {bonusModal && (
        <div
          className="bonus-modal-overlay"
          onClick={dismissBonusModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="bonus-modal-title"
        >
          <div
            className="bonus-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="bonus-modal-title" className="bonus-modal-title">
              {bonusModal.title}
            </h2>
            <p className="bonus-modal-message">{bonusModal.message}</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={dismissBonusModal}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {playedModalOpen && (
        <div
          className="bonus-modal-overlay"
          onClick={dismissPlayedModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="played-modal-title"
        >
          <div
            className="bonus-modal played-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="played-modal-title" className="bonus-modal-title">
              Played this turn
            </h2>
            <div className="played-modal-cards">
              {played.length === 0 ? (
                <p className="played-modal-empty">No cards played yet.</p>
              ) : (
                played.map((card) => (
                  <div
                    key={card.instanceId}
                    className="card played"
                    style={{
                      background: CARD_COLORS[card.color] ?? '#444',
                      color: getCardTextColor(card.color),
                    }}
                  >
                    {card.name}
                    {card.cost > 0 && <span className="cost">{card.cost}</span>}
                  </div>
                ))
              )}
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={dismissPlayedModal}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
