import React from "react";
import { useState } from "react";

import GridBoard from "./GridBoard";

import getAdjacentCoordinates from "../../util/getAdjacentCoordinates";

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
      console.log(gridData[coord[0]][coord[1]]);
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
