import React, { useState, useEffect } from "react";
import { GridBoard, CellTemplate } from "./GridBoard";
import { initializeGridData, updatedBoardCell } from "../../utils/gridUtils";

const CheckersBoard = () => {
  const gridSize = 8;
  const initialGridData = initializeGridData(
    gridSize,
    gridSize,
    new CellTemplate("", "light checkers-cell")
  );

  // Set up initial board with proper checkerboard pattern
  const setupInitialBoard = () => {
    let grid = initialGridData;

    // Create checkerboard pattern
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const isLight = (row + col) % 2 === 0;
        grid = updatedBoardCell(
          grid,
          [row, col],
          new CellTemplate("", `${isLight ? "light" : "dark"} checkers-cell`)
        );
      }
    }

    // Place red pieces (top 3 rows, only on dark squares)
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < gridSize; col++) {
        if ((row + col) % 2 === 1) {
          grid = updatedBoardCell(
            grid,
            [row, col],
            new CellTemplate("●", "dark red-piece checkers-cell")
          );
        }
      }
    }

    // Place black pieces (bottom 3 rows, only on dark squares)
    for (let row = 5; row < 8; row++) {
      for (let col = 0; col < gridSize; col++) {
        if ((row + col) % 2 === 1) {
          grid = updatedBoardCell(
            grid,
            [row, col],
            new CellTemplate("●", "dark black-piece checkers-cell")
          );
        }
      }
    }

    return grid;
  };

  const [gridData, setGridData] = useState(setupInitialBoard());
  const [currentTurn, setCurrentTurn] = useState("black");
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [possibleMoves, setPossibleMoves] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);

  // Check if a position is within bounds
  const isValidPosition = (row, col) => {
    return row >= 0 && row < gridSize && col >= 0 && col < gridSize;
  };

  // Check if a cell contains a piece of the current player
  const isCurrentPlayerPiece = (row, col) => {
    const cell = gridData[row][col];
    if (currentTurn === "black") {
      return (
        cell.classNames.includes("black-piece") ||
        cell.classNames.includes("black-king")
      );
    } else {
      return (
        cell.classNames.includes("red-piece") ||
        cell.classNames.includes("red-king")
      );
    }
  };

  // Check if a cell contains an opponent's piece
  const isOpponentPiece = (row, col) => {
    const cell = gridData[row][col];
    if (currentTurn === "black") {
      return (
        cell.classNames.includes("red-piece") ||
        cell.classNames.includes("red-king")
      );
    } else {
      return (
        cell.classNames.includes("black-piece") ||
        cell.classNames.includes("black-king")
      );
    }
  };

  // Check if a cell is empty (only has light or dark class)
  const isEmpty = (row, col) => {
    return gridData[row][col].text === "";
  };

  // Get possible moves for a piece
  const getPossibleMoves = (row, col) => {
    const cell = gridData[row][col];
    const isKing = cell.classNames.includes("king");
    const moves = [];
    const jumps = [];

    // Determine movement directions
    let directions = [];
    if (currentTurn === "black" || isKing) {
      directions.push([-1, -1], [-1, 1]); // Move up
    }
    if (currentTurn === "red" || isKing) {
      directions.push([1, -1], [1, 1]); // Move down
    }

    directions.forEach(([rowDir, colDir]) => {
      const newRow = row + rowDir;
      const newCol = col + colDir;

      // Regular move
      if (isValidPosition(newRow, newCol) && isEmpty(newRow, newCol)) {
        moves.push([newRow, newCol, "move"]);
      }

      // Jump move
      const jumpRow = row + 2 * rowDir;
      const jumpCol = col + 2 * colDir;

      if (
        isValidPosition(newRow, newCol) &&
        isValidPosition(jumpRow, jumpCol) &&
        isOpponentPiece(newRow, newCol) &&
        isEmpty(jumpRow, jumpCol)
      ) {
        jumps.push([jumpRow, jumpCol, "jump", newRow, newCol]);
      }
    });

    // If jumps are available, only return jumps (forced jumps rule)
    return jumps.length > 0 ? jumps : moves;
  };

  // Update grid to show possible moves
  const updateGridWithMoves = (moves) => {
    let newGrid = gridData.map((row) =>
      row.map((cell) => ({
        ...cell,
        classNames: cell.classNames
          .replace(" possible-move", "")
          .replace(" selected", ""),
      }))
    );

    // Highlight selected piece
    if (selectedPiece) {
      const [row, col] = selectedPiece;
      const cell = newGrid[row][col];
      newGrid[row][col] = {
        ...cell,
        classNames: cell.classNames + " selected",
      };
    }

    // Highlight possible moves
    moves.forEach(([row, col]) => {
      const cell = newGrid[row][col];
      newGrid[row][col] = {
        ...cell,
        classNames: cell.classNames + " possible-move",
      };
    });

    setGridData(newGrid);
  };

  // Handle cell click
  const handleCellClick = (row, col) => {
    if (gameOver) return;

    // If a piece is selected, try to move it
    if (selectedPiece) {
      const [selectedRow, selectedCol] = selectedPiece;
      const moveData = possibleMoves.find(([r, c]) => r === row && c === col);

      if (moveData) {
        let newGrid = gridData.map((row) =>
          row.map((cell) => ({
            ...cell,
            classNames: cell.classNames
              .replace(" possible-move", "")
              .replace(" selected", ""),
          }))
        );

        const piece = newGrid[selectedRow][selectedCol];
        const [, , moveType, jumpedRow, jumpedCol] = moveData;

        // Move the piece
        newGrid[row][col] = {
          ...piece,
          classNames: piece.classNames.replace(" selected", ""),
        };

        // Clear original position
        const isLight = (selectedRow + selectedCol) % 2 === 0;
        newGrid[selectedRow][selectedCol] = new CellTemplate(
          "",
          `${isLight ? "light" : "dark"} checkers-cell`
        );

        // Remove jumped piece if it was a jump
        if (moveType === "jump") {
          const isLightJumped = (jumpedRow + jumpedCol) % 2 === 0;
          newGrid[jumpedRow][jumpedCol] = new CellTemplate(
            "",
            `${isLightJumped ? "light" : "dark"} checkers-cell`
          );
        }

        // Check for king promotion
        const shouldPromote =
          (currentTurn === "black" && row === 0) ||
          (currentTurn === "red" && row === 7);
        if (shouldPromote && !piece.classNames.includes("king")) {
          newGrid[row][col] = {
            ...newGrid[row][col],
            text: "♔",
            classNames: newGrid[row][col].classNames.replace("piece", "king"),
          };
        }

        setGridData(newGrid);
        setSelectedPiece(null);
        setPossibleMoves([]);

        // Switch turns
        setCurrentTurn(currentTurn === "black" ? "red" : "black");
      } else {
        // Invalid move or selecting a new piece
        if (isCurrentPlayerPiece(row, col)) {
          const moves = getPossibleMoves(row, col);
          if (moves.length > 0) {
            setSelectedPiece([row, col]);
            setPossibleMoves(moves);
            updateGridWithMoves(moves);
          }
        } else {
          setSelectedPiece(null);
          setPossibleMoves([]);
          updateGridWithMoves([]);
        }
      }
    } else {
      // No piece selected, try to select this one
      if (isCurrentPlayerPiece(row, col)) {
        const moves = getPossibleMoves(row, col);
        if (moves.length > 0) {
          setSelectedPiece([row, col]);
          setPossibleMoves(moves);
          updateGridWithMoves(moves);
        }
      }
    }
  };

  useEffect(() => {
    updateGridWithMoves(possibleMoves);
  }, [selectedPiece, possibleMoves]);

  // Check for game over
  useEffect(() => {
    let blackPieces = 0;
    let redPieces = 0;
    let currentPlayerCanMove = false;

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const cell = gridData[row][col];
        if (cell.classNames.includes("black")) {
          blackPieces++;
        } else if (cell.classNames.includes("red")) {
          redPieces++;
        }

        if (isCurrentPlayerPiece(row, col) && !currentPlayerCanMove) {
          currentPlayerCanMove = getPossibleMoves(row, col).length > 0;
        }
      }
    }

    if (blackPieces === 0) {
      setGameOver(true);
      setWinner("Red");
    } else if (redPieces === 0) {
      setGameOver(true);
      setWinner("Black");
    } else if (!currentPlayerCanMove) {
      setGameOver(true);
      setWinner(currentTurn === "black" ? "Red" : "Black");
    }
  }, [gridData, currentTurn]);

  const resetGame = () => {
    setGridData(setupInitialBoard());
    setCurrentTurn("black");
    setSelectedPiece(null);
    setPossibleMoves([]);
    setGameOver(false);
    setWinner(null);
  };

  return (
    <div className="checkers-container">
      <h2>Checkers</h2>
      <div style={{ marginBottom: "10px", textAlign: "center" }}>
        <p>
          Current Turn:{" "}
          <strong>{currentTurn === "black" ? "Black" : "Red"}</strong>
        </p>
        {gameOver ? (
          <p style={{ color: "green", fontSize: "18px", fontWeight: "bold" }}>
            🎉 {winner} wins! 🎉
          </p>
        ) : (
          <p>Click a piece to select it, then click where you want to move</p>
        )}
        <button
          onClick={resetGame}
          style={{ padding: "10px 20px", fontSize: "16px" }}
        >
          New Game
        </button>
      </div>
      <div className="checkers-board">
        <GridBoard gridData={gridData} onCellClick={handleCellClick} />
      </div>
    </div>
  );
};

export default CheckersBoard;
