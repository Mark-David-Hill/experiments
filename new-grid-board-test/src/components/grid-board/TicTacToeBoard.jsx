import React from "react";
import { useState } from "react";

import { GridBoard, CellTemplate } from "./GridBoard";

import {
  initializeGridData,
  updatedBoardCell,
  checkRowWin,
  checkColWin,
  checkDiagonalWin,
} from "../../utils/gridUtils";

const TicTacToeBoard = () => {
  const gridSize = 3;
  const initialGridData = initializeGridData(
    gridSize,
    gridSize,
    new CellTemplate("", "")
  );

  const [gridData, setGridData] = useState(initialGridData);
  const [currentTurn, setCurrentTurn] = useState("x");
  const [xWins, setXWins] = useState(0);
  const [oWins, setOWins] = useState(0);
  const [isWinState, setIsWinState] = useState(false);

  const handleInitializeGame = () => {
    setCurrentTurn("x");
    setGridData(initialGridData);
    setIsWinState(false);
  };

  const handleCellClick = (rowIndex, colIndex) => {
    if (isWinState || gridData[rowIndex][colIndex].text !== "") {
      return;
    }

    let newGridData = gridData.map((row) => row.slice());
    const newCell = new CellTemplate(currentTurn, "");
    newGridData = updatedBoardCell(newGridData, [rowIndex, colIndex], newCell);

    const rowWin = checkRowWin(newGridData, currentTurn);
    const colWin = checkColWin(newGridData, currentTurn);
    const diagWin = checkDiagonalWin(newGridData, currentTurn);

    if (rowWin.isWin || colWin.isWin || diagWin.isWin) {
      setIsWinState(true);
      let winningCells = [];
      if (rowWin.isWin) winningCells = rowWin.winningCells;
      else if (colWin.isWin) winningCells = colWin.winningCells;
      else if (diagWin.isWin) winningCells = diagWin.winningCells;

      // Highlight winning cells
      winningCells.forEach(([r, c]) => {
        newGridData[r][c] = new CellTemplate(
          newGridData[r][c].text,
          "winning-cell",
          newGridData[r][c].isExplored,
          newGridData[r][c].canExplore
        );
      });

      currentTurn === "x"
        ? setXWins((prev) => prev + 1)
        : setOWins((prev) => prev + 1);
    } else {
      setCurrentTurn(currentTurn === "x" ? "o" : "x");
    }
    setGridData(newGridData);
  };

  return (
    <div className="tic-tac-toe-container" style={{ margin: "20px" }}>
      <div style={{ marginBottom: "10px" }}>
        <p>
          X Wins: {xWins} | O Wins: {oWins} | Current Turn: {currentTurn}
        </p>
        <p>
          Status:{" "}
          {isWinState ? `${currentTurn.toUpperCase()} wins!` : "Playing"}
        </p>
        <button onClick={handleInitializeGame}>Start New Game</button>
      </div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <GridBoard gridData={gridData} onCellClick={handleCellClick} />
      </div>
    </div>
  );
};

export default TicTacToeBoard;
