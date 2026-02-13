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
  liminalFacedownCard: null, // card placed facedown under center when 3 match; interacted with later
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
  } = state

  const canDrawFromLiminal =
    centerColumns[0]?.length > 0 &&
    centerColumns[1]?.length > 0 &&
    centerColumns[2]?.length > 0 &&
    centerColumns[0][0].color === centerColumns[1][0].color &&
    centerColumns[1][0].color === centerColumns[2][0].color
  const topColor = centerColumns[0]?.[0]?.color
  const alreadyDrewForThisCombo = topColor != null && liminalDrawnThisTurn === topColor
  const liminalUnlocked =
    canDrawFromLiminal &&
    liminalDeck.length > 0 &&
    !alreadyDrewForThisCombo &&
    !liminalFacedownCard // only one facedown card at a time
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
    }))
  }, [])

  const drawFromCenter = useCallback((columnIndex) => {
    setState((s) => {
      const decks = s.centerDecks[columnIndex]
      if (!decks.length) return s
      const [card, ...restDeck] = decks
      const newCenterDecks = s.centerDecks.map((d, i) =>
        i === columnIndex ? restDeck : d
      )
      const newCenterColumns = s.centerColumns.map((col, i) =>
        i === columnIndex ? [card, ...col] : col
      )

      let playerSource = [...s.deck]
      let newDiscard = [...s.discard]
      if (playerSource.length < 1 && newDiscard.length > 0) {
        playerSource = shuffle([...playerSource, ...newDiscard])
        newDiscard = []
      }
      const playerDrawn =
        playerSource.length > 0 ? playerSource.slice(0, 1) : []
      const newDeck = playerSource.length > 0 ? playerSource.slice(1) : []
      const newHand = [...s.hand, ...playerDrawn]

      return {
        ...s,
        deck: newDeck,
        hand: newHand,
        discard: newDiscard,
        centerDecks: newCenterDecks,
        centerColumns: newCenterColumns,
      }
    })
  }, [])

  const drawFromLiminal = useCallback(() => {
    setState((s) => {
      if (!s.liminalDeck.length || s.liminalFacedownCard) return s
      const topColor =
        s.centerColumns[0]?.[0]?.color ??
        s.centerColumns[1]?.[0]?.color ??
        s.centerColumns[2]?.[0]?.color
      const [card, ...rest] = s.liminalDeck
      return {
        ...s,
        liminalDeck: rest,
        liminalFacedownCard: card,
        liminalDrawnThisTurn: topColor ?? s.liminalDrawnThisTurn,
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

  const doneDrawing = useCallback(() => {
    setState((s) => ({ ...s, phase: 'play' }))
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
      const returnColumnsToDecks = s.centerColumns.map((col, i) =>
        shuffle([...(s.centerDecks[i] || []), ...col])
      )
      const newColumns = returnColumnsToDecks.map((d) => {
        if (d.length === 0) return []
        const [card, ...rest] = d
        return [card]
      })
      const newCenterDecks = returnColumnsToDecks.map((d) =>
        d.length > 0 ? d.slice(1) : []
      )
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
        centerDecks: newCenterDecks,
        centerColumns: newColumns,
        liminalDeck: s.liminalDeck,
        liminalDrawnThisTurn: null,
        liminalFacedownCard: s.liminalFacedownCard,
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
            <h2>Center row — draw more to add to a column and draw from your deck</h2>
            <div className="center-columns">
              {[0, 1, 2].map((i) => (
                <div key={i} className={`center-column ${i === 1 ? 'center-column-middle' : ''}`}>
                  <div className="center-column-label">
                    {CENTER_DECK_LABELS[i]} deck ({centerDecks[i]?.length ?? 0})
                  </div>
                  <button
                    type="button"
                    className="btn draw-center-btn"
                    onClick={() => drawFromCenter(i)}
                    disabled={!centerDecks[i]?.length || mustDrawFromLiminal}
                    title={mustDrawFromLiminal ? 'Draw from the Liminal deck first' : 'Draw one from this deck (column grows) and one from your deck'}
                  >
                    Draw from {CENTER_DECK_LABELS[i]}
                  </button>
                  <div className="center-column-stack">
                    <div className="center-cards-column">
                      {(centerColumns[i] || []).map((card) => (
                        <div
                          key={card.instanceId}
                          className="card center-card"
                          style={{
                            background: CARD_COLORS[card.color] ?? '#444',
                            color: getCardTextColor(card.color),
                          }}
                        >
                          {card.name}
                        </div>
                      ))}
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
                              onClick={interactWithLiminalFacedown}
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
                When the top card of each center column is the same color (3 in a row), a card is drawn from the Liminal deck and placed facedown under the center (once per combo per turn). Interact with it later.
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
