import { useState } from 'react'
import './OverworldMap.css'
import { overworldMap } from '../data/overworldMap'
import TravelModal from './TravelModal'

function OverworldMap({ currentPoint, onTravel }) {
  const [modalConnection, setModalConnection] = useState(null)

  const isPointReachable = (pointId) => {
    if (pointId === currentPoint) return false
    return overworldMap.connections.some(
      (conn) =>
        (conn.from === currentPoint && conn.to === pointId) ||
        (conn.to === currentPoint && conn.from === pointId)
    )
  }

  const getConnectionToPoint = (pointId) => {
    return overworldMap.connections.find(
      (conn) =>
        (conn.from === currentPoint && conn.to === pointId) ||
        (conn.to === currentPoint && conn.from === pointId)
    )
  }

  const handlePointClick = (pointId) => {
    if (isPointReachable(pointId)) {
      const connection = getConnectionToPoint(pointId)
      setModalConnection(connection)
    }
  }

  const handleConfirmTravel = () => {
    if (modalConnection) {
      onTravel(modalConnection.pathId, modalConnection)
      setModalConnection(null)
    }
  }

  const handleCancelTravel = () => {
    setModalConnection(null)
  }

  const getDestinationPoint = (connection) => {
    return connection.from === currentPoint
      ? overworldMap.points[connection.to]
      : overworldMap.points[connection.from]
  }

  return (
    <div className="overworld-map">
      <h2>Overworld Map</h2>
      <div className="current-point-info">
        <p>Current Point: <strong>{overworldMap.points[currentPoint]?.label}</strong></p>
        <p className="hint">Click on a connected point to travel</p>
      </div>
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
          {Object.values(overworldMap.points).map((point) => {
            const isReachable = isPointReachable(point.id)
            const isCurrent = point.id === currentPoint
            return (
              <g key={point.id}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={20}
                  className={`map-point ${
                    isCurrent ? 'current' : isReachable ? 'reachable' : 'unreachable'
                  }`}
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
            )
          })}
        </svg>
      </div>

      {modalConnection && (
        <TravelModal
          fromPoint={overworldMap.points[currentPoint]}
          toPoint={getDestinationPoint(modalConnection)}
          onConfirm={handleConfirmTravel}
          onCancel={handleCancelTravel}
        />
      )}
    </div>
  )
}

export default OverworldMap
