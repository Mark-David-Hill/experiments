import React, { useState, useEffect, useRef, useCallback } from "react";
import GridRow from "./GridRow";

export function GridBoard({
  gridData,
  onCellClick,
  enableKeyboardMovement = false,
  onDirectionChange,
  onContinueForward,
  gameRunning = false,
}) {
  const [direction, setDirection] = useState("RIGHT");
  const directionRef = useRef("RIGHT");

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
        directionRef.current = newDirection;
        setDirection(newDirection);
        if (onDirectionChange) {
          onDirectionChange(newDirection);
        }
      } else if (onContinueForward) {
        onContinueForward();
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
    rotation = 0
  ) {
    this.text = text;
    this.classNames = classNames;
    this.isExplored = isExplored;
    this.canExplore = canExplore;
    this.rotation = rotation;
  }
}
