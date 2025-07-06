import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { GridBoard, CellTemplate } from "./GridBoard";
import {
  initializeGridData,
  updatedBoardCell,
  findPath,
} from "../../utils/gridUtils";

export default function NavigationBoard() {
  const gridSize = 12;
  const startPos = useRef([0, 0]).current;
  const targetPos = useRef([2, 2]).current;

  const [gridData, setGridData] = useState(null);
  const [hasPath, setHasPath] = useState(false);
  const [pathCells, setPathCells] = useState([]);

  const initialGridData = useMemo(
    () =>
      initializeGridData(
        gridSize,
        gridSize,
        new CellTemplate("", "navigation-cell")
      ),
    [gridSize]
  );

  const generateRandomBoard = useCallback(() => {
    let newGrid = initialGridData;

    // Generate random navigable/impassable cells
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const isStart = row === startPos[0] && col === startPos[1];
        const isTarget = row === targetPos[0] && col === targetPos[1];
        const isNavigable = isStart || isTarget || Math.random() > 0.3;

        let cellText = "";
        let cellClasses = "navigation-cell";

        if (isStart) {
          cellText = "Start";
          cellClasses += " start-cell";
        } else if (isTarget) {
          cellText = "Target";
          cellClasses += " target-cell";
        }

        if (isNavigable) {
          cellClasses += " land-cell";
        } else {
          cellClasses += " water-cell";
        }

        newGrid = updatedBoardCell(
          newGrid,
          [row, col],
          new CellTemplate(
            cellText,
            cellClasses,
            false,
            true,
            0,
            isNavigable,
            isStart,
            isTarget,
            false
          )
        );
      }
    }

    return newGrid;
  }, [initialGridData, gridSize, startPos, targetPos]);

  const checkForPath = useCallback(
    (board) => {
      const isNavigableCallback = (cell) => cell.isNavigable;

      const result = findPath(board, startPos, targetPos, isNavigableCallback);

      setHasPath(result.hasPath);
      setPathCells(result.path);

      return result;
    },
    [startPos, targetPos]
  );

  const updateGridWithPath = useCallback((board, path) => {
    let newGrid = [...board.map((row) => [...row])];

    // Highlight path cells (excluding start and target)
    path.forEach(([row, col]) => {
      const cell = newGrid[row][col];
      if (!cell.isStart && !cell.isTarget) {
        newGrid = updatedBoardCell(
          newGrid,
          [row, col],
          new CellTemplate(
            cell.text,
            cell.classNames + " path-cell",
            cell.isExplored,
            cell.canExplore,
            cell.rotation,
            cell.isNavigable,
            cell.isStart,
            cell.isTarget,
            true
          )
        );
      }
    });

    return newGrid;
  }, []);

  const resetBoard = useCallback(() => {
    const newBoard = generateRandomBoard();
    const pathResult = checkForPath(newBoard);

    let finalBoard = newBoard;
    if (pathResult.hasPath) {
      finalBoard = updateGridWithPath(newBoard, pathResult.path);
    }

    setGridData(finalBoard);
  }, [generateRandomBoard, checkForPath, updateGridWithPath]);

  useEffect(() => {
    resetBoard();
  }, [resetBoard]);

  return (
    <div className="navigation-board-container">
      <h2>Navigation Pathfinding</h2>
      <div style={{ marginBottom: "15px", textAlign: "center" }}>
        <p style={{ margin: "5px 0" }}>
          <strong>
            {hasPath
              ? "✅ There is a path to the destination"
              : "❌ There is no path to the destination"}
          </strong>
        </p>
        <p style={{ margin: "5px 0", fontSize: "14px" }}>
          🟩 Land (navigable) | 🟦 Water (impassable) | 🟨 Path found
        </p>
        <button
          onClick={resetBoard}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            backgroundColor: "#4ecdc4",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Generate New Layout
        </button>
      </div>
      <div className="navigation-board">
        {gridData && <GridBoard gridData={gridData} onCellClick={() => {}} />}
      </div>
    </div>
  );
}
