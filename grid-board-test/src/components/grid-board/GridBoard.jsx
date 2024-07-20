import React from "react";

import GridRow from "./GridRow";

export function GridBoard({ gridData, onCellClick }) {
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
}

export class CellTemplate {
  constructor(text, classNames, isExplored = false, canExplore = true) {
    this.text = text;
    this.classNames = classNames;
    this.isExplored = isExplored;
    this.canExplore = canExplore;
  }
}
