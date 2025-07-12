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
  getDirectionString,
  getDirectionRotation,
  highlightPath,
  clearHighlights,
} from "../../utils/gridUtils";

export default function NavigationBoard() {
  const gridSize = 12;
  const startPos = useRef([0, 0]).current;

  const [gridData, setGridData] = useState(null);
  const [hasPath, setHasPath] = useState(false);
  const [pathCells, setPathCells] = useState([]);
  const [targetPos, setTargetPos] = useState([2, 2]);
  const [characterPosition, setCharacterPosition] = useState(startPos);
  const [characterDirection, setCharacterDirection] = useState("RIGHT");
  const [isFollowingPath, setIsFollowingPath] = useState(false);

  // Add ref to track timeouts for cleanup
  const timeoutRef = useRef(null);

  const initialGridData = useMemo(
    () =>
      initializeGridData(
        gridSize,
        gridSize,
        new CellTemplate("", "navigation-cell")
      ),
    [gridSize]
  );

  const generateRandomTargetPosition = useCallback(() => {
    let newTarget;
    do {
      newTarget = [
        Math.floor(Math.random() * gridSize),
        Math.floor(Math.random() * gridSize),
      ];
    } while (newTarget[0] === startPos[0] && newTarget[1] === startPos[1]);
    return newTarget;
  }, [gridSize, startPos]);

  const generateRandomBoard = useCallback(() => {
    let newGrid = initialGridData;
    const newTargetPos = generateRandomTargetPosition();
    setTargetPos(newTargetPos);

    // Generate random navigable/impassable cells
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const isStart = row === startPos[0] && col === startPos[1];
        const isTarget = row === newTargetPos[0] && col === newTargetPos[1];
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

    return { grid: newGrid, targetPos: newTargetPos };
  }, [initialGridData, gridSize, startPos, generateRandomTargetPosition]);

  const checkForPath = useCallback(
    (board, target) => {
      const isNavigableCallback = (cell) => cell.isNavigable;

      const result = findPath(board, startPos, target, isNavigableCallback);

      setHasPath(result.hasPath);
      setPathCells(result.path);

      return result;
    },
    [startPos]
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

  const updateGridWithCharacter = useCallback(
    (board, charPos, charDir) => {
      let newGrid = [...board.map((row) => [...row])];

      // Clear any existing character cells first
      for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
          const cell = newGrid[row][col];
          if (cell.classNames.includes("character-cell")) {
            // Remove character-cell class and arrow text, restore original content
            const cleanedClasses = cell.classNames.replace(
              " character-cell",
              ""
            );
            let originalText = "";
            if (cell.isStart) originalText = "Start";
            else if (cell.isTarget) originalText = "Target";

            newGrid = updatedBoardCell(
              newGrid,
              [row, col],
              new CellTemplate(
                originalText,
                cleanedClasses,
                cell.isExplored,
                cell.canExplore,
                0, // Reset rotation
                cell.isNavigable,
                cell.isStart,
                cell.isTarget,
                cell.isOnPath
              )
            );
          }
        }
      }

      // Place character with rotation at new position
      const cell = newGrid[charPos[0]][charPos[1]];
      const rotation = getDirectionRotation(charDir);

      newGrid = updatedBoardCell(
        newGrid,
        charPos,
        new CellTemplate(
          "⬆️",
          cell.classNames + " character-cell",
          cell.isExplored,
          cell.canExplore,
          rotation,
          cell.isNavigable,
          cell.isStart,
          cell.isTarget,
          cell.isOnPath
        )
      );

      return newGrid;
    },
    [gridSize]
  );

  const resetBoard = useCallback(() => {
    // Clear any existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const { grid: newBoard, targetPos: newTarget } = generateRandomBoard();
    const pathResult = checkForPath(newBoard, newTarget);

    // clear highlights for old path then add them for the new path
    let finalBoard = clearHighlights(newBoard);
    if (pathResult.hasPath) {
      finalBoard = highlightPath(finalBoard, pathResult.path);
    }

    // Add character to the board
    finalBoard = updateGridWithCharacter(finalBoard, startPos, "RIGHT");

    setGridData(finalBoard);
    setCharacterPosition(startPos);
    setCharacterDirection("RIGHT");
    setIsFollowingPath(false);
  }, [
    generateRandomBoard,
    checkForPath,
    updateGridWithPath,
    updateGridWithCharacter,
    startPos,
  ]);

  const followPath = useCallback(() => {
    if (!hasPath || pathCells.length === 0 || isFollowingPath) return;

    // Clear any existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setIsFollowingPath(true);

    setCharacterPosition(startPos);
    setCharacterDirection("RIGHT");

    if (gridData) {
      const resetGrid = updateGridWithCharacter(gridData, startPos, "RIGHT");
      setGridData(resetGrid);
    }

    let currentIndex = 0;

    const moveCharacter = () => {
      if (currentIndex >= pathCells.length - 1) {
        setIsFollowingPath(false);
        timeoutRef.current = null;
        return;
      }

      const currentPos = pathCells[currentIndex];
      const nextPos = pathCells[currentIndex + 1];

      // Calculate direction from current to next position
      const direction = getDirectionString(currentPos, nextPos);

      setCharacterPosition(nextPos);
      setCharacterDirection(direction);

      // Update grid with new character position
      if (gridData) {
        const updatedGrid = updateGridWithCharacter(
          gridData,
          nextPos,
          direction
        );
        setGridData(updatedGrid);
      }

      currentIndex++;

      if (currentIndex < pathCells.length - 1) {
        timeoutRef.current = setTimeout(moveCharacter, 500); // Move every 500ms
      } else {
        setIsFollowingPath(false);
        timeoutRef.current = null;
      }
    };

    timeoutRef.current = setTimeout(moveCharacter, 500);
  }, [hasPath, pathCells, isFollowingPath, gridData, updateGridWithCharacter]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

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
          🟩 Land (navigable) | 🟦 Water (impassable) | 🟨 Path found | ⬆️
          Character
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
          <button
            onClick={resetBoard}
            disabled={isFollowingPath}
            style={{
              padding: "10px 20px",
              fontSize: "16px",
              backgroundColor: isFollowingPath ? "#ccc" : "#4ecdc4",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: isFollowingPath ? "not-allowed" : "pointer",
            }}
          >
            Generate New Layout
          </button>
          <button
            onClick={followPath}
            disabled={!hasPath || isFollowingPath}
            style={{
              padding: "10px 20px",
              fontSize: "16px",
              backgroundColor: !hasPath || isFollowingPath ? "#ccc" : "#ff9f43",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: !hasPath || isFollowingPath ? "not-allowed" : "pointer",
            }}
          >
            {isFollowingPath ? "Following..." : "Follow Path"}
          </button>
        </div>
      </div>
      <div className="navigation-board">
        {gridData && <GridBoard gridData={gridData} onCellClick={() => {}} />}
      </div>
    </div>
  );
}
