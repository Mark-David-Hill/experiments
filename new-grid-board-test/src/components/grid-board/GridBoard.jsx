import React, { useState, useEffect, useRef, useCallback } from "react";

const GridCell = ({ cellData, onClick }) => {
  let cellStyle = {
    border: "2px solid #333",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: "24px",
    fontWeight: "bold",
    margin: "2px",
    borderRadius: "4px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    transform: cellData.rotation ? `rotate(${cellData.rotation}deg)` : "none",
  };

  return (
    <div onClick={onClick} className={cellData.classNames} style={cellStyle}>
      {cellData.text}
    </div>
  );
};

const GridRow = ({ rowData, rowIndex, onCellClick }) => {
  return (
    <div className="game-row">
      {rowData &&
        rowData.map((cell, colIndex) => {
          return (
            <GridCell
              key={colIndex}
              cellData={cell}
              className={cell.classNames}
              onClick={() => onCellClick(rowIndex, colIndex)}
            />
          );
        })}
    </div>
  );
};

export function GridBoard({
  gridData,
  onCellClick = () => {},
  enableKeyboardMovement = false,
  onDirectionChange,
  onContinueForward,
  gameRunning = false,
  direction,
}) {
  const directionRef = useRef(direction);

  // Handle keyboard input for direction
  const handleKeyDown = useCallback(
    (e) => {
      if (!enableKeyboardMovement || !gameRunning) return;

      e.preventDefault();

      const currentDirection = directionRef.current;
      let newDirection = currentDirection;

      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          newDirection = "UP";
          break;
        case "ArrowDown":
        case "s":
        case "S":
          newDirection = "DOWN";
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          newDirection = "LEFT";
          break;
        case "ArrowRight":
        case "d":
        case "D":
          newDirection = "RIGHT";
          break;
        default:
          break;
      }

      if (newDirection !== currentDirection) {
        onDirectionChange?.(newDirection);
      } else {
        onContinueForward?.();
      }
    },
    [enableKeyboardMovement, gameRunning, onDirectionChange, onContinueForward]
  );

  useEffect(() => {
    if (enableKeyboardMovement && gameRunning) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [enableKeyboardMovement, handleKeyDown]);

  // Keep the direction ref in sync with its parent
  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

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
  constructor(
    text,
    classNames,
    isExplored = false,
    canExplore = true,
    rotation = 0,
    isNavigable = true,
    isStart = false,
    isTarget = false,
    isOnPath = false
  ) {
    this.text = text;
    this.classNames = classNames;
    this.isExplored = isExplored;
    this.canExplore = canExplore;
    this.rotation = rotation;
    this.isNavigable = isNavigable;
    this.isStart = isStart;
    this.isTarget = isTarget;
    this.isOnPath = isOnPath;
  }
}
