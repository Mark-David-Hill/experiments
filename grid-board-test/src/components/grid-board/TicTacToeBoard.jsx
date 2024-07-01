import { useState } from "react";
import React from "react";
import GridBoard from "./GridBoard";

const TicTacToeBoard = () => {
  const rowCount = 3;
  const colCount = 3;
  const initialGridData = Array.from({ length: rowCount }, () =>
    Array(colCount).fill("")
  );

  const [gridData, setGridData] = useState(initialGridData);
  const [turn, setTurn] = useState("x");

  const handleCellClick = (rowIndex, colIndex) => {
    if (gridData[rowIndex][colIndex] !== "") return; // Ignore if cell is already filled

    const newGridData = gridData.map((row, rowId) =>
      row.map((cell, colId) =>
        rowId === rowIndex && colId === colIndex ? turn : cell
      )
    );

    setGridData(newGridData);
    setTurn(turn === "x" ? "o" : "x");
  };

  return <GridBoard gridData={gridData} onCellClick={handleCellClick} />;
};

export default TicTacToeBoard;
