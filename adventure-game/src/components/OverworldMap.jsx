import { useState } from 'react'
import './OverworldMap.css'
import { overworldMap } from '../data/overworldMap'

function OverworldMap({ currentPoint, onTravel }) {
  const [selectedPoint, setSelectedPoint] = useState(currentPoint || 'a')

  const handlePointClick = (pointId) => {
    setSelectedPoint(pointId)
  }

  const handleTravelClick = (connection) => {
    if (connection.from === selectedPoint || connection.to === selectedPoint) {
      onTravel(connection.pathId, connection)
    }
  }

  const getAvailablePaths = () => {
    return overworldMap.connections.filter(
      (conn) => conn.from === selectedPoint || conn.to === selectedPoint
    )
  }

  const getOtherPoint = (connection) => {
    return connection.from === selectedPoint ? connection.to : connection.from
  }

  return (
    <div className="overworld-map">
      <h2>Overworld Map</h2>
      <div className="map-container">
        <svg className="map-svg" viewBox="0 0 600 350">
          {/* Draw connections */}
          {overworldMap.connections.map((conn, idx) => {
            const fromPoint = overworldMap.points[conn.from]
            const toPoint = overworldMap.points[conn.to]
            return (
              <line
                key={idx}
                x1={fromPoint.x}
                y1={fromPoint.y}
                x2={toPoint.x}
                y2={toPoint.y}
                className="connection-line"
              />
            )
          })}

          {/* Draw points */}
          {Object.values(overworldMap.points).map((point) => (
            <g key={point.id}>
              <circle
                cx={point.x}
                cy={point.y}
                r={20}
                className={`map-point ${point.id === selectedPoint ? 'selected' : ''}`}
                onClick={() => handlePointClick(point.id)}
              />
              <text
                x={point.x}
                y={point.y - 30}
                textAnchor="middle"
                className="point-label"
              >
                {point.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="map-controls">
        <div className="current-point">
          <p>Current Point: <strong>{overworldMap.points[selectedPoint]?.label}</strong></p>
        </div>
        <div className="available-paths">
          <h3>Available Paths:</h3>
          {getAvailablePaths().length > 0 ? (
            <ul>
              {getAvailablePaths().map((connection) => {
                const otherPoint = getOtherPoint(connection)
                return (
                  <li key={connection.pathId}>
                    <button
                      onClick={() => handleTravelClick(connection)}
                      className="travel-button"
                    >
                      Travel to {overworldMap.points[otherPoint]?.label}
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p>No paths available from this point.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default OverworldMap
