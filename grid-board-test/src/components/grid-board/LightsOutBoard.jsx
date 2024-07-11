import React from "react";
import { useState } from "react";

import { GridBoard, getAdjacentCoordinates, CellTemplate } from "./GridBoard";

const baseCell = new CellTemplate("", "lit");

const TicTacToeBoard = () => {
  const initialGridData = [
    [baseCell, baseCell, baseCell, baseCell, baseCell],
    [baseCell, baseCell, baseCell, baseCell, baseCell],
    [baseCell, baseCell, baseCell, baseCell, baseCell],
    [baseCell, baseCell, baseCell, baseCell, baseCell],
    [baseCell, baseCell, baseCell, baseCell, baseCell],
  ];

  const [gridData, setGridData] = useState(initialGridData);

  const handleCellClick = (rowIndex, colIndex) => {
    const cellsToToggle = getAdjacentCoordinates(
      [rowIndex, colIndex],
      gridData.length,
      gridData[0].length
    );

    cellsToToggle.push([rowIndex, colIndex]);

    const newGridData = gridData.map((row, rowId) =>
      row.map((cell, cellId) => {
        if (cellsToToggle.some(([r, c]) => r === rowId && c === cellId)) {
          return new CellTemplate(
            cell.text,
            cell.classNames === "lit" ? "unlit" : "lit"
          );
        }
        return cell;
      })
    );

    setGridData(newGridData);
  };

  return (
    <div>
      <div></div>
      <GridBoard gridData={gridData} onCellClick={handleCellClick} />
    </div>
  );
};

export default TicTacToeBoard;
