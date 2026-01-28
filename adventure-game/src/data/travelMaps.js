// Travel maps with interactive nodes
// Paths connect multiple overworld points - you can enter from any point and exit to any connected point
// All movement is bidirectional

export const NODE_TYPES = {
  REGULAR: 'regular',      // Normal path node
  DESTINATION: 'destination', // Overworld point - you can exit here
}

// Travel map data structure
// Each path has nodes that connect to each other
// Destination nodes represent overworld points you can exit to
export const travelMaps = {
  'a-b': {
    pathId: 'a-b',
    connectedPoints: ['a', 'b'],
    name: 'Forest Path',
    description: 'A winding forest path',
    nodes: [
      { 
        id: 'a', 
        type: NODE_TYPES.DESTINATION, 
        overworldPoint: 'a',
        description: 'Point A',
        connections: ['node1'],
      },
      { 
        id: 'node1', 
        type: NODE_TYPES.REGULAR, 
        description: 'Deep in the woods',
        connections: ['a', 'node2'],
      },
      { 
        id: 'node2', 
        type: NODE_TYPES.REGULAR, 
        description: 'Forest clearing',
        connections: ['node1', 'b'],
      },
      { 
        id: 'b', 
        type: NODE_TYPES.DESTINATION, 
        overworldPoint: 'b',
        description: 'Point B',
        connections: ['node2'],
      },
    ],
  },
  'a-d': {
    pathId: 'a-d',
    connectedPoints: ['a', 'd'],
    name: 'Mountain Trail',
    description: 'A rocky mountain trail',
    nodes: [
      { 
        id: 'a', 
        type: NODE_TYPES.DESTINATION, 
        overworldPoint: 'a',
        description: 'Point A',
        connections: ['node1'],
      },
      { 
        id: 'node1', 
        type: NODE_TYPES.REGULAR, 
        description: 'Base of the mountain',
        connections: ['a', 'node2'],
      },
      { 
        id: 'node2', 
        type: NODE_TYPES.REGULAR, 
        description: 'Steep climb',
        connections: ['node1', 'node3'],
      },
      { 
        id: 'node3', 
        type: NODE_TYPES.REGULAR, 
        description: 'Mountain pass',
        connections: ['node2', 'd'],
      },
      { 
        id: 'd', 
        type: NODE_TYPES.DESTINATION, 
        overworldPoint: 'd',
        description: 'Point D',
        connections: ['node3'],
      },
    ],
  },
  'b-c-e': {
    pathId: 'b-c-e',
    connectedPoints: ['b', 'c', 'e'], // ONE path connecting all three
    name: 'Desert Crossing',
    description: 'A desert crossing with multiple routes',
    nodes: [
      { 
        id: 'b', 
        type: NODE_TYPES.DESTINATION, 
        overworldPoint: 'b',
        description: 'Point B',
        connections: ['center'],
      },
      { 
        id: 'c', 
        type: NODE_TYPES.DESTINATION, 
        overworldPoint: 'c',
        description: 'Point C',
        connections: ['center'],
      },
      { 
        id: 'e', 
        type: NODE_TYPES.DESTINATION, 
        overworldPoint: 'e',
        description: 'Point E',
        connections: ['center'],
      },
      { 
        id: 'center', 
        type: NODE_TYPES.REGULAR, 
        description: 'Desert crossroads',
        connections: ['b', 'c', 'e'], // Connected to all three destinations
      },
    ],
  },
  'b-d-e': {
    pathId: 'b-d-e',
    connectedPoints: ['b', 'd', 'e'], // D connects to B and E
    name: 'River Valley',
    description: 'A river valley network',
    nodes: [
      { 
        id: 'b', 
        type: NODE_TYPES.DESTINATION, 
        overworldPoint: 'b',
        description: 'Point B',
        connections: ['river1'],
      },
      { 
        id: 'd', 
        type: NODE_TYPES.DESTINATION, 
        overworldPoint: 'd',
        description: 'Point D',
        connections: ['river2'],
      },
      { 
        id: 'e', 
        type: NODE_TYPES.DESTINATION, 
        overworldPoint: 'e',
        description: 'Point E',
        connections: ['river3'],
      },
      { 
        id: 'river1', 
        type: NODE_TYPES.REGULAR, 
        description: 'North river branch',
        connections: ['b', 'junction'],
      },
      { 
        id: 'river2', 
        type: NODE_TYPES.REGULAR, 
        description: 'South river branch',
        connections: ['d', 'junction'],
      },
      { 
        id: 'river3', 
        type: NODE_TYPES.REGULAR, 
        description: 'East river branch',
        connections: ['e', 'junction'],
      },
      { 
        id: 'junction', 
        type: NODE_TYPES.REGULAR, 
        description: 'River junction',
        connections: ['river1', 'river2', 'river3'],
      },
    ],
  },
}
