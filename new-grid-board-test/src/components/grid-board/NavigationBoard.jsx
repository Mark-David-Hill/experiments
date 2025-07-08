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
  getDirectionRotation,
  getDirectionString,
} from "../../utils/gridUtils";

export default function NavigationBoard() {
  const gridSize = 12;
  const startPos = useRef([0, 0]).current;
  const timeoutsRef = useRef([]);

  const [gridData, setGridData] = useState(null);
  const [hasPath, setHasPath] = useState(false);
  const [pathCells, setPathCells] = useState([]);
  const [targetPos, setTargetPos] = useState([2, 2]);
  const [characterPosition, setCharacterPosition] = useState(startPos);
  const [characterDirection, setCharacterDirection] = useState("RIGHT");
  const [isFollowingPath, setIsFollowingPath] = useState(false);

  const initialGridData = useMemo(
    () =>
      initializeGridData(
        gridSize,
        gridSize,
        new CellTemplate("", "navigation-cell")
      ),
    [gridSize]
  );

  const setNewTimeout = (fn, delay) => {
    const id = setTimeout(fn, delay);
    timeoutsRef.current.push(id);
  };

  const clearTimeouts = () => {
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];
  };

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
    (board, prevPos, charPos, charDir) => {
      let newGrid = [...board.map((row) => [...row])];

      // Place character with rotation
      const cell = newGrid[charPos[0]][charPos[1]];
      const rotation = getDirectionRotation(charDir);

      // Clear the previous character cell (unless it's Start or Target)
      if (prevPos) {
        const prevCell = newGrid[prevPos[0]][prevPos[1]];
        let newPrevCellText = "";
        if (prevCell.isStart) {
          newPrevCellText = "Start";
        } else if (prevCell.isTarget) {
          newPrevCellText = "Target";
        }
        newGrid = updatedBoardCell(
          newGrid,
          prevPos,
          new CellTemplate(
            newPrevCellText,
            prevCell.classNames.replace(" character-cell", ""),
            prevCell.isExplored,
            prevCell.canExplore,
            0,
            prevCell.isNavigable,
            prevCell.isStart,
            prevCell.isTarget,
            prevCell.isOnPath
          )
        );
      }

      newGrid = updatedBoardCell(
        newGrid,
        charPos,
        new CellTemplate(
          cell.isStart ? "⬆️" : cell.isTarget ? "⬆️" : "⬆️",
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
    []
  );

  const resetBoard = useCallback(() => {
    clearTimeouts();
    const { grid: newBoard, targetPos: newTarget } = generateRandomBoard();
    const pathResult = checkForPath(newBoard, newTarget);

    let finalBoard = newBoard;
    if (pathResult.hasPath) {
      finalBoard = updateGridWithPath(newBoard, pathResult.path);
    }

    // Add character to the board
    finalBoard = updateGridWithCharacter(finalBoard, null, startPos, "RIGHT");

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

    const lastCell = pathCells[pathCells.length - 1];
    if (
      characterPosition[0] === lastCell[0] &&
      characterPosition[1] === lastCell[1]
    ) {
      // clear character from target position and place at start
      setGridData((prev) =>
        updateGridWithCharacter(prev, lastCell, startPos, "RIGHT")
      );
      setCharacterPosition(startPos);
      setCharacterDirection("RIGHT");
    }

    setIsFollowingPath(true);
    let currentIndex = 0;

    const moveCharacter = () => {
      if (currentIndex >= pathCells.length - 1) {
        setIsFollowingPath(false);
        clearTimeouts();
        return;
      }

      const currentPos = pathCells[currentIndex];
      const nextPos = pathCells[currentIndex + 1];
      const direction = getDirectionString(currentPos, nextPos);

      setCharacterPosition(nextPos);
      setCharacterDirection(direction);

      setGridData((prevGrid) => {
        if (!prevGrid) return prevGrid;
        return updateGridWithCharacter(
          prevGrid,
          currentPos,
          nextPos,
          direction
        );
      });

      currentIndex++;

      if (currentIndex < pathCells.length - 1) {
        setNewTimeout(moveCharacter, 500); // Move every 500ms
      } else {
        setIsFollowingPath(false);
      }
    };

    clearTimeouts();
    setNewTimeout(moveCharacter, 500);
  }, [hasPath, pathCells, isFollowingPath, gridData, updateGridWithCharacter]);

  useEffect(() => {
    resetBoard();
  }, [resetBoard]);

  useEffect(() => {
    return () => {
      clearTimeouts();
    };
  }, []);

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
