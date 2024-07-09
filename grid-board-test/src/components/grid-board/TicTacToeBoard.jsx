import React from "react";
import { useState } from "react";

import GridBoard from "./GridBoard";

import getAdjacentCoordinates from "../../util/getAdjacentCoordinates";

const TicTacToeBoard = () => {
  const initialGridData = [
    ["", "", ""],
    ["", "", ""],
    ["", "", ""],
  ];

  const [gridData, setGridData] = useState(initialGridData);
  const [currentTurn, setCurrentTurn] = useState("x");
  const [xWins, setXWins] = useState(0);
  const [oWins, setOWins] = useState(0);

  const handleCellClick = (rowIndex, colIndex) => {
    console.log(
      getAdjacentCoordinates(
        [rowIndex, colIndex],
        gridData.length,
        gridData[0].length
      )
    );
    if (gridData[rowIndex][colIndex] !== "") return;

    const newGridData = gridData;
    newGridData[rowIndex][colIndex] = currentTurn;
    setGridData(newGridData);
    setCurrentTurn(currentTurn === "x" ? "o" : "x");
  };

  return (
    <div>
      <div>
        <p>X Wins: {xWins}</p>
        <p>O Wins: {oWins}</p>
        <p>Current Turn: {currentTurn}</p>
      </div>
      <GridBoard gridData={gridData} onCellClick={handleCellClick} />
    </div>
  );
};

export default TicTacToeBoard;
