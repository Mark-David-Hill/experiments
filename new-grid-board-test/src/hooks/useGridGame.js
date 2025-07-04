import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { initializeGridData } from "../utils/gridUtils";

export const useGridGame = ({
  gridSize,
  initializeCells,
  moveStep,
  onGameOver,
}) => {
  const initialGrid = useMemo(
    () => initializeGridData(gridSize, gridSize, initializeCells()),
    [gridSize, initializeCells]
  );
  const [gridData, setGridData] = useState(initialGrid);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const directionRef = useRef("RIGHT");
  const stateRefs = useRef({});

  // game loop
  useEffect(() => {
    if (!gameRunning || gameOver) return;
    const id = setInterval(() => {
      const next = moveStep(stateRefs.current, directionRef.current);

      if (next.gameOver) {
        setGameOver(true);
        setGameRunning(false);
        onGameOver?.(next);
        clearInterval(id);
        return;
      }

      stateRefs.current = next;
      setGridData(next.toGrid(initialGrid));
    }, 200);

    return () => clearInterval(id);
  }, [gameRunning, gameOver, moveStep, onGameOver, initialGrid]);

  // keyboard
  const handleDirectionChange = useCallback(
    (dir) => {
      if (!gameRunning || gameOver) return;
      directionRef.current = dir;
    },
    [gameRunning, gameOver]
  );

  // expose controls + bootstrap
  const start = () => {
    setGameOver(false);
    setGameRunning(true);
    const seed = moveStep(undefined, "INIT");
    stateRefs.current = seed;
    setGridData(seed.toGrid(initialGrid));
  };

  const stop = () => setGameRunning(false);

  return {
    gridData,
    gameRunning,
    gameOver,
    start,
    stop,
    handleDirectionChange,
  };
};
