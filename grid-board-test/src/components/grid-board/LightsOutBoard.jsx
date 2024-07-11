import React from "react";
import { useState } from "react";

import { GridBoard, getAdjacentCoordinates } from "./GridBoard";

const TicTacToeBoard = () => {
  const initialGridData = [
    ["", "", "", "", ""],
    ["", "", "", "", ""],
    ["", "", "", "", ""],
    ["", "", "", "", ""],
    ["", "", "", "", ""],
  ];

  const [gridData, setGridData] = useState(initialGridData);

  const handleCellClick = (rowIndex, colIndex) => {
    if (gridData[rowIndex][colIndex] !== "") return;

    const adjacentCoords = getAdjacentCoordinates(
      [rowIndex, colIndex],
      gridData.length,
      gridData[0].length
    );

    adjacentCoords.forEach((coord) => {
      console.log(coord);
    });

    const newGridData = gridData;
    // newGridData[rowIndex][colIndex] = currentTurn;
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
