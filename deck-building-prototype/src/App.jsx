import { useState, useCallback } from 'react'
import {
  STARTER_CARDS,
  MARKET_CARDS,
  CENTER_DECK_DEFS,
  CENTER_DECK_LABELS,
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
  } = state

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
                <div key={i} className="center-column">
                  <div className="center-column-label">
                    {CENTER_DECK_LABELS[i]} deck ({centerDecks[i]?.length ?? 0})
                  </div>
                  <button
                    type="button"
                    className="btn draw-center-btn"
                    onClick={() => drawFromCenter(i)}
                    disabled={!centerDecks[i]?.length}
                    title="Draw one from this deck (column grows) and one from your deck"
                  >
                    Draw from {CENTER_DECK_LABELS[i]}
                  </button>
                  <div className="center-cards-column">
                    {(centerColumns[i] || []).map((card) => (
                      <div key={card.instanceId} className="card center-card">
                        {card.name}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className="btn btn-done" onClick={doneDrawing}>
              Done drawing
            </button>
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
                <div key={card.instanceId} className="card played">
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
