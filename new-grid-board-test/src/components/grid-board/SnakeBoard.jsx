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

const GRID_SIZE = 12;
const OBSTACLE_COUNT = 8;
const MOVE_INTERVAL = 200;
const HIGH_SCORE_KEY = "snakeHighScore";

const getInitialSnake = () => {
  const mid = Math.floor(GRID_SIZE / 2);
  return [
    [mid, mid - 2],
    [mid, mid - 1],
    [mid, mid],
  ];
};

export default function SnakeBoard() {
  const initialGrid = useMemo(
    () =>
      initializeGridData(
        GRID_SIZE,
        GRID_SIZE,
        new CellTemplate("", "snake-cell", false, true, 0, true)
      ),
    []
  );

  const [gridData, setGridData] = useState(initialGrid);
  const [snake, setSnake] = useState(getInitialSnake());
  const [direction, setDirection] = useState("RIGHT");
  const [food, setFood] = useState(null);
  const [obstacles, setObstacles] = useState([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(
    () => parseInt(localStorage.getItem(HIGH_SCORE_KEY)) || 0
  );
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const snakeRef = useRef(snake);
  const dirRef = useRef(direction);
  const foodRef = useRef(food);
  const obsRef = useRef(obstacles);
  const runningRef = useRef(running);
  const overRef = useRef(gameOver);

  useEffect(() => {
    snakeRef.current = snake;
  }, [snake]);
  useEffect(() => {
    dirRef.current = direction;
  }, [direction]);
  useEffect(() => {
    foodRef.current = food;
  }, [food]);
  useEffect(() => {
    obsRef.current = obstacles;
  }, [obstacles]);
  useEffect(() => {
    runningRef.current = running;
  }, [running]);
  useEffect(() => {
    overRef.current = gameOver;
  }, [gameOver]);

  const generateObstacles = useCallback(() => {
    const exclude = new Set(getInitialSnake().map(([r, c]) => `${r},${c}`));
    const midRow = Math.floor(GRID_SIZE / 2);
    for (let c = 0; c < GRID_SIZE; c++) exclude.add(`${midRow},${c}`);
    const positions = Array.from(exclude).map((s) => s.split(",").map(Number));
    return generateRandomObstacles(GRID_SIZE, OBSTACLE_COUNT, positions);
  }, []);

  const generateFood = useCallback(() => {
    let pos;
    do {
      pos = [
        Math.floor(Math.random() * GRID_SIZE),
        Math.floor(Math.random() * GRID_SIZE),
      ];
    } while (
      snakeRef.current.some(([r, c]) => r === pos[0] && c === pos[1]) ||
      obsRef.current.some(([r, c]) => r === pos[0] && c === pos[1])
    );
    return pos;
  }, []);

  const updateGrid = useCallback(() => {
    let grid = initialGrid;
    obsRef.current.forEach(([r, c]) => {
      grid = updatedBoardCell(
        grid,
        [r, c],
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
    snakeRef.current.forEach(([r, c], idx) => {
      const isHead = idx === snakeRef.current.length - 1;
      grid = updatedBoardCell(
        grid,
        [r, c],
        new CellTemplate(
          isHead ? "🐍" : "●",
          isHead ? "snake-cell snake-head" : "snake-cell snake-body"
        )
      );
    });
    if (foodRef.current) {
      grid = updatedBoardCell(
        grid,
        foodRef.current,
        new CellTemplate("🍎", "snake-cell food-cell")
      );
    }
    setGridData(grid);
  }, [initialGrid]);

  const moveSnake = useCallback(() => {
    if (overRef.current || !runningRef.current) return;
    const body = [...snakeRef.current];
    let head = wrapPosition(
      getNextPosition(body[body.length - 1], dirRef.current, GRID_SIZE),
      GRID_SIZE
    );
    const hitSelf = body.some(([r, c]) => r === head[0] && c === head[1]);
    const hitObs = obsRef.current.some(
      ([r, c]) => r === head[0] && c === head[1]
    );
    if (hitSelf || hitObs) {
      setGameOver(true);
      setRunning(false);
      return;
    }
    const ate =
      foodRef.current &&
      head[0] === foodRef.current[0] &&
      head[1] === foodRef.current[1];
    const newSnake = ate ? [...body, head] : [...body.slice(1), head];
    setSnake(newSnake);
    if (ate) {
      setScore((s) => s + 10);
      const newFood = generateFood();
      setFood(newFood);
    }
  }, [generateFood]);

  const startGame = () => {
    const newSnake = getInitialSnake();
    setSnake(newSnake);
    snakeRef.current = newSnake;

    setDirection("RIGHT");
    dirRef.current = "RIGHT";

    const newObs = generateObstacles();
    setObstacles(newObs);
    obsRef.current = newObs;

    const newFood = generateFood();
    setFood(newFood);
    foodRef.current = newFood;

    setScore(0);
    setGameOver(false);
    overRef.current = false;
    setRunning(true);
    runningRef.current = true;

    updateGrid();
  };

  useEffect(() => {
    if (!running || gameOver) return;
    const id = setInterval(moveSnake, MOVE_INTERVAL);
    return () => clearInterval(id);
  }, [running, gameOver, moveSnake]);

  useEffect(updateGrid, [snake, food, obstacles, updateGrid]);

  useEffect(() => {
    if (gameOver && score > highScore) {
      setHighScore(score);
      localStorage.setItem(HIGH_SCORE_KEY, score.toString());
    }
  }, [gameOver, score, highScore]);

  const onDirectionChange = (newDir) => {
    const opposites = { UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT" };
    if (running && !gameOver && opposites[direction] !== newDir) {
      setDirection(newDir);
    }
  };

  return (
    <div style={{ padding: 20, textAlign: "center" }}>
      <h2>Snake Game</h2>
      <div style={{ marginBottom: 15 }}>
        <p style={{ margin: "5px 0" }}>
          <strong>Score: {score}</strong> | High Score: {highScore}
        </p>
        {gameOver ? (
          <p style={{ color: "red", fontSize: 18, fontWeight: "bold" }}>
            💀 Game Over! Final Score: {score}
          </p>
        ) : running ? (
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
            fontSize: 16,
            backgroundColor: running ? "#ff6b6b" : "#4ecdc4",
            color: "white",
            border: "none",
            borderRadius: 5,
            cursor: "pointer",
          }}
        >
          {running ? "Restart Game" : "Start Game"}
        </button>
      </div>
      <GridBoard
        gridData={gridData}
        enableKeyboardMovement
        onDirectionChange={onDirectionChange}
        gameRunning={running}
      />
    </div>
  );
}
