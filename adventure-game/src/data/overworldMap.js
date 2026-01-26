// Overworld map data structure
// Points are connected to each other, forming paths
export const overworldMap = {
  points: {
    a: { id: 'a', x: 100, y: 100, label: 'Point A' },
    b: { id: 'b', x: 300, y: 100, label: 'Point B' },
    c: { id: 'c', x: 500, y: 100, label: 'Point C' },
    d: { id: 'd', x: 200, y: 250, label: 'Point D' },
    e: { id: 'e', x: 400, y: 250, label: 'Point E' },
  },
  // Connections represent paths between points
  // Each connection has a unique pathId for the travel map
  connections: [
    { from: 'a', to: 'b', pathId: 'a-to-b' },
    { from: 'a', to: 'd', pathId: 'a-to-d' },
    { from: 'b', to: 'c', pathId: 'b-to-c' },
    { from: 'b', to: 'e', pathId: 'b-to-e' },
    { from: 'c', to: 'e', pathId: 'c-to-e' },
    { from: 'd', to: 'e', pathId: 'd-to-e' },
  ],
}
