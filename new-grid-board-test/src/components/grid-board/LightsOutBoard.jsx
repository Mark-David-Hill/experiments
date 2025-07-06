import React from "react";
import { useState } from "react";

import { GridBoard, CellTemplate } from "./GridBoard";

import {
  initializeGridData,
  getAdjacentCoordinates,
  updatedBoardCell,
} from "../../utils/gridUtils";

const LightsOutBoard = () => {
  const initialGridData = initializeGridData(5, 5, new CellTemplate("", "lit"));
  const [gridData, setGridData] = useState(initialGridData);

  const handleCellClick = (rowIndex, colIndex) => {
    const cellsToToggle = getAdjacentCoordinates(
      [rowIndex, colIndex],
      gridData.length,
      gridData[0].length
    );

    cellsToToggle.push([rowIndex, colIndex]);

    let newGridData = gridData.map((row) => row.slice());

    cellsToToggle.forEach(([rowId, cellId]) => {
      const sourceCell = gridData[rowId][cellId];
      const newCell = new CellTemplate(
        sourceCell.text,
        sourceCell.classNames === "lit" ? "unlit" : "lit"
      );
      newGridData = updatedBoardCell(newGridData, [rowId, cellId], newCell);
    });

    setGridData(newGridData);
  };

  return (
    <div>
      <div></div>
      <GridBoard gridData={gridData} onCellClick={handleCellClick} />
    </div>
  );
};

export default LightsOutBoard;
