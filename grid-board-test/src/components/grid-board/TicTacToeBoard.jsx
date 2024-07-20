import React from "react";
import { useState } from "react";

import { GridBoard, CellTemplate } from "./GridBoard";

import {
  initializeGridData,
  getAdjacentCoordinates,
  updatedBoardCell,
} from "../../utils/gridUtils";

const TicTacToeBoard = () => {
  const initialGridData = initializeGridData(3, 3, new CellTemplate("", ""));

  const [gridData, setGridData] = useState(initialGridData);
  const [currentTurn, setCurrentTurn] = useState("x");
  const [xWins, setXWins] = useState(0);
  const [oWins, setOWins] = useState(0);

  const handleCellClick = (rowIndex, colIndex) => {
    if (gridData[rowIndex][colIndex].text !== "") return;

    let newGridData = gridData.map((row) => row.slice());
    const newCell = new CellTemplate(currentTurn, "");
    newGridData = updatedBoardCell(newGridData, [rowIndex, colIndex], newCell);
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
