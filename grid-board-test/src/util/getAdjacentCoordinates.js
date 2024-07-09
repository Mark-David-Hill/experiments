export default function getAdjacentCoordinates(
  sourceCoordinates,
  rowCount,
  colCount
) {
  const [rowIndex, colIndex] = sourceCoordinates;

  let adjacentCoordinates = [];

  if (rowIndex - 1 >= 0) {
    adjacentCoordinates.push([rowIndex - 1, colIndex]);
  }
  if (rowIndex + 1 <= rowCount - 1) {
    adjacentCoordinates.push([rowIndex + 1, colIndex]);
  }
  if (colIndex - 1 >= 0) {
    adjacentCoordinates.push([rowIndex, colIndex - 1]);
  }
  if (colIndex + 1 <= colCount - 1) {
    adjacentCoordinates.push([rowIndex, colIndex + 1]);
  }

  return adjacentCoordinates;
}
