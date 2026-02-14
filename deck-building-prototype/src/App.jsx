import { useState, useCallback } from 'react'
import {
  STARTER_CARDS,
  MARKET_CARDS,
  CENTER_DECK_DEFS,
  CENTER_DECK_LABELS,
  LIMINAL_DECK_DEFS,
  CARD_COLORS,
  getCardTextColor,
  createCardInstance,
} from './data/cards'
import './App.css'

const HAND_SIZE = 5
const STARTING_ENERGY = 3
const DRAW_ACTIONS_PER_TURN = 5

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
  liminalDrawnThisTurn: null,
  liminalFacedownCard: null,
  drawActionsRemaining: 0,
  moveSourceColumn: null, // when set, waiting to pick destination to move bottom card (costs 1 action)
})

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
  liminalDrawnThisTurn,
  liminalFacedownCard,
  drawActionsRemaining,
  moveSourceColumn,
  } = state

  const horizontalMatch =
    centerColumns[0]?.length > 0 &&
    centerColumns[1]?.length > 0 &&
    centerColumns[2]?.length > 0 &&
    centerColumns[0][0].color === centerColumns[1][0].color &&
    centerColumns[1][0].color === centerColumns[2][0].color
  const verticalMatchColumn = [0, 1, 2].find(
    (i) =>
      (centerColumns[i]?.length ?? 0) >= 3 &&
      centerColumns[i][0].color === centerColumns[i][1].color &&
      centerColumns[i][1].color === centerColumns[i][2].color
  )
  const liminalMatchColor = horizontalMatch
    ? centerColumns[0][0].color
    : verticalMatchColumn !== undefined
      ? centerColumns[verticalMatchColumn][0].color
      : null
  const canDrawFromLiminal = (horizontalMatch || verticalMatchColumn !== undefined) && liminalMatchColor != null
  const alreadyDrewForThisCombo = liminalMatchColor != null && liminalDrawnThisTurn === liminalMatchColor
  const liminalUnlocked =
    canDrawFromLiminal &&
    liminalDeck.length > 0 &&
    !alreadyDrewForThisCombo &&
    !liminalFacedownCard
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

    setState((s) => ({
      ...s,
      gameStarted: true,
      phase: 'draw',
      deck: newDeck,
      hand: drawn,
      discard: [],
      played: [],
      energy: STARTING_ENERGY,
      centerDecks: centerDecksAfterFirstDraw,
      centerColumns: newColumns,
      liminalDeck: liminalDeckInit,
      liminalDrawnThisTurn: null,
      liminalFacedownCard: null,
      drawActionsRemaining: DRAW_ACTIONS_PER_TURN,
      moveSourceColumn: null,
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
      if (!s.liminalDeck.length || s.liminalFacedownCard) return s
      const hMatch =
        s.centerColumns[0]?.length > 0 &&
        s.centerColumns[1]?.length > 0 &&
        s.centerColumns[2]?.length > 0 &&
        s.centerColumns[0][0].color === s.centerColumns[1][0].color &&
        s.centerColumns[1][0].color === s.centerColumns[2][0].color
      const vCol = [0, 1, 2].find(
        (i) =>
          (s.centerColumns[i]?.length ?? 0) >= 3 &&
          s.centerColumns[i][0].color === s.centerColumns[i][1].color &&
          s.centerColumns[i][1].color === s.centerColumns[i][2].color
      )
      const matchColor = hMatch
        ? s.centerColumns[0][0].color
        : vCol !== undefined
          ? s.centerColumns[vCol][0].color
          : null
      const [card, ...rest] = s.liminalDeck
      let threeMatching
      let newCenterColumns
      if (hMatch) {
        threeMatching = [
          s.centerColumns[0][0],
          s.centerColumns[1][0],
          s.centerColumns[2][0],
        ]
        newCenterColumns = s.centerColumns.map((col) => col.slice(1))
      } else if (vCol !== undefined) {
        threeMatching = s.centerColumns[vCol].slice(0, 3)
        newCenterColumns = s.centerColumns.map((col, i) =>
          i === vCol ? col.slice(3) : col
        )
      } else {
        return s
      }
      return {
        ...s,
        liminalDeck: rest,
        liminalFacedownCard: card,
        liminalDrawnThisTurn: matchColor ?? s.liminalDrawnThisTurn,
        centerColumns: newCenterColumns,
        discard: [...s.discard, ...threeMatching],
      }
    })
  }, [])

  const interactWithLiminalFacedown = useCallback(() => {
    setState((s) => {
      if (!s.liminalFacedownCard) return s
      return {
        ...s,
        hand: [...s.hand, s.liminalFacedownCard],
        liminalFacedownCard: null,
      }
    })
  }, [])

  const startMoveCard = useCallback(() => {
    setState((s) => ({ ...s, moveSourceColumn: 'pending' }))
  }, [])

  const selectMoveSourceFromCard = useCallback((columnIndex) => {
    setState((s) => {
      if (s.moveSourceColumn !== null && s.moveSourceColumn !== 'pending') return s
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
      if (s.moveSourceColumn === 'pending') {
        const col = s.centerColumns[columnIndex] || []
        if (col.length === 0 || s.drawActionsRemaining <= 0) return s
        return { ...s, moveSourceColumn: columnIndex }
      }
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
    setState((s) => ({ ...s, phase: 'play', moveSourceColumn: null }))
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
        liminalDrawnThisTurn: null,
        liminalFacedownCard: s.liminalFacedownCard,
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
            <div className="center-row-actions">
              <button
                type="button"
                className="btn move-card-btn"
                onClick={startMoveCard}
                disabled={mustDrawFromLiminal || drawActionsRemaining <= 0 || !centerColumns.some((col) => (col || []).length > 0) || (moveSourceColumn === 'pending' || typeof moveSourceColumn === 'number')}
                title="Pick a column, then pick a different column to move the bottom card (1 action)"
              >
                Move card (1 action)
              </button>
            </div>
            <div className="center-columns">
              {(moveSourceColumn === 'pending' || typeof moveSourceColumn === 'number') && (
                <div className="move-card-hint">
                  {moveSourceColumn === 'pending'
                    ? 'Click a column to move its bottom card from'
                    : `Move bottom card to column (click ${CENTER_DECK_LABELS[moveSourceColumn]} to cancel)`}
                  <button type="button" className="btn btn-cancel-move" onClick={cancelMoveCard}>
                    Cancel
                  </button>
                </div>
              )}
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`center-column ${i === 1 ? 'center-column-middle' : ''} ${
                    moveSourceColumn === 'pending' && (centerColumns[i] || []).length > 0
                      ? 'center-column-clickable'
                      : ''
                  } ${typeof moveSourceColumn === 'number' && moveSourceColumn !== i ? 'center-column-dest' : ''} ${
                    typeof moveSourceColumn === 'number' && moveSourceColumn === i ? 'center-column-source' : ''
                  }`}
                  onClick={
                    moveSourceColumn === 'pending' && (centerColumns[i] || []).length > 0
                      ? () => selectMoveSourceOrDest(i)
                      : typeof moveSourceColumn === 'number' && moveSourceColumn !== i
                        ? () => selectMoveSourceOrDest(i)
                        : undefined
                  }
                  role={moveSourceColumn === 'pending' || (typeof moveSourceColumn === 'number' && moveSourceColumn !== i) ? 'button' : undefined}
                  tabIndex={moveSourceColumn === 'pending' || typeof moveSourceColumn === 'number' ? 0 : undefined}
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
                    Draw from {CENTER_DECK_LABELS[i]} (1 action)
                  </button>
                  <div className="center-column-stack">
                    <div className="center-cards-column">
                      {(centerColumns[i] || []).map((card, idx) => {
                        const isBottom = idx === (centerColumns[i]?.length ?? 0) - 1
                        const canSelectAsSource =
                          (moveSourceColumn === null || moveSourceColumn === 'pending') &&
                          drawActionsRemaining > 0 &&
                          !mustDrawFromLiminal &&
                          (centerColumns[i]?.length ?? 0) > 0
                        return (
                          <div
                            key={card.instanceId}
                            className={`card center-card ${isBottom ? 'center-card-bottom' : ''} ${isBottom && canSelectAsSource ? 'center-card-moveable' : ''}`}
                            style={{
                              background: CARD_COLORS[card.color] ?? '#444',
                              color: getCardTextColor(card.color),
                            }}
                            onClick={
                              isBottom && canSelectAsSource
                                ? (e) => {
                                    e.stopPropagation()
                                    selectMoveSourceFromCard(i)
                                  }
                                : undefined
                            }
                            role={isBottom && canSelectAsSource ? 'button' : undefined}
                            title={isBottom && canSelectAsSource ? 'Click to move this card (1 action)' : undefined}
                          >
                            {card.name}
                          </div>
                        )
                      })}
                    </div>
                    {i === 1 && (
                      <div className="liminal-under-slot">
                        {liminalFacedownCard ? (
                          <>
                            <div
                              className="card-facedown-peek"
                              aria-label="Liminal card (facedown, under center card)"
                            />
                            <button
                              type="button"
                              className="btn liminal-interact-btn"
                              onClick={(e) => { e.stopPropagation(); interactWithLiminalFacedown(); }}
                              title="Interact with the facedown card (will lead to things later)"
                            >
                              Interact
                            </button>
                          </>
                        ) : (
                          <span className="liminal-slot-empty">3 match → card here</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <section className="liminal-deck">
              <h2>Liminal deck ({liminalDeck.length})</h2>
              <p className="liminal-hint">
                When the top card of each column is the same color (3 in a row) or one column has 3 same-color cards on top (vertical stack), a card is drawn from the Liminal deck and placed facedown under the center (once per color per turn). Interact with it later.
              </p>
              <button
                type="button"
                className="btn liminal-btn"
                onClick={drawFromLiminal}
                disabled={!liminalUnlocked}
                title={liminalUnlocked ? 'Place a spirit card facedown (required)' : alreadyDrewForThisCombo ? 'Already drew for this color combo' : liminalFacedownCard ? 'Interact with the facedown card first' : 'Match the top card color across all 3 columns'}
              >
                Draw from Liminal
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
            <div className="card-row">
              {hand.length === 0 && (
                <span className="placeholder">No cards in hand</span>
              )}
              {hand.map((card) => (
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
              ))}
            </div>
          </section>
        </>
      )}

      {gameStarted && phase === 'play' && (
        <>
          {liminalFacedownCard && (
            <section className="liminal-facedown-in-play">
              <h2>Facedown Liminal card</h2>
              <div className="liminal-facedown-standalone">
                <div className="card-facedown-peek" aria-label="Liminal card (facedown)" />
                <button
                  type="button"
                  className="btn liminal-interact-btn"
                  onClick={interactWithLiminalFacedown}
                  title="Interact with the facedown card (will lead to things later)"
                >
                  Interact
                </button>
              </div>
            </section>
          )}
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
    </div>
  )
}

export default App
