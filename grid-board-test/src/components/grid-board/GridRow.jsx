import React from "react";
import GridCell from "./GridCell";

const GridRow = ({ rowData, rowIndex, onCellClick }) => {
  return (
    <div className="game-row">
      {rowData &&
        rowData.map((cell, colIndex) => {
          return (
            <GridCell
              key={colIndex}
              value={cell}
              onClick={() => onCellClick(rowIndex, colIndex)}
            />
          );
        })}
    </div>
  );
};

export default GridRow;
