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

export function getMaxRowLineLength(gridData, targetText) {
  let maxLineCount = 0;
  gridData.forEach((row) => {
    let rowLineCount = 0;
    row.forEach((cell) => {
      if (cell.text === targetText) {
        rowLineCount += 1;
      }
    });
    if (rowLineCount > maxLineCount) {
      maxLineCount = rowLineCount;
    }
  });
  return maxLineCount;
}

export function getMaxColLineLength(gridData, targetText) {
  let maxLineCount = 0;
  for (let i = 0; i < gridData[0].length; i++) {
    let colLineCount = 0;
    gridData.forEach((row) => {
      if (row[i].text === targetText) {
        colLineCount += 1;
      }
    });
    if (colLineCount > maxLineCount) {
      maxLineCount = colLineCount;
    }
  }
  return maxLineCount;
}

export function getMainDiagonals(gridData) {
  const rowCount = gridData.length;
  const colCount = gridData[0].length;
  const mainDiagonalCoordinates = [];
  // 0,0 and down (upper left to bottom right)

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
  const reverseDiagonalsCoordinates = [];
  // 0,0 and down (upper left to bottom right)

  // for (let i = 0; i < rowCount; i++) {
  //   const lineCoordinates = [];
  //   let rowIndex = i;
  //   let colIndex = 0;
  //   while (rowIndex <= rowCount - 1 && colIndex <= colCount - 1) {
  //     lineCoordinates.push([rowIndex, colIndex]);
  //     rowIndex++;
  //     colIndex++;
  //   }
  //   reverseDiagonalsCoordinates.push(lineCoordinates);
  // }

  // for (let i = 1; i < colCount; i++) {
  //   const lineCoordinates = [];
  //   let rowIndex = 0;
  //   let colIndex = i;

  //   while (rowIndex <= rowCount - 1 && colIndex <= colCount - 1) {
  //     console.log("Coordinates", rowIndex, colIndex);
  //     lineCoordinates.push([rowIndex, colIndex]);
  //     rowIndex++;
  //     colIndex++;
  //   }
  //   reverseDiagonalsCoordinates.push(lineCoordinates);
  // }

  // return reverseDiagonalsCoordinates;
}

// export function getMaxDiagonalLineLength(gridData, targetText) {
//   let maxLineCount = 0;

//   for (let i = 0; i < gridData.length; i++) {
//     let lineCount = 0;
//   }
// }
