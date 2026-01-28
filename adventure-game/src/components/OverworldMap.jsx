import './OverworldMap.css'
import { overworldMap } from '../data/overworldMap'
import { travelMaps } from '../data/travelMaps'

function OverworldMap({ currentPoint, onTravel }) {
  // Get all paths that connect to the current point
  const getAvailablePaths = () => {
    return overworldMap.paths.filter((path) => path.connectedPoints.includes(currentPoint))
  }

  const handlePathClick = (path) => {
    onTravel(path.pathId, { 
      from: currentPoint, 
      connectedPoints: path.connectedPoints 
    })
  }

  const getPathName = (pathId) => {
    return travelMaps[pathId]?.name || pathId
  }

  const getPathDescription = (pathId) => {
    return travelMaps[pathId]?.description || ''
  }

  // Calculate branch point for paths with 3+ points
  const calculateBranchPoint = (points) => {
    if (points.length < 3) return null
    
    // Find the point that's most central or use the first point as the "trunk"
    const trunkPoint = points[0]
    const branchPoints = points.slice(1)
    
    // Calculate average position of branch points
    const avgX = branchPoints.reduce((sum, p) => sum + p.x, 0) / branchPoints.length
    const avgY = branchPoints.reduce((sum, p) => sum + p.y, 0) / branchPoints.length
    
    // Branch point is halfway between trunk and average of branches
    return {
      x: (trunkPoint.x + avgX) / 2,
      y: (trunkPoint.y + avgY) / 2,
    }
  }

  const availablePaths = getAvailablePaths()

  return (
    <div className="overworld-map">
      <h2>Overworld Map</h2>
      <div className="current-point-info">
        <p>Current Point: <strong>{overworldMap.points[currentPoint]?.label}</strong></p>
        <p className="hint">Click on a path to begin traveling</p>
      </div>
      <div className="map-container">
        <svg className="map-svg" viewBox="0 0 600 350">
          {/* Draw paths */}
          {overworldMap.paths.map((path) => {
            const isAvailable = path.connectedPoints.includes(currentPoint)
            const pathPoints = path.connectedPoints.map(id => overworldMap.points[id])
            
            if (pathPoints.length === 2) {
              // Simple two-point path - draw a line
              const [p1, p2] = pathPoints
              const midX = (p1.x + p2.x) / 2
              const midY = (p1.y + p2.y) / 2
              
              return (
                <g key={path.pathId}>
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    className={`connection-line ${isAvailable ? 'available' : ''}`}
                  />
                  {isAvailable && (
                    <>
                      <line
                        x1={p1.x}
                        y1={p1.y}
                        x2={p2.x}
                        y2={p2.y}
                        className="path-clickable"
                        onClick={() => handlePathClick(path)}
                      />
                      <g>
                        <rect
                          x={midX - 60}
                          y={midY - 15}
                          width={120}
                          height={30}
                          className="path-label-bg"
                          onClick={() => handlePathClick(path)}
                        />
                        <text
                          x={midX}
                          y={midY + 5}
                          textAnchor="middle"
                          className="path-label"
                          onClick={() => handlePathClick(path)}
                        >
                          {getPathName(path.pathId)}
                        </text>
                      </g>
                    </>
                  )}
                </g>
              )
            } else {
              // Branching path - draw trunk to branch point, then branches
              const branchPoint = calculateBranchPoint(pathPoints)
              if (!branchPoint) return null
              
              // Use first point as trunk, rest as branches
              const trunkPoint = pathPoints[0]
              const branchPoints = pathPoints.slice(1)
              
              return (
                <g key={path.pathId}>
                  {/* Trunk line from first point to branch point */}
                  <line
                    x1={trunkPoint.x}
                    y1={trunkPoint.y}
                    x2={branchPoint.x}
                    y2={branchPoint.y}
                    className={`connection-line ${isAvailable ? 'available' : ''}`}
                  />
                  
                  {/* Branch lines from branch point to each destination */}
                  {branchPoints.map((branchDest) => (
                    <line
                      key={`${path.pathId}-branch-${branchDest.id}`}
                      x1={branchPoint.x}
                      y1={branchPoint.y}
                      x2={branchDest.x}
                      y2={branchDest.y}
                      className={`connection-line ${isAvailable ? 'available' : ''}`}
                    />
                  ))}
                  
                  {/* Clickable area covering the entire path */}
                  {isAvailable && (
                    <>
                      <line
                        x1={trunkPoint.x}
                        y1={trunkPoint.y}
                        x2={branchPoint.x}
                        y2={branchPoint.y}
                        className="path-clickable"
                        onClick={() => handlePathClick(path)}
                      />
                      {branchPoints.map((branchDest) => (
                        <line
                          key={`${path.pathId}-clickable-${branchDest.id}`}
                          x1={branchPoint.x}
                          y1={branchPoint.y}
                          x2={branchDest.x}
                          y2={branchDest.y}
                          className="path-clickable"
                          onClick={() => handlePathClick(path)}
                        />
                      ))}
                      
                      {/* Path label at branch point */}
                      <g>
                        <rect
                          x={branchPoint.x - 60}
                          y={branchPoint.y - 15}
                          width={120}
                          height={30}
                          className="path-label-bg"
                          onClick={() => handlePathClick(path)}
                        />
                        <text
                          x={branchPoint.x}
                          y={branchPoint.y + 5}
                          textAnchor="middle"
                          className="path-label"
                          onClick={() => handlePathClick(path)}
                        >
                          {getPathName(path.pathId)}
                        </text>
                      </g>
                    </>
                  )}
                </g>
              )
            }
          })}

          {/* Draw points */}
          {Object.values(overworldMap.points).map((point) => {
            const isCurrent = point.id === currentPoint
            return (
              <g key={point.id}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={20}
                  className={`map-point ${isCurrent ? 'current' : ''}`}
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

      {/* List of available paths */}
      {availablePaths.length > 0 && (
        <div className="available-paths-list">
          <h3>Available Paths:</h3>
          <div className="paths-grid">
            {availablePaths.map((path) => {
              const pathData = travelMaps[path.pathId]
              const otherPoints = path.connectedPoints.filter(p => p !== currentPoint)
              return (
                <div
                  key={path.pathId}
                  className="path-card"
                  onClick={() => handlePathClick(path)}
                >
                  <h4>{pathData?.name || path.pathId}</h4>
                  <p className="path-card-description">{pathData?.description || ''}</p>
                  <p className="path-card-destination">
                    Connected to: {otherPoints.map(id => overworldMap.points[id]?.label).join(', ')}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default OverworldMap
