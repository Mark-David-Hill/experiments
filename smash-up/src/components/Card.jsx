export default function Card({ cardData }) {

  return (
    <div className="card-container">
      {/* <div className="card-image">
        <img src={props.image} alt={props.name} />
      </div> */}
      <div className="card-name">
        {cardData.name}
      </div>
    
      <div className="card-description">
        {cardData.description}
      </div>
    
        <div className="card-power">
          <span className="card-power-label">Power</span>
          <span className="card-stat-value">{cardData.power}</span>
        </div>
      
    </div>
  );
}
