import './Card.css'

function Card({ card }) {
  return (
    <div className="card">
      <h3>{card.name}</h3>
      <p className="card-type">{card.type}</p>
    </div>
  )
}

export default Card
