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

const GRID_SIZE = 12;
const MOVE_INTERVAL = 500;

export default function NavigationBoard() {
  const startPos = useRef([0, 0]);
  const timeoutRef = useRef(null);
  const defaultTemplate = useMemo(
    () => new CellTemplate("", "navigation-cell"),
    []
  );

  const [grid, setGrid] = useState(() =>
    initializeGridData(GRID_SIZE, GRID_SIZE, defaultTemplate)
  );
  const [pathCells, setPathCells] = useState([]);
  const [hasPath, setHasPath] = useState(false);
  const [target, setTarget] = useState([2, 2]);
  const [charPos, setCharPos] = useState(startPos.current);
  const [charDir, setCharDir] = useState("RIGHT");
  const [following, setFollowing] = useState(false);

  const cloneGrid = useCallback((board) => board.map((row) => [...row]), []);

  const randomPos = useCallback(() => {
    let pos;
    do {
      pos = [
        Math.floor(Math.random() * GRID_SIZE),
        Math.floor(Math.random() * GRID_SIZE),
      ];
    } while (pos[0] === startPos.current[0] && pos[1] === startPos.current[1]);
    return pos;
  }, []);

  /**
   * Generates and returns a new grid and target without setting state inside.
   */
  const generateBoard = useCallback(() => {
    let newGrid = initializeGridData(GRID_SIZE, GRID_SIZE, defaultTemplate);
    const newTarget = randomPos();

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const isStart = r === startPos.current[0] && c === startPos.current[1];
        const isTarget = r === newTarget[0] && c === newTarget[1];
        const isNav = isStart || isTarget || Math.random() > 0.3;

        const text = isStart ? "Start" : isTarget ? "Target" : "";
        const classes = [
          "navigation-cell",
          isStart && "start-cell",
          isTarget && "target-cell",
          isNav ? "land-cell" : "water-cell",
        ]
          .filter(Boolean)
          .join(" ");

        newGrid = updatedBoardCell(
          newGrid,
          [r, c],
          new CellTemplate(
            text,
            classes,
            false,
            true,
            0,
            isNav,
            isStart,
            isTarget,
            false
          )
        );
      }
    }

    return { newGrid, newTarget };
  }, [randomPos, defaultTemplate]);

  const computePath = useCallback((board, tgt) => {
    const { hasPath, path } = findPath(
      board,
      startPos.current,
      tgt,
      (cell) => cell.isNavigable
    );
    setHasPath(hasPath);
    setPathCells(path);
    return { hasPath, path };
  }, []);

  const placeCharacter = useCallback(
    (board, pos, dir) => {
      let gridCopy = cloneGrid(board);
      // clear old character cells
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const cell = gridCopy[r][c];
          if (cell.classNames.includes("character-cell")) {
            gridCopy = updatedBoardCell(
              gridCopy,
              [r, c],
              new CellTemplate(
                cell.isStart ? "Start" : cell.isTarget ? "Target" : "",
                cell.classNames.replace(" character-cell", ""),
                cell.isExplored,
                cell.canExplore,
                0,
                cell.isNavigable,
                cell.isStart,
                cell.isTarget,
                cell.isOnPath
              )
            );
          }
        }
      }

      // place new character
      const rotation = getDirectionRotation(dir);
      gridCopy = updatedBoardCell(
        gridCopy,
        pos,
        new CellTemplate(
          "⬆️",
          `${gridCopy[pos[0]][pos[1]].classNames} character-cell`,
          gridCopy[pos[0]][pos[1]].isExplored,
          gridCopy[pos[0]][pos[1]].canExplore,
          rotation,
          gridCopy[pos[0]][pos[1]].isNavigable,
          gridCopy[pos[0]][pos[1]].isStart,
          gridCopy[pos[0]][pos[1]].isTarget,
          gridCopy[pos[0]][pos[1]].isOnPath
        )
      );

      return gridCopy;
    },
    [cloneGrid]
  );

  /**
   * Fully resets board, path, and character. No unstable deps.
   */
  const resetBoard = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const { newGrid, newTarget } = generateBoard();
    setTarget(newTarget);

    const { hasPath: found, path } = computePath(newGrid, newTarget);

    let final = clearHighlights(newGrid);
    if (found) final = highlightPath(final, path);
    final = placeCharacter(final, startPos.current, "RIGHT");

    setGrid(final);
    setCharPos(startPos.current);
    setCharDir("RIGHT");
    setFollowing(false);
  }, [generateBoard, computePath, placeCharacter]);

  const followPath = useCallback(() => {
    if (!hasPath || following) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setFollowing(true);
    setCharPos(startPos.current);
    setCharDir("RIGHT");

    let idx = 0;
    const step = () => {
      if (idx >= pathCells.length - 1) {
        setFollowing(false);
        return;
      }

      const curr = pathCells[idx];
      const next = pathCells[idx + 1];
      const dir = getDirectionString(curr, next);

      setCharPos(next);
      setCharDir(dir);
      setGrid((board) => placeCharacter(board, next, dir));

      idx++;
      timeoutRef.current = setTimeout(step, MOVE_INTERVAL);
    };

    timeoutRef.current = setTimeout(step, MOVE_INTERVAL);
  }, [hasPath, following, pathCells, placeCharacter]);

  useEffect(() => {
    resetBoard();
    return () => clearTimeout(timeoutRef.current);
  }, [resetBoard]);

  return (
    <div className="navigation-board-container">
      <h2>Navigation Pathfinding</h2>
      <div className="controls">
        <p className="status">
          <strong>
            {hasPath ? "✅ Path available" : "❌ No path to destination"}
          </strong>
        </p>
        <div className="buttons">
          <button onClick={resetBoard} disabled={following}>
            Generate New
          </button>
          <button onClick={followPath} disabled={!hasPath || following}>
            {following ? "Moving..." : "Follow Path"}
          </button>
        </div>
      </div>
      <GridBoard gridData={grid} onCellClick={() => {}} />
    </div>
  );
}
