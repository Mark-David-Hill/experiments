import { useState, useCallback } from 'react'
import {
  STARTER_CARDS,
  MARKET_CARDS,
  CENTER_DECK_DEFS,
  CENTER_DECK_LABELS,
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
  centerDecks: [[], [], []],
  centerColumns: [[], [], []],
  liminalDeck: [],
  drawActionsRemaining: 0,
  moveSourceColumn: null, // when set, waiting to pick destination to move bottom card (costs 1 action)
  pendingDiscardCenterCard: null, // when set, waiting to pick a center card to discard (ability played in draw phase)
  handCardToPlace: null, // when set, waiting to pick a column to place this hand card at the bottom (costs 1 action)
  liminalColorMatchThisDraw: false, // true when last Liminal draw was same color as match (shows bonus message)
  areaColor: null, // innate color of current area (random at game start); match this color for bonus token
  tokens: {}, // color -> count (from Liminal color-match bonus)
  bonusModal: null, // { title, message } when set, show modal until dismissed
})

/** Finds first 3-in-a-row (same color): any horizontal row, or any vertical run in a column. */
function findFirstMatch(centerColumns) {
  const cols = centerColumns || [[], [], []]
  const minLen = Math.min(cols[0]?.length ?? 0, cols[1]?.length ?? 0, cols[2]?.length ?? 0)
  for (let d = 0; d < minLen; d++) {
    const c0 = cols[0][d].color
    const c1 = cols[1][d].color
    const c2 = cols[2][d].color
    if (c0 === c1 && c1 === c2) return { type: 'horizontal', rowIndex: d }
  }
  for (let col = 0; col < 3; col++) {
    const colArr = cols[col] || []
    for (let start = 0; start + 3 <= colArr.length; start++) {
      const c0 = colArr[start].color
      const c1 = colArr[start + 1].color
      const c2 = colArr[start + 2].color
      if (c0 === c1 && c1 === c2) return { type: 'vertical', colIndex: col, startIndex: start }
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
  } = state

  const liminalMatch = findFirstMatch(centerColumns)
  const liminalMatchColor = liminalMatch
    ? liminalMatch.type === 'horizontal'
      ? centerColumns[0][liminalMatch.rowIndex].color
      : centerColumns[liminalMatch.colIndex][liminalMatch.startIndex].color
    : null
  const canDrawFromLiminal = liminalMatch != null && liminalMatchColor != null
  // Liminal draw never costs an action; you can draw multiple times per turn for the same color
  const liminalUnlocked = canDrawFromLiminal && liminalDeck.length > 0
  const mustDrawFromLiminal = liminalUnlocked

  const startGame = useCallback(() => {
    const playerDeck = shuffle(STARTER_CARDS.map((c) => createCardInstance(c)))
    const { drawn, newDeck } = drawFromPlayerPile(playerDeck, [], HAND_SIZE)

    const centerDecksInit = CENTER_DECK_DEFS.map((defs) =>
      shuffle(defs.map((c) => createCardInstance(c)))
    )
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
      const newCenterColumns = s.centerColumns.map((col, i) =>
        i === columnIndex ? [card, ...col] : col
      )
      return {
        ...s,
        centerDecks: newCenterDecks,
        centerColumns: newCenterColumns,
        drawActionsRemaining: s.drawActionsRemaining - 1,
      }
    })
  }, [])

  const drawFromLiminal = useCallback(() => {
    setState((s) => {
      if (!s.liminalDeck.length) return s
      const match = findFirstMatch(s.centerColumns)
      if (!match) return s
      const [card, ...rest] = s.liminalDeck
      let threeMatching
      let newCenterColumns
      if (match.type === 'horizontal') {
        const d = match.rowIndex
        threeMatching = [
          s.centerColumns[0][d],
          s.centerColumns[1][d],
          s.centerColumns[2][d],
        ]
        newCenterColumns = s.centerColumns.map((col) => [
          ...col.slice(0, d),
          ...col.slice(d + 1),
        ])
      } else {
        const { colIndex, startIndex } = match
        threeMatching = s.centerColumns[colIndex].slice(startIndex, startIndex + 3)
        newCenterColumns = s.centerColumns.map((col, i) =>
          i === colIndex
            ? [...col.slice(0, startIndex), ...col.slice(startIndex + 3)]
            : col
        )
      }
      const matchColor = threeMatching[0].color
      const colorMatch = matchColor === card.color
      const areaMatch = matchColor === s.areaColor

      let newTokens = { ...s.tokens }
      if (colorMatch && LIMINAL_COLOR_MATCH_BONUS === 'token') {
        newTokens = { ...newTokens, [matchColor]: (newTokens[matchColor] ?? 0) + 1 }
      }
      if (areaMatch) {
        newTokens = { ...newTokens, [matchColor]: (newTokens[matchColor] ?? 0) + 1 }
      }

      let bonusModal = null
      if (colorMatch || areaMatch) {
        const parts = []
        if (colorMatch && LIMINAL_COLOR_MATCH_BONUS === 'token') {
          parts.push('Yōkai matched the spirits')
        }
        if (areaMatch) {
          parts.push('Match matched the area')
        }
        const tokenCount = (colorMatch ? 1 : 0) + (areaMatch ? 1 : 0)
        bonusModal = {
          title: 'Bonus!',
          message: `${parts.join(' and ')} — +${tokenCount} token${tokenCount !== 1 ? 's' : ''} (${matchColor}).`,
        }
      }

      return {
        ...s,
        liminalDeck: rest,
        hand: [...s.hand, card],
        centerColumns: newCenterColumns,
        discard: [...s.discard, ...threeMatching],
        liminalColorMatchThisDraw: colorMatch || areaMatch,
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
        const newCenterColumns = s.centerColumns.map((col, i) =>
          i === src ? newSourceCol : i === columnIndex ? [...destCol, card] : col
        )
        return {
          ...s,
          centerColumns: newCenterColumns,
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
      if (s.handCardToPlace || s.pendingDiscardCenterCard || typeof s.moveSourceColumn === 'number') return s
      if (s.drawActionsRemaining <= 0) return s
      const match = findFirstMatch(s.centerColumns)
      const mustDraw = match != null && s.liminalDeck.length > 0
      if (mustDraw) return s
      return {
        ...s,
        hand: s.hand.filter((c) => c.instanceId !== card.instanceId),
        handCardToPlace: card,
      }
    })
  }, [])

  const placeHandCardOnColumn = useCallback((columnIndex) => {
    setState((s) => {
      if (!s.handCardToPlace || s.drawActionsRemaining <= 0) return s
      const col = s.centerColumns[columnIndex] || []
      return {
        ...s,
        centerColumns: s.centerColumns.map((c, i) => (i === columnIndex ? [...c, s.handCardToPlace] : c)),
        handCardToPlace: null,
        drawActionsRemaining: s.drawActionsRemaining - 1,
      }
    })
  }, [])

  const cancelPlaceHandCard = useCallback(() => {
    setState((s) => {
      if (!s.handCardToPlace) return s
      return {
        ...s,
        hand: [...s.hand, s.handCardToPlace],
        handCardToPlace: null,
      }
    })
  }, [])

  const dismissBonusModal = useCallback(() => {
    setState((s) => (s.bonusModal ? { ...s, bonusModal: null } : s))
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
    setState((s) => {
      const newDiscard = [...s.discard, ...s.hand, ...s.played]
      const { drawn, newDeck, newDiscard: afterDraw } = drawFromPlayerPile(
        s.deck,
        newDiscard,
        HAND_SIZE
      )
      return {
        ...s,
        phase: 'draw',
        deck: newDeck,
        hand: drawn,
        discard: afterDraw,
        played: [],
        energy: STARTING_ENERGY,
        centerDecks: s.centerDecks,
        centerColumns: s.centerColumns,
        liminalDeck: s.liminalDeck,
        drawActionsRemaining: DRAW_ACTIONS_PER_TURN,
        moveSourceColumn: null,
      }
    })
  }, [])

  const acquire = useCallback((card) => {
    setState((s) => ({
      ...s,
      discard: [...s.discard, createCardInstance(card)],
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

      {gameStarted && phase === 'draw' && (
        <>
          <section className="center-decks">
            <h2>Center row — spend 1 action to draw a card from a deck into its column ({drawActionsRemaining} actions left)</h2>
            {typeof moveSourceColumn === 'number' && (
              <div className="move-card-hint">
                {`Move bottom card to column (click ${CENTER_DECK_LABELS[moveSourceColumn]} to cancel)`}
                <button type="button" className="btn btn-cancel-move" onClick={cancelMoveCard}>
                  Cancel
                </button>
              </div>
            )}
            {handCardToPlace && (
              <div className="move-card-hint">
                Place card at bottom of a column (1 action)
                <button type="button" className="btn btn-cancel-move" onClick={cancelPlaceHandCard}>
                  Cancel
                </button>
              </div>
            )}
            <div className="center-columns">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`center-column ${i === 1 ? 'center-column-middle' : ''} ${
                    handCardToPlace ? 'center-column-dest' : typeof moveSourceColumn === 'number' && moveSourceColumn !== i && !pendingDiscardCenterCard ? 'center-column-dest' : ''
                  } ${typeof moveSourceColumn === 'number' && moveSourceColumn === i ? 'center-column-source' : ''}`}
                  onClick={
                    handCardToPlace
                      ? (e) => { e.stopPropagation(); placeHandCardOnColumn(i); }
                      : !pendingDiscardCenterCard && typeof moveSourceColumn === 'number' && moveSourceColumn !== i
                        ? () => selectMoveSourceOrDest(i)
                        : undefined
                  }
                  role={handCardToPlace || (!pendingDiscardCenterCard && typeof moveSourceColumn === 'number' && moveSourceColumn !== i) ? 'button' : undefined}
                  tabIndex={handCardToPlace || (!pendingDiscardCenterCard && typeof moveSourceColumn === 'number') ? 0 : undefined}
                >
                  <div className="center-column-label">
                    {CENTER_DECK_LABELS[i]} deck ({centerDecks[i]?.length ?? 0})
                  </div>
                  <button
                    type="button"
                    className="btn draw-center-btn"
                    onClick={(e) => { e.stopPropagation(); drawFromCenter(i); }}
                    disabled={!centerDecks[i]?.length || mustDrawFromLiminal || drawActionsRemaining <= 0}
                    title={mustDrawFromLiminal ? 'Draw from the Liminal deck first' : drawActionsRemaining <= 0 ? 'No actions left' : '1 action: add a card from this deck to the column'}
                  >
                    Draw from {CENTER_DECK_LABELS[i]}
                  </button>
                  <div className="center-column-stack">
                    <div className="center-cards-column">
                      {(centerColumns[i] || []).map((card, idx) => {
                        const isBottom = idx === (centerColumns[i]?.length ?? 0) - 1
                        const canSelectAsSource =
                          moveSourceColumn === null &&
                          !pendingDiscardCenterCard &&
                          drawActionsRemaining > 0 &&
                          !mustDrawFromLiminal &&
                          (centerColumns[i]?.length ?? 0) > 0
                        const isDiscardTarget = !!pendingDiscardCenterCard
                        return (
                          <div
                            key={card.instanceId}
                            className={`card center-card ${isBottom ? 'center-card-bottom' : ''} ${isBottom && canSelectAsSource ? 'center-card-moveable' : ''} ${isDiscardTarget ? 'center-card-discard-target' : ''}`}
                            style={{
                              background: CARD_COLORS[card.color] ?? '#444',
                              color: getCardTextColor(card.color),
                            }}
                            onClick={
                              isDiscardTarget
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
                            role={isDiscardTarget || (isBottom && canSelectAsSource) ? 'button' : undefined}
                            title={isDiscardTarget ? 'Discard this card' : isBottom && canSelectAsSource ? 'Click to move this card (1 action)' : undefined}
                          >
                            {card.name}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <section className="liminal-deck">
              <h2>Liminal deck ({liminalDeck.length})</h2>
              <p className="liminal-hint">
                When the top card of each column is the same color (3 in a row) or one column has 3 same-color cards on top (vertical stack), draw 1 card from the Liminal deck into your hand. The 3 matching cards are discarded. You can draw multiple times per turn. Doesn’t cost an action.
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
                title={liminalUnlocked ? 'Draw 1 Liminal card into hand (required, no action)' : 'Match 3 same-color cards in a row or in one column'}
              >
                Draw from Liminal (no action)
              </button>
            </section>

            <div className="done-row">
              {mustDrawFromLiminal && (
                <span className="done-blocked-hint">Draw from the Liminal deck first.</span>
              )}
              <button
                type="button"
                className="btn btn-done"
                onClick={doneDrawing}
                disabled={mustDrawFromLiminal}
                title={mustDrawFromLiminal ? 'Draw from the Liminal deck first' : undefined}
              >
                Done drawing
              </button>
            </div>
          </section>

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
              {hand.length === 0 && !handCardToPlace && (
                <span className="placeholder">No cards in hand</span>
              )}
              {hand.map((card) => {
                const canPlayAbility = card.ability === 'discard_center' && !pendingDiscardCenterCard
                const canPlaceOnColumn =
                  !handCardToPlace &&
                  !pendingDiscardCenterCard &&
                  drawActionsRemaining > 0 &&
                  !mustDrawFromLiminal
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
                      className="card in-hand"
                      onClick={() => selectHandCardToPlace(card)}
                      style={{
                        background: CARD_COLORS[card.color] ?? '#444',
                        color: getCardTextColor(card.color),
                      }}
                      title="Place at bottom of a column (1 action)"
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
          </section>
        </>
      )}

      {gameStarted && phase === 'play' && (
        <>
          <section className="play-area">
            <h2>Played this turn</h2>
            <div className="card-row">
              {played.length === 0 && (
                <span className="placeholder">Play cards from hand</span>
              )}
              {played.map((card) => (
                <div
                  key={card.instanceId}
                  className="card played"
                  style={{
                    background: CARD_COLORS[card.color] ?? '#444',
                    color: getCardTextColor(card.color),
                  }}
                >
                  {card.name}
                </div>
              ))}
            </div>
          </section>

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

          <section className="market">
            <h2>Market — acquire to add to discard</h2>
            <div className="card-row">
              {MARKET_CARDS.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  className="card market-card"
                  onClick={() => acquire(card)}
                  style={{
                    background: CARD_COLORS[card.color] ?? '#444',
                    color: getCardTextColor(card.color),
                  }}
                >
                  {card.name}
                  <span className="cost">{card.cost}</span>
                </button>
              ))}
            </div>
          </section>
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
    </div>
  )
}

export default App
