import React from "react";

import GridRow from "./GridRow";

const GridBoard = ({ gridData, onCellClick }) => {
  const rowCount = gridData.length;
  const colCount = gridData[0].length;

  return (
    <div>
      {gridData &&
        gridData.map((row, rowIndex) => {
          return (
            <GridRow
              key={rowIndex}
              rowData={row}
              rowIndex={rowIndex}
              onCellClick={onCellClick}
            />
          );
        })}
    </div>
  );
};

export default GridBoard;
