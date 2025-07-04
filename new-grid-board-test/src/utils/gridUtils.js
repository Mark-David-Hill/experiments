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

export function getMainDiagonals(gridData) {
  const rowCount = gridData.length;
  const colCount = gridData[0].length;
  const mainDiagonalCoordinates = [];

  for (let i = 0; i < rowCount; i++) {
    const lineCoordinates = [];
    let rowIndex = i;
    let colIndex = 0;
    while (rowIndex <= rowCount - 1 && colIndex <= colCount - 1) {
      lineCoordinates.push([rowIndex, colIndex]);
      rowIndex++;
      colIndex++;
    }
    mainDiagonalCoordinates.push(lineCoordinates);
  }

  for (let i = 1; i < colCount; i++) {
    const lineCoordinates = [];
    let rowIndex = 0;
    let colIndex = i;

    while (rowIndex <= rowCount - 1 && colIndex <= colCount - 1) {
      console.log("Coordinates", rowIndex, colIndex);
      lineCoordinates.push([rowIndex, colIndex]);
      rowIndex++;
      colIndex++;
    }
    mainDiagonalCoordinates.push(lineCoordinates);
  }

  return mainDiagonalCoordinates;
}

export function getReverseDiagonals(gridData) {
  const rowCount = gridData.length;
  const colCount = gridData[0].length;
  const reverseDiagonalCoordinates = [];

  // Start from top row, moving leftward from rightmost column
  for (let i = 0; i < rowCount; i++) {
    const lineCoordinates = [];
    let rowIndex = i;
    let colIndex = colCount - 1;
    while (rowIndex <= rowCount - 1 && colIndex >= 0) {
      lineCoordinates.push([rowIndex, colIndex]);
      rowIndex++;
      colIndex--;
    }
    if (lineCoordinates.length >= 3) {
      reverseDiagonalCoordinates.push(lineCoordinates);
    }
  }

  // Start from rightmost column, moving downward from top
  for (let i = colCount - 2; i >= 0; i--) {
    const lineCoordinates = [];
    let rowIndex = 0;
    let colIndex = i;
    while (rowIndex <= rowCount - 1 && colIndex >= 0) {
      lineCoordinates.push([rowIndex, colIndex]);
      rowIndex++;
      colIndex--;
    }
    if (lineCoordinates.length >= 3) {
      reverseDiagonalCoordinates.push(lineCoordinates);
    }
  }

  return reverseDiagonalCoordinates;
}

// New functions to check for wins and return winning cells
export function checkRowWin(gridData, targetText) {
  for (let rowIndex = 0; rowIndex < gridData.length; rowIndex++) {
    const row = gridData[rowIndex];
    if (row.every((cell) => cell.text === targetText)) {
      const winningCells = row.map((_, colIndex) => [rowIndex, colIndex]);
      return { isWin: true, winningCells };
    }
  }
  return { isWin: false, winningCells: [] };
}

export function checkColWin(gridData, targetText) {
  const colCount = gridData[0].length;
  for (let colIndex = 0; colIndex < colCount; colIndex++) {
    const col = gridData.map((row) => row[colIndex]);
    if (col.every((cell) => cell.text === targetText)) {
      const winningCells = col.map((_, rowIndex) => [rowIndex, colIndex]);
      return { isWin: true, winningCells };
    }
  }
  return { isWin: false, winningCells: [] };
}

export function checkDiagonalWin(gridData, targetText) {
  const mainDiagonals = getMainDiagonals(gridData).filter(
    (d) => d.length === gridData.length
  );
  const reverseDiagonals = getReverseDiagonals(gridData).filter(
    (d) => d.length === gridData.length
  );
  const allDiagonals = [...mainDiagonals, ...reverseDiagonals];

  for (let i = 0; i < allDiagonals.length; i++) {
    const currentCoordinates = allDiagonals[i];
    const lineCells = currentCoordinates.map(
      ([row, col]) => gridData[row][col]
    );
    if (lineCells.every((cell) => cell.text === targetText)) {
      return { isWin: true, winningCells: currentCoordinates };
    }
  }
  return { isWin: false, winningCells: [] };
}

export function getNextPosition(currentPosition, direction, gridSize) {
  const [row, col] = currentPosition;
  let newRow = row;
  let newCol = col;

  switch (direction) {
    case "UP":
      newRow = row - 1;
      break;
    case "DOWN":
      newRow = row + 1;
      break;
    case "LEFT":
      newCol = col - 1;
      break;
    case "RIGHT":
      newCol = col + 1;
      break;
    default:
      break;
  }

  return [newRow, newCol];
}

export function isValidPosition(position, gridSize) {
  const [row, col] = position;
  return row >= 0 && row < gridSize && col >= 0 && col < gridSize;
}

export function wrapPosition(position, gridSize) {
  let [row, col] = position;

  if (row < 0) row = gridSize - 1;
  if (row >= gridSize) row = 0;
  if (col < 0) col = gridSize - 1;
  if (col >= gridSize) col = 0;

  return [row, col];
}

export function getDirectionRotation(direction) {
  const rotations = {
    UP: 0,
    RIGHT: 90,
    DOWN: 180,
    LEFT: 270,
  };
  return rotations[direction] || 0;
}
