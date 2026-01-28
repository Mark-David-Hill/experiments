// Overworld map data structure
// Paths connect multiple points - you can enter from any point and exit to any connected point
export const overworldMap = {
  points: {
    a: { id: 'a', x: 100, y: 100, label: 'Point A' },
    b: { id: 'b', x: 300, y: 100, label: 'Point B' },
    c: { id: 'c', x: 500, y: 100, label: 'Point C' },
    d: { id: 'd', x: 200, y: 250, label: 'Point D' },
    e: { id: 'e', x: 400, y: 250, label: 'Point E' },
  },
  // Paths connect multiple points - you can enter from any connected point
  // and exit to any other connected point
  paths: [
    { 
      pathId: 'a-b', 
      connectedPoints: ['a', 'b'],
      name: 'Forest Path',
      description: 'A winding forest path',
    },
    { 
      pathId: 'a-d', 
      connectedPoints: ['a', 'd'],
      name: 'Mountain Trail',
      description: 'A rocky mountain trail',
    },
    { 
      pathId: 'b-c-e', 
      connectedPoints: ['b', 'c', 'e'], // ONE path connecting B, C, and E
      name: 'Desert Crossing',
      description: 'A desert crossing with multiple routes',
    },
    { 
      pathId: 'b-d-e', 
      connectedPoints: ['b', 'd', 'e'], // D connects to B and E, not C
      name: 'River Valley',
      description: 'A river valley network',
    },
  ],
}
