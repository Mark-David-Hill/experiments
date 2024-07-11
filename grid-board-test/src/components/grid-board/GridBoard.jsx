import React from "react";

import GridRow from "./GridRow";

export function GridBoard({ gridData, onCellClick }) {
  const rowCount = gridData.length;
  const colCount = gridData[0].length;

  return (
    <div>
      {gridData &&
        gridData.map((row, rowIndex) => {
          return (
            <GridRow
              key={rowIndex}
              rowData={row}
              rowIndex={rowIndex}
              onCellClick={onCellClick}
            />
          );
        })}
    </div>
  );
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
