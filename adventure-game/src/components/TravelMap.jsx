import './TravelMap.css'
import { overworldMap } from '../data/overworldMap'

function TravelMap({ pathId, connection, onReturn }) {
  const fromPoint = overworldMap.points[connection.from]
  const toPoint = overworldMap.points[connection.to]

  return (
    <div className="travel-map">
      <div className="travel-header">
        <h2>Travel Map</h2>
        <p className="path-info">
          {fromPoint.label} → {toPoint.label}
        </p>
      </div>

      <div className="travel-content">
        <p className="travel-description">
          This is where the gameplay happens on the path from {fromPoint.label} to {toPoint.label}.
        </p>
        <p className="path-id">Path ID: {pathId}</p>
        
        {/* This is where card gameplay, encounters, etc. will go */}
        <div className="gameplay-area">
          <p>Gameplay area - cards and encounters will appear here</p>
        </div>
      </div>

      <div className="travel-controls">
        <button onClick={onReturn} className="return-button">
          Return to Overworld
        </button>
      </div>
    </div>
  )
}

export default TravelMap
