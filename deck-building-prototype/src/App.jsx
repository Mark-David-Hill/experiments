import { useState, useCallback } from 'react'
import { STARTER_CARDS, MARKET_CARDS, createCardInstance } from './data/cards'
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

function drawFromPile(deck, discard, count) {
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

function App() {
  const [deck, setDeck] = useState([])
  const [hand, setHand] = useState([])
  const [discard, setDiscard] = useState([])
  const [played, setPlayed] = useState([])
  const [energy, setEnergy] = useState(STARTING_ENERGY)
  const [gameStarted, setGameStarted] = useState(false)

  const startGame = useCallback(() => {
    const initialDeck = shuffle(STARTER_CARDS.map((c) => createCardInstance(c)))
    const { drawn, newDeck } = drawFromPile(initialDeck, [], HAND_SIZE)
    setDeck(newDeck)
    setHand(drawn)
    setDiscard([])
    setPlayed([])
    setEnergy(STARTING_ENERGY)
    setGameStarted(true)
  }, [])

  const playCard = useCallback((card) => {
    setHand((h) => h.filter((c) => c.instanceId !== card.instanceId))
    setPlayed((p) => [...p, card])
    setEnergy((e) => Math.max(0, e - (card.cost ?? 0)))
  }, [])

  const endTurn = useCallback(() => {
    const newDiscard = [...discard, ...hand, ...played]
    const { drawn, newDeck, newDiscard: afterDraw } = drawFromPile(deck, newDiscard, HAND_SIZE)
    setDiscard(afterDraw)
    setDeck(newDeck)
    setHand(drawn)
    setPlayed([])
    setEnergy(STARTING_ENERGY)
  }, [deck, discard, hand, played])

  const acquire = useCallback((card) => {
    setDiscard((d) => [...d, createCardInstance(card)])
  }, [])

  return (
    <div className="app">
      <header className="header">
        <h1>Deck-building prototype</h1>
        <div className="piles">
          <span className="pile">Deck: {deck.length}</span>
          <span className="pile">Discard: {discard.length}</span>
          <span className="pile">Energy: {energy}</span>
        </div>
        <button type="button" className="btn btn-primary" onClick={startGame}>
          {gameStarted ? 'New game' : 'Start game'}
        </button>
      </header>

      {!gameStarted && (
        <p className="hint">Click &quot;Start game&quot; to draw your hand and begin.</p>
      )}

      {gameStarted && (
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
