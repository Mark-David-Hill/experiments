export function initializeGridData(rowCount, colCount, cellData) {
  return Array.from({ length: rowCount }, () =>
    Array.from({ length: colCount }, () => cellData)
  );
}

export function updatedBoardCell(gridData, cellToUpdate, newCellData) {
  const newGridData = gridData.map((row, rowId) =>
    row.map((cell, cellId) => {
      if (cellToUpdate[0] === rowId && cellToUpdate[1] === cellId) {
        return newCellData;
      }
      return cell;
    })
  );

  return newGridData;
}

export function getAdjacentCoordinates(
  [rowIndex, colIndex],
  rowCount,
  colCount
) {
  const directionShifts = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  return directionShifts
    .map(([rowShift, colShift]) => [rowIndex + rowShift, colIndex + colShift])
    .filter(([r, c]) => r >= 0 && r < rowCount && c >= 0 && c < colCount);
}
