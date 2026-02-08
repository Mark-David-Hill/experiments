import './Card.css'
import { CARD_TYPES } from '../data/cardTypes'

function EyeIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function Card({ card }) {
  const isCharacter = card.type === CARD_TYPES.CHARACTER
  const sight = isCharacter && card.sight != null ? card.sight : null

  return (
    <div className="card">
      <h3>{card.name}</h3>
      <p className="card-type">{card.type}</p>
      {sight != null && (
        <div className="card-sight" title={`Can see ${sight} space${sight === 1 ? '' : 's'} away`}>
          <EyeIcon className="card-sight-icon" />
          <span className="card-sight-value">{sight}</span>
        </div>
      )}
    </div>
  )
}

export default Card
