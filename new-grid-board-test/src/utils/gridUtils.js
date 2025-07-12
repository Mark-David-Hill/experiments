import { CellTemplate } from "../components/grid-board/GridBoard";

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

// Pathfinding utilities
export function findPath(gridData, startPos, endPos, isNavigableCallback) {
  const [startRow, startCol] = startPos;
  const [endRow, endCol] = endPos;
  const rowCount = gridData.length;
  const colCount = gridData[0].length;

  // BFS to find path
  const queue = [[startRow, startCol, [[startRow, startCol]]]];
  const visited = new Set();
  visited.add(`${startRow},${startCol}`);

  while (queue.length > 0) {
    const [row, col, path] = queue.shift();

    // Check if we reached the destination
    if (row === endRow && col === endCol) {
      return { hasPath: true, path };
    }

    // Get adjacent coordinates
    const adjacent = getAdjacentCoordinates([row, col], rowCount, colCount);

    for (const [adjRow, adjCol] of adjacent) {
      const key = `${adjRow},${adjCol}`;

      if (
        !visited.has(key) &&
        isNavigableCallback(gridData[adjRow][adjCol], adjRow, adjCol)
      ) {
        visited.add(key);
        queue.push([adjRow, adjCol, [...path, [adjRow, adjCol]]]);
      }
    }
  }

  return { hasPath: false, path: [] };
}

export function generateRandomObstacles(
  gridSize,
  numObstacles,
  excludePositions = []
) {
  const obstacles = [];
  let attempts = 0;
  const maxAttempts = 1000;

  while (obstacles.length < numObstacles && attempts < maxAttempts) {
    const obstacle = [
      Math.floor(Math.random() * gridSize),
      Math.floor(Math.random() * gridSize),
    ];

    const isExcluded = excludePositions.some(
      ([r, c]) => r === obstacle[0] && c === obstacle[1]
    );

    const isDuplicate = obstacles.some(
      ([r, c]) => r === obstacle[0] && c === obstacle[1]
    );

    if (!isExcluded && !isDuplicate) {
      obstacles.push(obstacle);
    }

    attempts++;
  }

  return obstacles;
}

export function getDirectionString(
  currentPos,
  nextPos,
  fallbackDirection = "RIGHT"
) {
  if (!currentPos || !nextPos) {
    return fallbackDirection;
  }

  const [currentRow, currentCol] = currentPos;
  const [nextRow, nextCol] = nextPos;

  const rowDiff = nextRow - currentRow;
  const colDiff = nextCol - currentCol;

  if (rowDiff < 0) return "UP";
  else if (rowDiff > 0) return "DOWN";
  else if (colDiff < 0) return "LEFT";
  else if (colDiff > 0) return "RIGHT";

  return fallbackDirection;
}

export function getFirstStepInPath(path) {
  // Returns the first step after the starting position
  if (path.length <= 1) return null;
  return path[1];
}

export function highlightPath(gridData, path, pathCellClass = "path-cell") {
  let newGrid = gridData.map((row) => row.slice());

  for (let i = 1; i < path.length - 1; i++) {
    const [row, col] = path[i];
    const cell = newGrid[row][col];
    const classes = cell.classNames || cell.classes || "";

    const newClasses = classes.includes(pathCellClass)
      ? classes
      : `${classes} ${pathCellClass}`.trim();

    // apply the new classNames
    newGrid = updatedBoardCell(
      newGrid,
      [row, col],
      new CellTemplate(
        cell.text,
        newClasses,
        cell.isExplored,
        cell.canExplore,
        cell.rotation,
        cell.isNavigable,
        cell.isStart,
        cell.isTarget,
        cell.isOnPath
      )
    );
  }

  return newGrid;
}

export function clearHighlights(gridData, pathCellClass = "path-cell") {
  let newGrid = gridData.map((row) => row.slice());

  for (let row = 0; row < newGrid.length; row++) {
    for (let col = 0; col < newGrid[row].length; col++) {
      const cell = newGrid[row][col];
      const classes = cell.classNames || cell.classes || "";

      if (classes.includes(pathCellClass)) {
        // Remove the path cell class
        const newClasses = classes
          .split(" ")
          .filter((c) => c !== pathCellClass)
          .join(" ");

        newGrid = updatedBoardCell(
          newGrid,
          [row, col],
          new CellTemplate(
            cell.text,
            newClasses,
            cell.isExplored,
            cell.canExplore,
            cell.rotation,
            cell.isNavigable,
            cell.isStart,
            cell.isTarget,
            cell.isOnPath
          )
        );
      }
    }
  }

  return newGrid;
}
