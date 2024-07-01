import React from "react";
import GridCell from "./GridCell";

const GridBoard = ({ gridData, onCellClick }) => {
  const rowCount = gridData.length;
  const colCount = gridData[0].length;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${colCount}, 1fr)`,
      }}
    >
      {gridData.map((row, rowIndex) =>
        row.map((cell, colIndex) => (
          <GridCell
            key={`${rowIndex}-${colIndex}`}
            value={cell}
            onClick={() => onCellClick(rowIndex, colIndex)}
          />
        ))
      )}
    </div>
  );
};

export default GridBoard;
