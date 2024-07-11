import React from "react";
import { useState } from "react";

import { GridBoard, getAdjacentCoordinates, CellTemplate } from "./GridBoard";

const baseCell = new CellTemplate("", "");

const TicTacToeBoard = () => {
  const initialGridData = [
    [baseCell, baseCell, baseCell],
    [baseCell, baseCell, baseCell],
    [baseCell, baseCell, baseCell],
  ];

  const [gridData, setGridData] = useState(initialGridData);
  const [currentTurn, setCurrentTurn] = useState("x");
  const [xWins, setXWins] = useState(0);
  const [oWins, setOWins] = useState(0);

  const handleCellClick = (rowIndex, colIndex) => {
    if (gridData[rowIndex][colIndex].text !== "") return;

    const newGridData = gridData.map((row, rowId) =>
      row.map((cell, cellId) => {
        if (rowId === rowIndex && cellId === colIndex) {
          return new CellTemplate(currentTurn, "");
        }
        return cell;
      })
    );

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
