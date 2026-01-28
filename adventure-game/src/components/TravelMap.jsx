import { useState, useEffect } from 'react'
import './TravelMap.css'
import { overworldMap } from '../data/overworldMap'
import { travelMaps, NODE_TYPES } from '../data/travelMaps'

function TravelMap({ pathId, connection, onReturn, onArrive }) {
  const [currentNodeId, setCurrentNodeId] = useState(null)
  const [pathData, setPathData] = useState(null)

  useEffect(() => {
    if (pathId) {
      const path = travelMaps[pathId]
      setPathData(path)
      // Start at the destination node matching the entry point
      const startNode = path.nodes.find(
        (n) => n.type === NODE_TYPES.DESTINATION && n.overworldPoint === connection.from
      )
      if (startNode) {
        setCurrentNodeId(startNode.id)
      }
    }
  }, [pathId, connection])

  const currentNode = pathData?.nodes.find((n) => n.id === currentNodeId)
  const connectedNodes = currentNode
    ? pathData.nodes.filter((n) => currentNode.connections.includes(n.id))
    : []

  const handleNodeClick = (nodeId) => {
    setCurrentNodeId(nodeId)
  }

  const handleExitClick = (overworldPoint) => {
    // Exit to overworld at this point
    if (onArrive) {
      onArrive(overworldPoint)
    }
  }

  if (!pathData || !currentNode) {
    return <div className="loading">Loading...</div>
  }

  // Layout algorithm that matches overworld path shapes using actual overworld coordinates
  const getNodePositions = () => {
    const positions = {}
    const destinationNodes = pathData.nodes.filter(n => n.type === NODE_TYPES.DESTINATION)
    const regularNodes = pathData.nodes.filter(n => n.type !== NODE_TYPES.DESTINATION)
    const connectedPoints = pathData.connectedPoints
    
    // Get overworld coordinates for connected points
    const overworldCoords = connectedPoints.map(id => ({
      id,
      ...overworldMap.points[id]
    }))
    
    // Find min/max for normalization to 0-100 scale
    const minX = Math.min(...overworldCoords.map(p => p.x))
    const maxX = Math.max(...overworldCoords.map(p => p.x))
    const minY = Math.min(...overworldCoords.map(p => p.y))
    const maxY = Math.max(...overworldCoords.map(p => p.y))
    
    // Add padding
    const rangeX = maxX - minX || 1
    const rangeY = maxY - minY || 1
    const padding = Math.max(rangeX, rangeY) * 0.2
    
    // Normalize function to convert overworld coords to 0-100 scale
    const normalizeX = (x) => {
      return 10 + ((x - minX + padding) / (rangeX + padding * 2)) * 80
    }
    const normalizeY = (y) => {
      return 10 + ((y - minY + padding) / (rangeY + padding * 2)) * 80
    }
    
    if (connectedPoints.length === 2) {
      // Simple two-point path - use overworld positions
      const [point1, point2] = connectedPoints
      const node1 = destinationNodes.find(n => n.overworldPoint === point1)
      const node2 = destinationNodes.find(n => n.overworldPoint === point2)
      const coord1 = overworldMap.points[point1]
      const coord2 = overworldMap.points[point2]
      
      positions[node1.id] = { x: normalizeX(coord1.x), y: normalizeY(coord1.y) }
      positions[node2.id] = { x: normalizeX(coord2.x), y: normalizeY(coord2.y) }
      
      // Place regular nodes in between
      regularNodes.forEach((node, idx) => {
        const t = (idx + 1) / (regularNodes.length + 1)
        positions[node.id] = {
          x: normalizeX(coord1.x) + (normalizeX(coord2.x) - normalizeX(coord1.x)) * t,
          y: normalizeY(coord1.y) + (normalizeY(coord2.y) - normalizeY(coord1.y)) * t,
        }
      })
    } else if (connectedPoints.length === 3) {
      // Branching path - use overworld positions to calculate branch point
      const [trunkPoint, ...branchPoints] = connectedPoints
      const trunkNode = destinationNodes.find(n => n.overworldPoint === trunkPoint)
      const trunkCoord = overworldMap.points[trunkPoint]
      
      // Position trunk node using overworld coordinates
      positions[trunkNode.id] = { x: normalizeX(trunkCoord.x), y: normalizeY(trunkCoord.y) }
      
      // Position branch destination nodes using overworld coordinates
      branchPoints.forEach((point) => {
        const branchNode = destinationNodes.find(n => n.overworldPoint === point)
        const branchCoord = overworldMap.points[point]
        positions[branchNode.id] = {
          x: normalizeX(branchCoord.x),
          y: normalizeY(branchCoord.y),
        }
      })
      
      // Calculate branch point (where paths split) - same logic as overworld
      const branchCoords = branchPoints.map(id => overworldMap.points[id])
      const avgX = branchCoords.reduce((sum, p) => sum + p.x, 0) / branchCoords.length
      const avgY = branchCoords.reduce((sum, p) => sum + p.y, 0) / branchCoords.length
      const branchPointX = (trunkCoord.x + avgX) / 2
      const branchPointY = (trunkCoord.y + avgY) / 2
      
      // Place regular nodes
      if (regularNodes.length === 1) {
        // Single center node at calculated branch point
        positions[regularNodes[0].id] = {
          x: normalizeX(branchPointX),
          y: normalizeY(branchPointY),
        }
      } else {
        // Multiple regular nodes - distribute along paths
        regularNodes.forEach((node, idx) => {
          if (idx === 0) {
            // First node between trunk and branch point
            const t = 0.5
            positions[node.id] = {
              x: normalizeX(trunkCoord.x) + (normalizeX(branchPointX) - normalizeX(trunkCoord.x)) * t,
              y: normalizeY(trunkCoord.y) + (normalizeY(branchPointY) - normalizeY(trunkCoord.y)) * t,
            }
          } else {
            // Other nodes along branches
            const branchIdx = (idx - 1) % branchPoints.length
            const branchPoint = branchPoints[branchIdx]
            const branchCoord = overworldMap.points[branchPoint]
            const t = 0.5
            positions[node.id] = {
              x: normalizeX(branchPointX) + (normalizeX(branchCoord.x) - normalizeX(branchPointX)) * t,
              y: normalizeY(branchPointY) + (normalizeY(branchCoord.y) - normalizeY(branchPointY)) * t,
            }
          }
        })
      }
    }
    
    return positions
  }

  const nodePositions = getNodePositions()

  return (
    <div className="travel-map">
      <div className="travel-header">
        <h2>Travel Map</h2>
        <p className="path-info">{pathData.name}</p>
        <p className="path-description">{pathData.description}</p>
        <p className="entry-info">
          Entered from: <strong>{overworldMap.points[connection.from]?.label}</strong>
        </p>
      </div>

      <div className="travel-content">
        <div className="current-node-info">
          <h3>Current Location</h3>
          <p className="node-description">{currentNode.description}</p>
          {currentNode.type === NODE_TYPES.DESTINATION && (
            <p className="destination-badge">
              Overworld Point: {overworldMap.points[currentNode.overworldPoint]?.label}
            </p>
          )}
        </div>

        <div className="path-visualization">
          <svg className="path-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
            {/* Draw connections */}
            {pathData.nodes.map((node) => {
              const nodePos = nodePositions[node.id]
              if (!nodePos) return null
              
              return node.connections.map((connectedId) => {
                const connectedPos = nodePositions[connectedId]
                if (!connectedPos) return null
                
                const isPathToCurrent = connectedId === currentNodeId || node.id === currentNodeId
                
                return (
                  <line
                    key={`${node.id}-${connectedId}`}
                    x1={nodePos.x}
                    y1={nodePos.y}
                    x2={connectedPos.x}
                    y2={connectedPos.y}
                    className={`path-connection ${isPathToCurrent ? 'active-path' : ''}`}
                    strokeWidth={isPathToCurrent ? 2 : 1}
                  />
                )
              })
            })}

            {/* Draw nodes */}
            {pathData.nodes.map((node) => {
              const pos = nodePositions[node.id]
              if (!pos) return null
              
              const isCurrent = node.id === currentNodeId
              const isConnected = currentNode?.connections.includes(node.id)
              
              return (
                <g key={node.id}>
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={isCurrent ? 5 : node.type === NODE_TYPES.DESTINATION ? 4 : 3}
                    className={`travel-node ${
                      isCurrent ? 'current' : ''
                    } ${node.type === NODE_TYPES.DESTINATION ? 'destination' : ''} ${
                      isConnected ? 'connected' : ''
                    }`}
                    onClick={() => isConnected && handleNodeClick(node.id)}
                    style={{ cursor: isConnected ? 'pointer' : 'default' }}
                  />
                  <text
                    x={pos.x}
                    y={pos.y - 8}
                    textAnchor="middle"
                    className="node-label"
                    fontSize="3"
                  >
                    {node.type === NODE_TYPES.DESTINATION 
                      ? overworldMap.points[node.overworldPoint]?.label 
                      : node.id}
                  </text>
                  
                  {/* Exit button for destination nodes - only when you're actually at this node */}
                  {node.type === NODE_TYPES.DESTINATION && isCurrent && (
                    <foreignObject
                      x={pos.x - 20}
                      y={pos.y + 10}
                      width="40"
                      height="20"
                    >
                      <div className="svg-exit-button-container">
                        <button
                          onClick={() => handleExitClick(node.overworldPoint)}
                          className="svg-exit-button current-exit"
                        >
                          <span className="svg-exit-label">Exit</span>
                        </button>
                      </div>
                    </foreignObject>
                  )}
                </g>
              )
            })}
          </svg>
        </div>

        <div className="available-moves">
          <h3>Available Moves</h3>
          {connectedNodes.length > 0 ? (
            <div className="move-buttons">
              {connectedNodes.map((node) => (
                <button
                  key={node.id}
                  onClick={() => handleNodeClick(node.id)}
                  className={`move-button ${
                    node.type === NODE_TYPES.DESTINATION ? 'destination-button' : ''
                  }`}
                >
                  <span className="move-label">{node.description}</span>
                  {node.type === NODE_TYPES.DESTINATION && (
                    <span className="move-destination">
                      → {overworldMap.points[node.overworldPoint]?.label}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p>No available moves</p>
          )}
        </div>

        {/* Gameplay area */}
        <div className="gameplay-area">
          <p>Gameplay area - cards and encounters will appear here</p>
        </div>
      </div>

      <div className="travel-controls">
        <button onClick={onReturn} className="return-button">
          Return to Overworld (without exiting)
        </button>
      </div>
    </div>
  )
}

export default TravelMap
