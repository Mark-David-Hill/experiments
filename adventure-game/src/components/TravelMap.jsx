import { useState, useEffect } from 'react'
import './TravelMap.css'
import { overworldMap } from '../data/overworldMap'
import { travelMaps, NODE_TYPES } from '../data/travelMaps'
import { testCards } from '../data/testCards'
import Card from './Card'

// Set to true to use the node-based travel map; false for the card-based approach
const USE_NODE_BASED_TRAVEL_MAP = false

const CARD_ROWS = 3
const CARD_SPOTS_PER_ROW = 6

function TravelMap({ pathId, connection, onReturn, onArrive, onTimeAdvance }) {
  const [currentNodeId, setCurrentNodeId] = useState(null)
  const [pathData, setPathData] = useState(null)

  // Card-based state: placed cards keyed by "row-index", hand = remaining card ids
  const [placedCards, setPlacedCards] = useState({})
  const [hand, setHand] = useState(() => testCards.map(c => c.id))
  const [selectedCardId, setSelectedCardId] = useState(null)

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
    // Only advance time if actually moving to a different node
    if (nodeId !== currentNodeId && onTimeAdvance) {
      onTimeAdvance()
    }
    setCurrentNodeId(nodeId)
  }

  const handleExitClick = (overworldPoint) => {
    // Exit to overworld at this point
    if (onArrive) {
      onArrive(overworldPoint)
    }
  }

  const getSpotKey = (rowIndex, spotIndex) => `${rowIndex}-${spotIndex}`

  const handleSpotClick = (rowIndex, spotIndex) => {
    const key = getSpotKey(rowIndex, spotIndex)
    if (selectedCardId) {
      const cardInSpot = placedCards[key]
      setPlacedCards(prev => ({ ...prev, [key]: testCards.find(c => c.id === selectedCardId) }))
      setHand(prev => prev.filter(id => id !== selectedCardId))
      if (cardInSpot) setHand(prev => [...prev, cardInSpot.id])
      setSelectedCardId(null)
    } else if (placedCards[key]) {
      setHand(prev => [...prev, placedCards[key].id])
      setPlacedCards(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  const handleCardInHandClick = (cardId) => {
    setSelectedCardId(prev => prev === cardId ? null : cardId)
  }

  if (!pathData) {
    return <div className="loading">Loading...</div>
  }

  if (!USE_NODE_BASED_TRAVEL_MAP) {
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

        <div className="travel-content travel-content-cards">
          <div className="card-rows">
            {Array.from({ length: CARD_ROWS }, (_, rowIndex) => (
              <div key={rowIndex} className="card-row">
                <span className="card-row-label">Row {rowIndex + 1}</span>
                <div className="card-spots">
                  {Array.from({ length: CARD_SPOTS_PER_ROW }, (_, spotIndex) => {
                    const key = getSpotKey(rowIndex, spotIndex)
                    const card = placedCards[key]
                    return (
                      <div
                        key={spotIndex}
                        className={`card-spot ${card ? 'filled' : ''} ${selectedCardId ? 'can-place' : ''}`}
                        onClick={() => handleSpotClick(rowIndex, spotIndex)}
                      >
                        {card ? <Card card={card} /> : <span className="card-spot-empty">+</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="card-hand">
            <h3>Your cards</h3>
            <p className="card-hand-hint">Click a card to select it, then click a spot to play it. Click a placed card to return it to hand.</p>
            <div className="card-hand-list">
              {hand.map(cardId => {
                const card = testCards.find(c => c.id === cardId)
                if (!card) return null
                return (
                  <div
                    key={card.id}
                    className={`card-hand-card ${selectedCardId === card.id ? 'selected' : ''}`}
                    onClick={() => handleCardInHandClick(card.id)}
                  >
                    <Card card={card} />
                  </div>
                )
              })}
            </div>
          </div>

          <div className="travel-exit-section">
            <h3>Exit to overworld</h3>
            <div className="travel-exit-buttons">
              {pathData.connectedPoints.map(pointId => (
                <button
                  key={pointId}
                  className="travel-exit-btn"
                  onClick={() => handleExitClick(pointId)}
                >
                  {overworldMap.points[pointId]?.label}
                </button>
              ))}
            </div>
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

  if (!currentNode) {
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
    
    const rangeX = maxX - minX || 1
    const rangeY = maxY - minY || 1
    
    // Normalize function to convert overworld coords to 0-100 scale
    const normalizeX = (x) => {
      if (rangeX === 0) return 50 // Center if no range
      return 15 + ((x - minX) / rangeX) * 70
    }
    const normalizeY = (y) => {
      if (rangeY === 0) return 50 // Center if no range
      return 15 + ((y - minY) / rangeY) * 70
    }
    
    if (connectedPoints.length === 2) {
      // Simple two-point path - use overworld coordinates to preserve path angle
      const [point1, point2] = connectedPoints
      const node1 = destinationNodes.find(n => n.overworldPoint === point1)
      const node2 = destinationNodes.find(n => n.overworldPoint === point2)
      const coord1 = overworldMap.points[point1]
      const coord2 = overworldMap.points[point2]
      
      // Position endpoints using normalized overworld coords (preserves diagonal/horizontal)
      const x1 = normalizeX(coord1.x)
      const y1 = normalizeY(coord1.y)
      const x2 = normalizeX(coord2.x)
      const y2 = normalizeY(coord2.y)
      
      // Ensure minimum spacing between nodes along the line
      const totalNodes = 2 + regularNodes.length
      const lineLength = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
      const minSpacing = 20
      const minLineLength = minSpacing * (totalNodes - 1)
      
      let startX = x1, startY = y1, endX = x2, endY = y2
      if (lineLength < minLineLength && lineLength > 0) {
        // Stretch the line to meet minimum spacing while keeping the same angle
        const scale = minLineLength / lineLength
        const midX = (x1 + x2) / 2
        const midY = (y1 + y2) / 2
        const half = minLineLength / 2
        const angle = Math.atan2(y2 - y1, x2 - x1)
        startX = midX - half * Math.cos(angle)
        startY = midY - half * Math.sin(angle)
        endX = midX + half * Math.cos(angle)
        endY = midY + half * Math.sin(angle)
      }
      
      positions[node1.id] = { x: startX, y: startY }
      positions[node2.id] = { x: endX, y: endY }
      
      // Place regular nodes evenly along the line between endpoints
      regularNodes.forEach((node, idx) => {
        const t = (idx + 1) / (totalNodes - 1)
        positions[node.id] = {
          x: startX + (endX - startX) * t,
          y: startY + (endY - startY) * t
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
      // First, find if there's a junction/center node (connected to multiple destinations)
      const junctionNode = regularNodes.find(node => {
        const nodeConnections = pathData.nodes.find(n => n.id === node.id)?.connections || []
        return nodeConnections.length >= 3 // Junction connects to 3+ nodes
      })
      
      const otherRegularNodes = regularNodes.filter(node => node.id !== junctionNode?.id)
      
      // Place junction at the calculated branch point
      if (junctionNode) {
        positions[junctionNode.id] = {
          x: normalizeX(branchPointX),
          y: normalizeY(branchPointY),
        }
      }
      
      // Place other regular nodes along their respective paths
      otherRegularNodes.forEach((node) => {
        const nodeData = pathData.nodes.find(n => n.id === node.id)
        const nodeConnections = nodeData?.connections || []
        
        // Find which destination this node connects to
        const connectedDest = destinationNodes.find(dest => 
          nodeConnections.includes(dest.id)
        )
        
        if (connectedDest) {
          const destCoord = overworldMap.points[connectedDest.overworldPoint]
          const destPos = positions[connectedDest.id]
          
          // Place node between its destination and the junction (or branch point)
          const t = 0.6 // Closer to destination
          if (junctionNode) {
            const junctionPos = positions[junctionNode.id]
            positions[node.id] = {
              x: destPos.x + (junctionPos.x - destPos.x) * (1 - t),
              y: destPos.y + (junctionPos.y - destPos.y) * (1 - t),
            }
          } else {
            // No junction, place between destination and calculated branch point
            positions[node.id] = {
              x: destPos.x + (normalizeX(branchPointX) - destPos.x) * (1 - t),
              y: destPos.y + (normalizeY(branchPointY) - destPos.y) * (1 - t),
            }
          }
        } else {
          // Fallback: place between trunk and branch point
          const t = 0.5
          positions[node.id] = {
            x: normalizeX(trunkCoord.x) + (normalizeX(branchPointX) - normalizeX(trunkCoord.x)) * t,
            y: normalizeY(trunkCoord.y) + (normalizeY(branchPointY) - normalizeY(trunkCoord.y)) * t,
          }
        }
      })
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
                    y={pos.y - 12}
                    textAnchor="middle"
                    className="node-label"
                    fontSize="2.8"
                  >
                    {node.description}
                  </text>
                  
                  {/* Exit button for destination nodes - only when you're actually at this node */}
                  {node.type === NODE_TYPES.DESTINATION && isCurrent && (() => {
                    // Default button area: below node at (pos.x, pos.y + 20) with ~20 unit radius
                    const defaultButtonCenterY = pos.y + 20
                    const defaultButtonCenterX = pos.x
                    
                    // Check if any node would overlap with the default button area (below)
                    const nodeInButtonAreaBelow = pathData.nodes.find(otherNode => {
                      if (otherNode.id === node.id) return false
                      const otherPos = nodePositions[otherNode.id]
                      if (!otherPos) return false
                      const dist = Math.sqrt(
                        (otherPos.x - defaultButtonCenterX) ** 2 +
                        (otherPos.y - defaultButtonCenterY) ** 2
                      )
                      return dist < 22
                    })
                    
                    // ViewBox is 0 0 100 100; button height 20 - avoid cut-off at bottom
                    const wouldBeCutOffBelow = pos.y + 30 > 100
                    const putButtonAbove = nodeInButtonAreaBelow || wouldBeCutOffBelow
                    
                    // When placing above, check if any node would overlap the "above" button area
                    const aboveButtonCenterY = pos.y - 15
                    const nodeInButtonAreaAbove = putButtonAbove && pathData.nodes.some(otherNode => {
                      if (otherNode.id === node.id) return false
                      const otherPos = nodePositions[otherNode.id]
                      if (!otherPos) return false
                      const dist = Math.sqrt(
                        (otherPos.x - pos.x) ** 2 +
                        (otherPos.y - aboveButtonCenterY) ** 2
                      )
                      return dist < 22
                    })
                    
                    // Use side position when button would overlap a node (below or above)
                    const useSidePosition = nodeInButtonAreaBelow || nodeInButtonAreaAbove
                    
                    // If we'd put button above but node is near top, button would be cut off (viewBox y 0-100)
                    const wouldBeCutOffAbove = putButtonAbove && pos.y - 25 < 0
                    
                    // When using side position, pick the side that does NOT have the connected node(s)
                    let buttonX = pos.x - 20
                    if (useSidePosition || wouldBeCutOffAbove) {
                      const connectedPositions = (currentNode?.connections || [])
                        .map(id => nodePositions[id])
                        .filter(Boolean)
                      const avgConnectedX = connectedPositions.length
                        ? connectedPositions.reduce((sum, p) => sum + p.x, 0) / connectedPositions.length
                        : pos.x
                      // Place button on the opposite side of connected nodes
                      // Button width 40: place with small gap from node (12 units)
                      buttonX = avgConnectedX < pos.x ? pos.x + 12 : pos.x - 52
                    }
                    
                    // Y: if would be cut off above, place to side vertically centered; else above or below
                    let buttonY = pos.y + 10
                    if (putButtonAbove && !wouldBeCutOffAbove) {
                      buttonY = pos.y - 25
                    } else if (wouldBeCutOffAbove) {
                      buttonY = pos.y - 10 // Vertically centered on node so button stays in view
                    }
                    
                    return (
                      <foreignObject
                        x={buttonX}
                        y={buttonY}
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
                    )
                  })()}
                </g>
              )
            })}
          </svg>
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
