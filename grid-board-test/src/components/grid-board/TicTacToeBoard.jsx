import React from "react";
import { useState } from "react";

import { GridBoard, CellTemplate } from "./GridBoard";

import {
  initializeGridData,
  updatedBoardCell,
  getMaxRowLineLength,
  getMaxColLineLength,
  getMainDiagonals,
} from "../../utils/gridUtils";

const TicTacToeBoard = () => {
  const initialGridData = initializeGridData(3, 3, new CellTemplate("", ""));

  const [gridData, setGridData] = useState(initialGridData);
  const [currentTurn, setCurrentTurn] = useState("x");
  const [xWins, setXWins] = useState(0);
  const [oWins, setOWins] = useState(0);
  const [isWinState, setIsWinState] = useState(false);

  const handleInitializeGame = () => {
    setCurrentTurn("x");
    setGridData(initialGridData);
    setIsWinState(false);
    console.log("Diagonal Coordinates:");
    console.log(getMainDiagonals(gridData));
  };

  const checkForWin = (gridData, currentTurn) => {
    const maxLineLength = Math.max(
      getMaxRowLineLength(gridData, currentTurn),
      getMaxColLineLength(gridData, currentTurn)
    );
    if (maxLineLength === 3) {
      console.log(`${currentTurn} wins!`);
      setIsWinState(true);
      currentTurn === "x"
        ? setXWins((prev) => prev + 1)
        : setOWins((prev) => prev + 1);
    }
  };

  const handleCellClick = (rowIndex, colIndex) => {
    if (isWinState || gridData[rowIndex][colIndex].text !== "") {
      return;
    }

    let newGridData = gridData.map((row) => row.slice());
    const newCell = new CellTemplate(currentTurn, "");
    newGridData = updatedBoardCell(newGridData, [rowIndex, colIndex], newCell);
    setGridData(newGridData);
    checkForWin(newGridData, currentTurn);
    setCurrentTurn(currentTurn === "x" ? "o" : "x");
  };

  return (
    <div>
      <div>
        <p>X Wins: {xWins}</p>
        <p>O Wins: {oWins}</p>
        <p>Current Turn: {currentTurn}</p>
        <p>{isWinState ? "win" : "still playing"}</p>
        <button onClick={handleInitializeGame}>Start New Game</button>
      </div>
      <GridBoard gridData={gridData} onCellClick={handleCellClick} />
    </div>
  );
};

export default TicTacToeBoard;
