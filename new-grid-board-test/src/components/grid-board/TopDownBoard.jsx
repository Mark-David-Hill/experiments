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
  findPath,
  getFirstStepInPath,
  highlightPath,
  clearHighlights,
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

  // Initial enemy position (opposite corner)
  const initialEnemyPosition = [0, 0];

  const [gridData, setGridData] = useState(initialGridData);
  const [characterPosition, setCharacterPosition] = useState(initialPosition);
  const [enemyPosition, setEnemyPosition] = useState(initialEnemyPosition);
  const [direction, setDirection] = useState("RIGHT");
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [obstacles, setObstacles] = useState([]);
  const [enemyPath, setEnemyPath] = useState([]);

  const characterPositionRef = useRef(characterPosition);
  const enemyPositionRef = useRef(enemyPosition);
  const directionRef = useRef(direction);
  const gameRunningRef = useRef(false);
  const gameOverRef = useRef(false);
  const gridDataRef = useRef(gridData);

  // Generate obstacles
  const generateObstacles = useCallback(() => {
    const excludePositions = [initialPosition, initialEnemyPosition];
    return generateRandomObstacles(gridSize, 6, excludePositions);
  }, [gridSize]);

  // Check if enemy caught player
  const checkGameOver = useCallback(() => {
    const playerPos = characterPositionRef.current;
    const enemyPos = enemyPositionRef.current;

    if (playerPos[0] === enemyPos[0] && playerPos[1] === enemyPos[1]) {
      gameOverRef.current = true;
      setGameOver(true);
      setGameRunning(false);
      gameRunningRef.current = false;
    }
  }, []);

  // Update the grid display
  const updateGrid = useCallback(
    (
      playerPosition,
      enemyPos,
      currentDirection,
      obstaclePositions,
      pathToHighlight = [],
      showPlayer = true
    ) => {
      let newGrid = initialGridData;

      // Clear any existing path highlights
      newGrid = clearHighlights(newGrid, "path-cell");

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

      // Highlight enemy path
      if (pathToHighlight.length > 0) {
        newGrid = highlightPath(newGrid, pathToHighlight, "path-cell");
      }

      // Place enemy
      newGrid = updatedBoardCell(
        newGrid,
        enemyPos,
        new CellTemplate("👹", "topdown-cell enemy-cell", false, true, 0, true)
      );

      // Place player character with rotation
      if (showPlayer) {
        const rotation = getDirectionRotation(currentDirection);
        newGrid = updatedBoardCell(
          newGrid,
          playerPosition,
          new CellTemplate(
            "⬆️",
            "topdown-cell character-cell",
            false,
            true,
            rotation,
            true
          )
        );
      }

      setGridData(newGrid);
    },
    [initialGridData]
  );

  // Enemy AI logic
  const moveEnemy = useCallback(() => {
    if (!gameRunningRef.current || gameOverRef.current) return;

    // build a fresh obstacle grid
    let obstacleGrid = initialGridData;
    obstacles.forEach(([r, c]) => {
      obstacleGrid = updatedBoardCell(
        obstacleGrid,
        [r, c],
        new CellTemplate(
          "",
          "topdown-cell obstacle-cell",
          false,
          true,
          0,
          false
        )
      );
    });

    // pathfind on the obstacle grid
    const { path, hasPath } = findPath(
      obstacleGrid,
      enemyPositionRef.current,
      characterPositionRef.current,
      (cell) => cell.isNavigable
    );

    if (!hasPath || path.length < 2) {
      checkGameOver();
      return;
    }

    const nextStep = getFirstStepInPath(path);
    const isStepValid = !obstacles.some(
      ([r, c]) => r === nextStep[0] && c === nextStep[1]
    );
    if (isStepValid) {
      enemyPositionRef.current = nextStep;
      setEnemyPosition(nextStep);
      setEnemyPath(path);
      setTimeout(checkGameOver, 50);
    }
  }, [initialGridData, obstacles, checkGameOver]);

  // Enemy AI loop
  useEffect(() => {
    let enemyInterval;

    if (gameRunning && !gameOver) {
      enemyInterval = setInterval(() => {
        moveEnemy();
      }, 1000); // Move every 1 second
    }

    return () => {
      if (enemyInterval) {
        clearInterval(enemyInterval);
      }
    };
  }, [gameRunning, gameOver, moveEnemy]);

  // Handle direction change from GridBoard
  const handleDirectionChange = useCallback(
    (newDirection) => {
      if (!gameRunning || gameOver) return;

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
    [gameRunning, gameOver, gridSize, obstacles]
  );

  // Handle continue forward from GridBoard
  const handleContinueForward = useCallback(() => {
    if (!gameRunning || gameOver) return;

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
  }, [gameRunning, gameOver, gridSize, obstacles]);

  // Start or restart game
  const startGame = useCallback(() => {
    // 1) Generate obstacles
    const newObstacles = generateObstacles();
    setObstacles(newObstacles);

    let obstacleGrid = initialGridData;
    newObstacles.forEach(([r, c]) => {
      obstacleGrid = updatedBoardCell(
        obstacleGrid,
        [r, c],
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

    // 3) Pathfinding
    const { path: initialPath } = findPath(
      obstacleGrid,
      initialEnemyPosition,
      initialPosition,
      (cell) => cell.isNavigable
    );
    setEnemyPath(initialPath);

    setEnemyPosition(initialEnemyPosition);
    setCharacterPosition(initialPosition);
    setDirection("RIGHT");
    setGameOver(false);
    gameOverRef.current = false;
    setGameRunning(true);

    gameRunningRef.current = true;
  }, [
    generateObstacles,
    initialGridData,
    initialEnemyPosition,
    initialPosition,
  ]);

  const stopGame = () => {
    setGameRunning(false);
    gameRunningRef.current = false;
  };

  // Update grid when positions, direction, obstacles, or enemy path change
  useEffect(() => {
    updateGrid(
      characterPosition,
      enemyPosition,
      direction,
      obstacles,
      enemyPath
    );
  }, [
    characterPosition,
    enemyPosition,
    direction,
    obstacles,
    enemyPath,
    updateGrid,
  ]);

  // Initialize the grid with obstacles
  useEffect(() => {
    const initialObstacles = generateObstacles();
    setObstacles(initialObstacles);
    updateGrid(
      initialPosition,
      initialEnemyPosition,
      "RIGHT",
      initialObstacles
    );
  }, [updateGrid, generateObstacles]);

  // Keep refs updated
  useEffect(() => {
    characterPositionRef.current = characterPosition;
  }, [characterPosition]);

  useEffect(() => {
    enemyPositionRef.current = enemyPosition;
  }, [enemyPosition]);

  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  useEffect(() => {
    if (!gameRunningRef.current || gameOverRef.current) return;

    const playerPos = characterPosition;
    const enemyPos = enemyPosition;

    if (playerPos[0] === enemyPos[0] && playerPos[1] === enemyPos[1]) {
      checkGameOver();
    }
  }, [characterPosition, enemyPosition]);

  // redraw board with no player on game over
  useEffect(() => {
    if (!gameOver) return;

    updateGrid(
      characterPosition,
      enemyPosition,
      direction,
      obstacles,
      [],
      false
    );
  }, [gameOver]);

  return (
    <div className="topdown-container">
      <h2>Top-Down Movement Demo</h2>
      <div style={{ marginBottom: "15px", textAlign: "center" }}>
        <p style={{ margin: "5px 0" }}>
          <strong>Position:</strong> [{characterPosition[0]},{" "}
          {characterPosition[1]}] |<strong> Direction:</strong> {direction}
        </p>
        <p style={{ margin: "5px 0" }}>
          <strong>Enemy Position:</strong> [{enemyPosition[0]},{" "}
          {enemyPosition[1]}]
        </p>
        {gameOver ? (
          <p style={{ color: "red", fontSize: "18px", fontWeight: "bold" }}>
            💀 Game Over! The enemy caught you!
          </p>
        ) : gameRunning ? (
          <p style={{ color: "green" }}>
            🎮 Use Arrow Keys or WASD to move! Avoid the enemy 👹
          </p>
        ) : (
          <p>Click Start to begin moving around! Avoid the enemy!</p>
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
          gameRunning={gameRunning && !gameOver}
          direction={direction}
        />
      </div>
    </div>
  );
};

export default TopDownBoard;
