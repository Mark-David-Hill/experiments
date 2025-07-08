import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { GridBoard, CellTemplate } from "./GridBoard";
import {
  initializeGridData,
  updatedBoardCell,
  getNextPosition,
  wrapPosition,
  generateRandomObstacles,
} from "../../utils/gridUtils";

import { useGridGame } from "../../hooks/useGridGame";

const SnakeBoard = () => {
  const gridSize = 12;
  const initialGridData = useMemo(
    () =>
      initializeGridData(
        gridSize,
        gridSize,
        new CellTemplate("", "snake-cell", false, true, 0, true)
      ),
    [gridSize]
  );

  // Initial snake position (middle of the board)
  const initialSnake = [
    [Math.floor(gridSize / 2), Math.floor(gridSize / 2) - 2],
    [Math.floor(gridSize / 2), Math.floor(gridSize / 2) - 1],
    [Math.floor(gridSize / 2), Math.floor(gridSize / 2)],
  ];

  // Generate obstacles using the new utility function
  const generateObstacles = useCallback(() => {
    const initialSnakeRow = Math.floor(gridSize / 2);
    const excludePositions = [
      ...initialSnake,
      // Exclude the entire middle row to give snake room to start
      ...Array.from({ length: gridSize }, (_, col) => [initialSnakeRow, col]),
    ];

    return generateRandomObstacles(gridSize, 8, excludePositions);
  }, [gridSize]);

  const [gridData, setGridData] = useState(initialGridData);
  const [snake, setSnake] = useState(initialSnake);
  const [direction, setDirection] = useState("RIGHT");
  const [food, setFood] = useState(null);
  const [obstacles, setObstacles] = useState([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(
    parseInt(localStorage.getItem("snakeHighScore")) || 0
  );
  const [gameOver, setGameOver] = useState(false);
  const [gameRunning, setGameRunning] = useState(false);

  // Use refs to store current values for the game loop
  const snakeRef = useRef(initialSnake);
  const directionRef = useRef("RIGHT");
  const foodRef = useRef(null);
  const obstaclesRef = useRef([]);
  const gameRunningRef = useRef(false);
  const gameOverRef = useRef(false);

  // Generate random food position not on snake or obstacles
  const generateFood = useCallback(
    (currentSnake, currentObstacles) => {
      let newFood;
      let attempts = 0;
      do {
        newFood = [
          Math.floor(Math.random() * gridSize),
          Math.floor(Math.random() * gridSize),
        ];
        attempts++;
      } while (
        (currentSnake.some(([r, c]) => r === newFood[0] && c === newFood[1]) ||
          currentObstacles.some(
            ([r, c]) => r === newFood[0] && c === newFood[1]
          )) &&
        attempts < 100
      );
      return newFood;
    },
    [gridSize]
  );

  // Update the grid display
  const updateGrid = useCallback(
    (snakePositions, foodPosition, obstaclePositions) => {
      let newGrid = initialGridData;

      // Place obstacles with isNavigable = false
      obstaclePositions.forEach(([row, col]) => {
        newGrid = updatedBoardCell(
          newGrid,
          [row, col],
          new CellTemplate(
            "🚧",
            "snake-cell obstacle-cell",
            false,
            true,
            0,
            false
          )
        );
      });

      // Place snake
      snakePositions.forEach(([row, col], index) => {
        const isHead = index === snakePositions.length - 1;
        newGrid = updatedBoardCell(
          newGrid,
          [row, col],
          new CellTemplate(
            isHead ? "🐍" : "●",
            isHead ? "snake-cell snake-head" : "snake-cell snake-body"
          )
        );
      });

      // Place food
      if (foodPosition) {
        newGrid = updatedBoardCell(
          newGrid,
          foodPosition,
          new CellTemplate("🍎", "snake-cell food-cell")
        );
      }

      setGridData(newGrid);
    },
    [initialGridData]
  );

  // Handle direction change from GridBoard (with snake-specific logic)
  const handleDirectionChange = useCallback((newDirection) => {
    if (!gameRunningRef.current || gameOverRef.current) return;

    const currentDirection = directionRef.current;

    // Prevent reversing into itself
    const opposites = {
      UP: "DOWN",
      DOWN: "UP",
      LEFT: "RIGHT",
      RIGHT: "LEFT",
    };

    if (opposites[currentDirection] !== newDirection) {
      directionRef.current = newDirection;
      setDirection(newDirection);
    }
  }, []);

  // Move the snake
  const moveSnake = useCallback(() => {
    if (gameOverRef.current || !gameRunningRef.current) return;

    const currentSnake = [...snakeRef.current];
    const head = currentSnake[currentSnake.length - 1];

    // Use the new utility function
    let newHead = getNextPosition(head, directionRef.current, gridSize);

    // Wrap around the play-field
    newHead = wrapPosition(newHead, gridSize);

    // Check self-collision and obstacle collision
    if (
      currentSnake.some(([r, c]) => r === newHead[0] && c === newHead[1]) ||
      obstaclesRef.current.some(
        ([r, c]) => r === newHead[0] && c === newHead[1]
      )
    ) {
      gameOverRef.current = true;
      setGameOver(true);
      setGameRunning(false);
      return;
    }

    // Calculate new snake state
    let newSnake = [...currentSnake, newHead];

    // Check if ate food
    if (
      foodRef.current &&
      newHead[0] === foodRef.current[0] &&
      newHead[1] === foodRef.current[1]
    ) {
      setScore((prev) => prev + 10);
      const newFood = generateFood(newSnake, obstaclesRef.current);
      foodRef.current = newFood;
      setFood(newFood);
    } else {
      // Remove tail if didn't eat
      newSnake.shift();
    }

    // Update refs and state
    snakeRef.current = newSnake;
    setSnake(newSnake);
  }, [generateFood, gridSize]);

  // Start or restart game
  const startGame = () => {
    const newSnake = [...initialSnake];
    const newObstacles = generateObstacles();
    const newFood = generateFood(newSnake, newObstacles);

    // Update state
    setSnake(newSnake);
    setDirection("RIGHT");
    setFood(newFood);
    setObstacles(newObstacles);
    setScore(0);
    setGameOver(false);
    setGameRunning(true);

    // Update refs
    snakeRef.current = newSnake;
    directionRef.current = "RIGHT";
    foodRef.current = newFood;
    obstaclesRef.current = newObstacles;
    gameRunningRef.current = true;
    gameOverRef.current = false;

    updateGrid(newSnake, newFood, newObstacles);
  };

  // Game loop
  useEffect(() => {
    let gameInterval;

    if (gameRunning && !gameOver) {
      gameInterval = setInterval(moveSnake, 200);
    }

    return () => {
      if (gameInterval) {
        clearInterval(gameInterval);
      }
    };
  }, [gameRunning, gameOver, moveSnake]);

  // Update grid when snake, food, or obstacles change
  useEffect(() => {
    updateGrid(snake, food, obstacles);
  }, [snake, food, obstacles, updateGrid]);

  // Handle game over
  useEffect(() => {
    if (gameOver) {
      gameRunningRef.current = false;

      // Update high score
      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem("snakeHighScore", score.toString());
      }
    }
  }, [gameOver, score, highScore]);

  // Initialize food and obstacles on first load
  useEffect(() => {
    if (!food && obstacles.length === 0) {
      const newObstacles = generateObstacles();
      const newFood = generateFood(initialSnake, newObstacles);
      setObstacles(newObstacles);
      setFood(newFood);
      obstaclesRef.current = newObstacles;
      foodRef.current = newFood;
    }
  }, [food, obstacles.length, generateFood, generateObstacles]);

  return (
    <div className="snake-container">
      <h2>Snake Game</h2>
      <div style={{ marginBottom: "15px", textAlign: "center" }}>
        <p style={{ margin: "5px 0" }}>
          <strong>Score: {score}</strong> | High Score: {highScore}
        </p>
        {gameOver ? (
          <p style={{ color: "red", fontSize: "18px", fontWeight: "bold" }}>
            💀 Game Over! Final Score: {score}
          </p>
        ) : gameRunning ? (
          <p style={{ color: "green" }}>
            🎮 Use Arrow Keys or WASD to move | Snake wraps around edges!
          </p>
        ) : (
          <p>Click Start Game to begin! Avoid the obstacles 🚧</p>
        )}
        <button
          onClick={startGame}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            backgroundColor: gameRunning ? "#ff6b6b" : "#4ecdc4",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          {gameRunning ? "Restart Game" : "Start Game"}
        </button>
      </div>
      <div className="snake-board">
        <GridBoard
          gridData={gridData}
          enableKeyboardMovement={true}
          onDirectionChange={handleDirectionChange}
          gameRunning={gameRunning}
        />
      </div>
    </div>
  );
};

export default SnakeBoard;
