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
  getNextPosition,
  isValidPosition,
  getDirectionRotation,
  generateRandomObstacles,
} from "../../utils/gridUtils";

const TopDownBoard = () => {
  const gridSize = 12;
  const initialGridData = useMemo(
    () =>
      initializeGridData(
        gridSize,
        gridSize,
        new CellTemplate("", "topdown-cell", false, true, 0, true)
      ),
    [gridSize]
  );

  // Initial character position (middle of the board)
  const initialPosition = [Math.floor(gridSize / 2), Math.floor(gridSize / 2)];

  const [gridData, setGridData] = useState(initialGridData);
  const [characterPosition, setCharacterPosition] = useState(initialPosition);
  const [direction, setDirection] = useState("RIGHT");
  const [gameRunning, setGameRunning] = useState(false);
  const [obstacles, setObstacles] = useState([]);

  const characterPositionRef = useRef(characterPosition);
  const directionRef = useRef(direction);

  // Generate obstacles
  const generateObstacles = useCallback(() => {
    const excludePositions = [initialPosition];
    return generateRandomObstacles(gridSize, 6, excludePositions);
  }, [gridSize]);

  // Update the grid display
  const updateGrid = useCallback(
    (position, currentDirection, obstaclePositions) => {
      let newGrid = initialGridData;

      // Place obstacles
      obstaclePositions.forEach(([row, col]) => {
        newGrid = updatedBoardCell(
          newGrid,
          [row, col],
          new CellTemplate(
            "🚧",
            "topdown-cell obstacle-cell",
            false,
            true,
            0,
            false
          )
        );
      });

      // Place character with rotation
      const rotation = getDirectionRotation(currentDirection);
      newGrid = updatedBoardCell(
        newGrid,
        position,
        new CellTemplate(
          "⬆️",
          "topdown-cell character-cell",
          false,
          true,
          rotation,
          true
        )
      );

      setGridData(newGrid);
    },
    [initialGridData]
  );

  // Handle direction change from GridBoard
  const handleDirectionChange = useCallback(
    (newDirection) => {
      if (!gameRunning) return;

      setDirection(newDirection);

      const currentPosition = characterPositionRef.current;
      const nextPosition = getNextPosition(
        currentPosition,
        newDirection,
        gridSize
      );

      // Check if the new position is valid and navigable
      if (
        isValidPosition(nextPosition, gridSize) &&
        !obstacles.some(
          ([r, c]) => r === nextPosition[0] && c === nextPosition[1]
        )
      ) {
        setCharacterPosition(nextPosition);
      }
    },
    [gameRunning, gridSize, obstacles]
  );

  // Handle continue forward from GridBoard
  const handleContinueForward = useCallback(() => {
    if (!gameRunning) return;

    const currentPosition = characterPositionRef.current;
    const currentDirection = directionRef.current;
    const nextPosition = getNextPosition(
      currentPosition,
      currentDirection,
      gridSize
    );

    // Check if the new position is valid and navigable
    if (
      isValidPosition(nextPosition, gridSize) &&
      !obstacles.some(
        ([r, c]) => r === nextPosition[0] && c === nextPosition[1]
      )
    ) {
      setCharacterPosition(nextPosition);
    }
  }, [gameRunning, gridSize, obstacles]);

  // Start or restart game
  const startGame = () => {
    const newObstacles = generateObstacles();
    setObstacles(newObstacles);
    setCharacterPosition(initialPosition);
    setDirection("RIGHT");
    setGameRunning(true);
  };

  const stopGame = () => {
    setGameRunning(false);
  };

  // Update grid when character position, direction, or obstacles change
  useEffect(() => {
    updateGrid(characterPosition, direction, obstacles);
  }, [characterPosition, direction, obstacles, updateGrid]);

  // Initialize the grid with obstacles
  useEffect(() => {
    const initialObstacles = generateObstacles();
    setObstacles(initialObstacles);
    updateGrid(initialPosition, "RIGHT", initialObstacles);
  }, [updateGrid, generateObstacles]);

  // Keep characterPositionRef updated
  useEffect(() => {
    characterPositionRef.current = characterPosition;
  }, [characterPosition]);

  // Keep directionRef updated
  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  return (
    <div className="topdown-container">
      <h2>Top-Down Movement Demo</h2>
      <div style={{ marginBottom: "15px", textAlign: "center" }}>
        <p style={{ margin: "5px 0" }}>
          <strong>Position:</strong> [{characterPosition[0]},{" "}
          {characterPosition[1]}] |<strong> Direction:</strong> {direction}
        </p>
        {gameRunning ? (
          <p style={{ color: "green" }}>
            🎮 Use Arrow Keys or WASD to move the character!
          </p>
        ) : (
          <p>Click Start to begin moving around!</p>
        )}
        <button
          onClick={gameRunning ? stopGame : startGame}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            backgroundColor: gameRunning ? "#ff6b6b" : "#4ecdc4",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            marginRight: "10px",
          }}
        >
          {gameRunning ? "Stop" : "Start"}
        </button>
      </div>
      <div className="topdown-board">
        <GridBoard
          gridData={gridData}
          onCellClick={() => {}}
          enableKeyboardMovement={true}
          onContinueForward={handleContinueForward}
          onDirectionChange={handleDirectionChange}
          gameRunning={gameRunning}
          direction={direction}
        />
      </div>
    </div>
  );
};

export default TopDownBoard;
