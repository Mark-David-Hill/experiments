// Grid layout: w = wall, f = floor, p1 = player 1, p2 = player 2
const gridLayout = [
  ["w", "w", "w", "w", "w", "w", "w"],
  ["w", "p1", "f", "f", "f", "f", "w"],
  ["w", "f", "w", "f", "w", "f", "w"],
  ["w", "f", "f", "f", "f", "f", "w"],
  ["w", "f", "w", "f", "w", "f", "w"],
  ["w", "f", "f", "f", "f", "p2", "w"],
  ["w", "w", "w", "w", "w", "w", "w"],
];

const GRID_SIZE = 7;
const ACTIONS_PER_TURN = 5;
const AI_ACTION_DELAY = 500; // Milliseconds between AI actions

// Player types configuration
let playerTypes = {
  p1: null, // "human" or "ai"
  p2: null, // "human" or "ai"
};

// AI difficulty levels
let aiDifficulty = {
  p1: "easy", // "easy", "medium", or "hard"
  p2: "easy",
};

// Game state
let gameState = {
  currentPlayer: "p1",
  actionsRemaining: ACTIONS_PER_TURN,
  playerPositions: {
    p1: { row: 1, col: 1 },
    p2: { row: 5, col: 5 },
  },
  playerDirections: {
    p1: "right", // "up", "down", "left", "right"
    p2: "left",
  },
  moveHistory: {
    p1: [{ row: 1, col: 1 }], // History of positions this turn
    p2: [{ row: 5, col: 5 }],
  },
  highlightOrigin: {
    p1: { row: 1, col: 1 }, // Origin for highlighting (starts at turn start, updates on bomb actions)
    p2: { row: 5, col: 5 },
  },
  highlightActionsRemaining: {
    p1: ACTIONS_PER_TURN, // Actions remaining when highlighting was last calculated
    p2: ACTIONS_PER_TURN,
  },
  visitedSpaces: {
    p1: new Set(), // Spaces visited this turn (reset on bomb actions)
    p2: new Set(),
  },
  bombs: [], // Array of {row, col, timer}
  grid: [], // 2D array representing the current grid state
  gameOver: false,
  winner: null, // "p1", "p2", or "tie"
  isProcessingTurn: false, // Flag to prevent input during AI turns
};

// Add helper function to find kickable bombs around a position
function getKickableBombs(row, col) {
  const kickableBombs = [];
  const directions = [
    { dr: -1, dc: 0, dir: "up" },
    { dr: 1, dc: 0, dir: "down" },
    { dr: 0, dc: -1, dir: "left" },
    { dr: 0, dc: 1, dir: "right" },
  ];

  for (const { dr, dc, dir } of directions) {
    const checkRow = row + dr;
    const checkCol = col + dc;
    const bomb = getBombAt(checkRow, checkCol);

    if (bomb && canBombBeKicked(checkRow, checkCol, dir)) {
      kickableBombs.push({
        row: checkRow,
        col: checkCol,
        direction: dir,
        bomb: bomb,
      });
    }
  }

  return kickableBombs;
}

// Add this helper function to check if a bomb can be kicked in a direction
function canBombBeKicked(bombRow, bombCol, direction) {
  const offset = getDirectionOffset(direction);
  const nextRow = bombRow + offset.dr;
  const nextCol = bombCol + offset.dc;

  // Check if the next position would block the bomb
  const nextCellType = getCellType(nextRow, nextCol);
  const nextHasBomb = findBombAt(nextRow, nextCol) !== -1;

  // Bomb can't be kicked if there's an obstacle immediately behind it
  if (
    nextCellType === "w" ||
    nextCellType === "p1" ||
    nextCellType === "p2" ||
    nextHasBomb
  ) {
    return false;
  }

  return true;
}

// Initialize player selection
function initializePlayerSelection() {
  const playerTypeBtns = document.querySelectorAll(".player-type-btn");
  const startBtn = document.getElementById("start-game-btn");

  playerTypeBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const player = e.target.dataset.player;
      const type = e.target.dataset.type;

      // Remove active class from other buttons for this player
      document
        .querySelectorAll(`.player-type-btn[data-player="${player}"]`)
        .forEach((b) => {
          b.classList.remove("active");
        });

      // Add active class to clicked button
      e.target.classList.add("active");

      // Set player type
      playerTypes[player] = type;

      // Show/hide difficulty selector
      const difficultyDiv = document.getElementById(`${player}-difficulty`);
      if (type === "ai") {
        difficultyDiv.style.display = "block";
      } else {
        difficultyDiv.style.display = "none";
      }

      // Enable start button if both players selected
      if (playerTypes.p1 && playerTypes.p2) {
        startBtn.disabled = false;
      }
    });
  });

  // Handle difficulty selection
  document.querySelectorAll(".difficulty-select").forEach((select) => {
    select.addEventListener("change", (e) => {
      const player = e.target.dataset.player;
      aiDifficulty[player] = e.target.value;
    });
  });

  startBtn.addEventListener("click", startGame);

  document.getElementById("restart-btn").addEventListener("click", () => {
    document.getElementById("game-screen").style.display = "none";
    document.getElementById("player-selection").style.display = "block";
    resetPlayerSelection();
  });
}

function resetPlayerSelection() {
  playerTypes.p1 = null;
  playerTypes.p2 = null;
  aiDifficulty.p1 = "easy";
  aiDifficulty.p2 = "easy";
  document.querySelectorAll(".player-type-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  document.querySelectorAll(".ai-difficulty").forEach((div) => {
    div.style.display = "none";
  });
  document.querySelectorAll(".difficulty-select").forEach((select) => {
    select.value = "easy";
  });
  document.getElementById("start-game-btn").disabled = true;
}

function startGame() {
  // Hide selection screen, show game screen
  document.getElementById("player-selection").style.display = "none";
  document.getElementById("game-screen").style.display = "block";

  // Update player type display
  let p1TypeStr =
    playerTypes.p1 === "human" ? "Human" : `AI (${aiDifficulty.p1})`;
  let p2TypeStr =
    playerTypes.p2 === "human" ? "Human" : `AI (${aiDifficulty.p2})`;

  document.getElementById("p1-type").textContent = p1TypeStr;
  document.getElementById("p2-type").textContent = p2TypeStr;

  // Reset game state
  resetGameState();
  initializeGridState();
  renderGrid();
  updateUI();

  // Start AI turn if first player is AI
  if (playerTypes[gameState.currentPlayer] === "ai") {
    setTimeout(() => processAITurn(), 1000);
  }
}

function resetGameState() {
  gameState = {
    currentPlayer: "p1",
    actionsRemaining: ACTIONS_PER_TURN,
    playerPositions: {
      p1: { row: 1, col: 1 },
      p2: { row: 5, col: 5 },
    },
    playerDirections: {
      p1: "right",
      p2: "left",
    },
    moveHistory: {
      p1: [{ row: 1, col: 1 }],
      p2: [{ row: 5, col: 5 }],
    },
    highlightOrigin: {
      p1: { row: 1, col: 1 },
      p2: { row: 5, col: 5 },
    },
    highlightActionsRemaining: {
      p1: ACTIONS_PER_TURN,
      p2: ACTIONS_PER_TURN,
    },
    visitedSpaces: {
      p1: new Set(),
      p2: new Set(),
    },
    bombs: [],
    grid: [],
    gameOver: false,
    winner: null,
    isProcessingTurn: false,
  };
}

// AI Utility Functions for analyzing threats and opportunities
function getExplosionRange(bombRow, bombCol) {
  const cells = new Set();
  cells.add(`${bombRow},${bombCol}`);

  // Check all 4 directions
  const directions = [
    { dr: -1, dc: 0 }, // up
    { dr: 1, dc: 0 }, // down
    { dr: 0, dc: -1 }, // left
    { dr: 0, dc: 1 }, // right
  ];

  for (const dir of directions) {
    let currentRow = bombRow;
    let currentCol = bombCol;

    while (true) {
      currentRow += dir.dr;
      currentCol += dir.dc;

      // Stop at walls
      if (getCellType(currentRow, currentCol) === "w") {
        break;
      }

      cells.add(`${currentRow},${currentCol}`);

      // Check if there's another bomb here (for chain reaction detection)
      const bombAtPos = getBombAt(currentRow, currentCol);
      if (bombAtPos) {
        break; // Explosion stops at bombs but will trigger them
      }
    }
  }

  return cells;
}

function getAllThreatenedCells(turnsInFuture = 0) {
  const threatenedCells = new Set();
  const processedBombs = new Set();
  const bombsToProcess = [];

  // Find all bombs that will explode within the specified turns
  for (const bomb of gameState.bombs) {
    if (bomb.timer <= turnsInFuture + 1) {
      bombsToProcess.push({ row: bomb.row, col: bomb.col, timer: bomb.timer });
    }
  }

  // Process bombs and chain reactions
  while (bombsToProcess.length > 0) {
    const bomb = bombsToProcess.shift();
    const key = `${bomb.row},${bomb.col}`;

    if (processedBombs.has(key)) continue;
    processedBombs.add(key);

    const explosionCells = getExplosionRange(bomb.row, bomb.col);

    // Add all cells to threatened set
    explosionCells.forEach((cell) => threatenedCells.add(cell));

    // Check for chain reactions
    for (const cellKey of explosionCells) {
      const [r, c] = cellKey.split(",").map(Number);
      const bombAtCell = getBombAt(r, c);
      if (bombAtCell && !processedBombs.has(cellKey)) {
        // This bomb will be triggered, add it to process queue
        bombsToProcess.push({ row: r, col: c, timer: bombAtCell.timer });
      }
    }
  }

  return threatenedCells;
}

// Update isSafePosition to be more thorough
function isSafePosition(row, col, turnsInFuture = 0) {
  const threatenedCells = getAllThreatenedCells(turnsInFuture);
  return !threatenedCells.has(`${row},${col}`);
}

// Update willBeSafeAfterBombAction to handle the no-bombs case better
function willBeSafeAfterBombAction(
  player,
  actionType,
  bombPos,
  remainingActions
) {
  const currentPos = gameState.playerPositions[player];

  // If placing a bomb and there are no other bombs, simplified check
  if (actionType === "place" && gameState.bombs.length === 0) {
    // With a new bomb timer of 4, we only need to worry if we have very few actions left
    // We need at least 1 action to move away from a bomb we just placed
    if (remainingActions <= 1) {
      // Check if we have at least one valid move away
      const validMoves = getValidMoves(player);
      return validMoves.size > 0;
    }
    return true; // Safe to place if we have actions to move away
  }

  // For other cases, do the full simulation
  const originalBombs = [...gameState.bombs];

  if (actionType === "place") {
    gameState.bombs.push({ row: bombPos.row, col: bombPos.col, timer: 4 });
  } else if (actionType === "kick") {
    // Find the bomb being kicked
    const bombIndex = findBombAt(bombPos.row, bombPos.col);
    if (bombIndex !== -1) {
      const direction = gameState.playerDirections[player];
      const finalPos = simulateBombKick(bombPos.row, bombPos.col, direction);
      gameState.bombs[bombIndex] = {
        ...gameState.bombs[bombIndex],
        row: finalPos.row,
        col: finalPos.col,
      };
    }
  }

  // Check if current position is safe considering the new bomb configuration
  let isSafe = false;

  // For Hard AI, check chain reactions (turnsInFuture = 1)
  const turnsToCheck = aiDifficulty[player] === "hard" ? 1 : 0;

  // First check if current position will be safe
  if (isSafePosition(currentPos.row, currentPos.col, turnsToCheck)) {
    isSafe = true;
  } else {
    // Current position not safe - check if we can reach a safe position
    const safePositions = findSafePositions(
      currentPos.row,
      currentPos.col,
      remainingActions - 1
    );
    isSafe = safePositions.length > 0;
  }

  // Restore original bomb state
  gameState.bombs = originalBombs;

  return isSafe;
}

// Add helper function to choose best move when all moves are dangerous
function chooseLeastDangerousMove(player, moves, remainingActions) {
  let bestMove = null;
  let bestScore = -Infinity;

  for (const moveKey of moves) {
    const [row, col] = moveKey.split(",").map(Number);
    let score = 0;

    // Check how many future escape routes this position has
    const futureReachable = getReachableWithinMoves(
      player,
      remainingActions - 1,
      { row, col }
    );
    score += futureReachable.size * 10;

    // Check if we can eventually reach safety from here
    const eventualSafePositions = findSafePositions(
      row,
      col,
      remainingActions - 1
    );
    score += eventualSafePositions.length * 20;

    // Prefer moves away from bombs
    for (const bomb of gameState.bombs) {
      const distance = Math.abs(bomb.row - row) + Math.abs(bomb.col - col);
      score += distance * (5 - bomb.timer); // More urgent bombs have higher weight
    }

    if (score > bestScore) {
      bestScore = score;
      bestMove = { row, col };
    }
  }

  return bestMove;
}

function findSafePositions(fromRow, fromCol, maxMoves) {
  const safePositions = [];
  const reachable = getReachableWithinMoves(gameState.currentPlayer, maxMoves, {
    row: fromRow,
    col: fromCol,
  });

  for (const posKey of reachable) {
    const [r, c] = posKey.split(",").map(Number);
    const difficulty = aiDifficulty[gameState.currentPlayer];

    let isSafe = false;
    if (difficulty === "medium") {
      // Medium AI only checks immediate threats
      isSafe = isSafePosition(r, c, 0);
    } else if (difficulty === "hard") {
      // Hard AI checks for chain reactions too
      isSafe = isSafePosition(r, c, 1);
    }

    if (isSafe) {
      safePositions.push({ row: r, col: c });
    }
  }

  return safePositions;
}

function getPathToPosition(fromRow, fromCol, toRow, toCol, maxMoves) {
  // BFS to find shortest path
  const queue = [{ row: fromRow, col: fromCol, path: [], moves: 0 }];
  const visited = new Set();
  visited.add(`${fromRow},${fromCol}`);

  while (queue.length > 0) {
    const current = queue.shift();

    if (current.row === toRow && current.col === toCol) {
      return current.path;
    }

    if (current.moves >= maxMoves) continue;

    const directions = [
      { dr: -1, dc: 0, dir: "up" },
      { dr: 1, dc: 0, dir: "down" },
      { dr: 0, dc: -1, dir: "left" },
      { dr: 0, dc: 1, dir: "right" },
    ];

    for (const { dr, dc, dir } of directions) {
      const newRow = current.row + dr;
      const newCol = current.col + dc;
      const key = `${newRow},${newCol}`;

      if (visited.has(key)) continue;

      if (!isObstacle(newRow, newCol)) {
        visited.add(key);
        queue.push({
          row: newRow,
          col: newCol,
          path: [...current.path, { row: newRow, col: newCol, direction: dir }],
          moves: current.moves + 1,
        });
      }
    }
  }

  return null;
}

function evaluateOffensiveMove(action, player) {
  // For Hard AI - evaluate if an action puts opponent in danger
  const opponent = player === "p1" ? "p2" : "p1";
  const opponentPos = gameState.playerPositions[opponent];
  let score = 0;

  if (action.type === "placeBomb") {
    // Simulate placing bomb and check if opponent would be threatened
    const front = getFrontCell(player);
    const bombRange = getExplosionRange(front.row, front.col);

    // Check if opponent is in range
    if (bombRange.has(`${opponentPos.row},${opponentPos.col}`)) {
      score += 50;
    }

    // Check if opponent would have limited escape routes
    const opponentSafePositions = findSafePositionsAfterBomb(
      opponentPos.row,
      opponentPos.col,
      ACTIONS_PER_TURN,
      { row: front.row, col: front.col, timer: 4 }
    );

    if (opponentSafePositions.length === 0) {
      score += 100; // Opponent would be trapped
    } else if (opponentSafePositions.length <= 2) {
      score += 25; // Limited escape options
    }
  } else if (action.type === "kickBomb") {
    // Evaluate kicking bomb toward opponent
    const front = getFrontCell(player);
    const bombAtFront = getBombAt(front.row, front.col);
    if (bombAtFront) {
      const kickDirection = gameState.playerDirections[player];
      const finalPos = simulateBombKick(front.row, front.col, kickDirection);
      const bombRange = getExplosionRange(finalPos.row, finalPos.col);

      if (bombRange.has(`${opponentPos.row},${opponentPos.col}`)) {
        score += 30;
        if (bombAtFront.timer <= 2) {
          score += 20; // More urgent threat
        }
      }
    }
  }

  return score;
}

function findSafePositionsAfterBomb(fromRow, fromCol, maxMoves, newBomb) {
  // Simulate board state with additional bomb
  const tempBombs = [...gameState.bombs, newBomb];
  const originalBombs = gameState.bombs;
  gameState.bombs = tempBombs;

  const safePositions = findSafePositions(fromRow, fromCol, maxMoves);

  // Restore original state
  gameState.bombs = originalBombs;

  return safePositions;
}

function simulateBombKick(bombRow, bombCol, direction) {
  const offset = getDirectionOffset(direction);
  let currentRow = bombRow;
  let currentCol = bombCol;

  while (true) {
    const nextRow = currentRow + offset.dr;
    const nextCol = currentCol + offset.dc;

    const nextCellType = getCellType(nextRow, nextCol);
    const nextHasBomb = findBombAt(nextRow, nextCol) !== -1;

    if (
      nextCellType === "w" ||
      nextCellType === "p1" ||
      nextCellType === "p2" ||
      nextHasBomb
    ) {
      break;
    }

    currentRow = nextRow;
    currentCol = nextCol;
  }

  return { row: currentRow, col: currentCol };
}

// AI Logic Functions
async function processAITurn() {
  if (gameState.gameOver || playerTypes[gameState.currentPlayer] !== "ai") {
    return;
  }

  gameState.isProcessingTurn = true;
  const difficulty = aiDifficulty[gameState.currentPlayer];

  // Determine AI behavior based on difficulty
  if (difficulty === "easy") {
    // Easy AI - random moves
    await processEasyAI();
  } else if (difficulty === "medium") {
    // Medium AI - defensive
    await processMediumAI();
  } else if (difficulty === "hard") {
    // Hard AI - defensive + offensive
    await processHardAI();
  }

  gameState.isProcessingTurn = false;

  // End turn if not already ended
  if (!gameState.gameOver && gameState.actionsRemaining >= 0) {
    endTurn();
  }
}

// Update processEasyAI
async function processEasyAI() {
  let noActionTurns = 0; // Track consecutive turns with no valid actions

  while (gameState.actionsRemaining > 0 && !gameState.gameOver) {
    const actions = getAvailableAIActions(gameState.currentPlayer);

    // If no actions available, check for kickable bombs when stuck
    if (actions.length === 0) {
      const pos = gameState.playerPositions[gameState.currentPlayer];
      const kickableBombs = getKickableBombs(pos.row, pos.col);

      if (kickableBombs.length > 0) {
        // Pick a random kickable bomb
        const bombToKick =
          kickableBombs[Math.floor(Math.random() * kickableBombs.length)];

        // Turn to face the bomb if needed
        const currentDir = gameState.playerDirections[gameState.currentPlayer];
        if (currentDir !== bombToKick.direction) {
          changeDirection(gameState.currentPlayer, bombToKick.direction);
          await new Promise((resolve) =>
            setTimeout(resolve, AI_ACTION_DELAY / 2)
          );
        }

        // Kick the bomb
        kickBombInFront();
        await new Promise((resolve) => setTimeout(resolve, AI_ACTION_DELAY));
        noActionTurns = 0;
      } else {
        // No valid actions and no kickable bombs - end turn
        break;
      }
    } else {
      // Take a random action from available actions
      const action = actions[Math.floor(Math.random() * actions.length)];
      const actionTaken = executeAIAction(action, gameState.currentPlayer);

      if (!actionTaken) {
        noActionTurns++;
        if (noActionTurns > 3) {
          // Safety check: if we can't take actions for several attempts, end turn
          break;
        }
      } else {
        noActionTurns = 0;
      }

      await new Promise((resolve) => setTimeout(resolve, AI_ACTION_DELAY));
    }
  }
}

// Update processMediumAI to handle stuck situations
async function processMediumAI() {
  const player = gameState.currentPlayer;
  let pos = gameState.playerPositions[player];
  let moveAttempts = 0; // Track attempts to prevent infinite loops

  // First priority: ensure we end in a safe position
  let currentlySafe = isSafePosition(pos.row, pos.col, 0);

  if (!currentlySafe) {
    // Find safe positions we can reach with ALL remaining actions
    const safePositions = findSafePositions(
      pos.row,
      pos.col,
      gameState.actionsRemaining
    );

    if (safePositions.length > 0) {
      // Find the closest safe position
      let closestSafe = null;
      let shortestPath = null;
      let shortestDistance = Infinity;

      for (const safePos of safePositions) {
        const path = getPathToPosition(
          pos.row,
          pos.col,
          safePos.row,
          safePos.col,
          gameState.actionsRemaining
        );
        if (path && path.length < shortestDistance) {
          shortestDistance = path.length;
          shortestPath = path;
          closestSafe = safePos;
        }
      }

      if (shortestPath) {
        // Execute moves to reach safety
        for (const step of shortestPath) {
          if (gameState.actionsRemaining <= 0) break;

          // Change direction if needed
          const currentDir = gameState.playerDirections[player];
          if (currentDir !== step.direction) {
            changeDirection(player, step.direction);
            await new Promise((resolve) =>
              setTimeout(resolve, AI_ACTION_DELAY / 2)
            );
          }

          // Move
          const moved = movePlayer(player);
          if (moved) {
            pos = gameState.playerPositions[player];
          }
          await new Promise((resolve) => setTimeout(resolve, AI_ACTION_DELAY));
        }

        // Update safety status after moving
        currentlySafe = isSafePosition(pos.row, pos.col, 0);
      }
    } else {
      // No safe positions reachable - make best move available
      const validMoves = getValidMoves(player);

      if (validMoves.size > 0) {
        const bestMove = chooseLeastDangerousMove(
          player,
          validMoves,
          gameState.actionsRemaining
        );
        if (bestMove) {
          movePlayerTo(player, bestMove.row, bestMove.col);
          await new Promise((resolve) => setTimeout(resolve, AI_ACTION_DELAY));
          pos = gameState.playerPositions[player];
        }
      }

      // Try kicking bombs if stuck
      if (validMoves.size === 0) {
        const kickableBombs = getKickableBombs(pos.row, pos.col);
        if (kickableBombs.length > 0) {
          const bombInfo = kickableBombs[0];
          const currentDir = gameState.playerDirections[player];
          if (currentDir !== bombInfo.direction) {
            changeDirection(player, bombInfo.direction);
            await new Promise((resolve) =>
              setTimeout(resolve, AI_ACTION_DELAY / 2)
            );
          }
          kickBombInFront();
          await new Promise((resolve) => setTimeout(resolve, AI_ACTION_DELAY));
          pos = gameState.playerPositions[player];
        }
      }
    }
  }

  // Use remaining actions, but ensure we end in a safe position
  let noActionTurns = 0;
  while (
    gameState.actionsRemaining > 0 &&
    !gameState.gameOver &&
    moveAttempts < 10
  ) {
    moveAttempts++;
    const actions = getAvailableAIActions(player);
    pos = gameState.playerPositions[player];

    // Filter actions to ensure we maintain safety
    const safeActions = actions.filter((action) => {
      if (action.type === "move") {
        // Check if the move keeps us safe
        const moveSafe = isSafePosition(action.row, action.col, 0);

        // If this is our last action, we must end safe
        if (gameState.actionsRemaining === 1) {
          return moveSafe;
        }

        // Otherwise, check if we can reach safety after this move
        if (moveSafe) {
          return true;
        } else {
          // Check if we can reach safety from the new position
          const futureReachable = getReachableWithinMoves(
            player,
            gameState.actionsRemaining - 1,
            { row: action.row, col: action.col }
          );

          // Check if any reachable position is safe
          for (const posKey of futureReachable) {
            const [r, c] = posKey.split(",").map(Number);
            if (isSafePosition(r, c, 0)) {
              return true;
            }
          }
        }
        return false;
      } else if (action.type === "placeBomb") {
        // Check if placing bomb would leave us in danger
        const front = getFrontCell(player);
        return willBeSafeAfterBombAction(
          player,
          "place",
          front,
          gameState.actionsRemaining
        );
      } else if (action.type === "kickBomb") {
        // Check if kicking bomb would leave us in danger
        const front = getFrontCell(player);
        return willBeSafeAfterBombAction(
          player,
          "kick",
          front,
          gameState.actionsRemaining
        );
      }
      return true; // Direction changes are always safe
    });

    if (safeActions.length === 0) {
      // No safe actions - if we have moves available, take the least dangerous
      const validMoves = getValidMoves(player);

      if (validMoves.size > 0 && gameState.actionsRemaining > 0) {
        const bestMove = chooseLeastDangerousMove(
          player,
          validMoves,
          gameState.actionsRemaining
        );
        if (bestMove) {
          movePlayerTo(player, bestMove.row, bestMove.col);
          await new Promise((resolve) => setTimeout(resolve, AI_ACTION_DELAY));
          noActionTurns = 0;
          continue;
        }
      }

      // If truly no options, end turn
      break;
    } else {
      const action =
        safeActions[Math.floor(Math.random() * safeActions.length)];
      const actionTaken = executeAIAction(action, player);

      if (!actionTaken) {
        noActionTurns++;
        if (noActionTurns > 3) {
          break;
        }
      } else {
        noActionTurns = 0;
      }

      await new Promise((resolve) => setTimeout(resolve, AI_ACTION_DELAY));
    }
  }
}

// Update processHardAI with similar fixes
async function processHardAI() {
  const player = gameState.currentPlayer;
  let pos = gameState.playerPositions[player];
  let moveAttempts = 0; // Prevent infinite loops

  // Check if current position is safe (including chain reactions)
  let currentlySafe = isSafePosition(pos.row, pos.col, 1);

  if (!currentlySafe) {
    // Find safe positions we can reach
    const safePositions = findSafePositions(
      pos.row,
      pos.col,
      gameState.actionsRemaining
    );

    if (safePositions.length > 0) {
      // Find best safe position (closest or most strategic)
      let bestSafe = null;
      let bestPath = null;
      let bestScore = -Infinity;

      for (const safePos of safePositions) {
        const path = getPathToPosition(
          pos.row,
          pos.col,
          safePos.row,
          safePos.col,
          gameState.actionsRemaining
        );
        if (path) {
          let score = 100 - path.length; // Prefer closer positions

          // Bonus for positions that give us more escape options
          const futureReachable = getReachableWithinMoves(
            player,
            ACTIONS_PER_TURN,
            safePos
          );
          score += futureReachable.size * 2;

          if (score > bestScore) {
            bestScore = score;
            bestPath = path;
            bestSafe = safePos;
          }
        }
      }

      if (bestPath) {
        // Execute moves to reach safety
        for (const step of bestPath) {
          if (gameState.actionsRemaining <= 0) break;

          const currentDir = gameState.playerDirections[player];
          if (currentDir !== step.direction) {
            changeDirection(player, step.direction);
            await new Promise((resolve) =>
              setTimeout(resolve, AI_ACTION_DELAY / 2)
            );
          }

          const moved = movePlayer(player);
          if (moved) {
            pos = gameState.playerPositions[player];
          }
          await new Promise((resolve) => setTimeout(resolve, AI_ACTION_DELAY));
        }

        currentlySafe = isSafePosition(pos.row, pos.col, 1);
      }
    } else {
      // No safe positions - make the best move available
      const validMoves = getValidMoves(player);

      if (validMoves.size > 0) {
        const bestMove = chooseLeastDangerousMove(
          player,
          validMoves,
          gameState.actionsRemaining
        );
        if (bestMove) {
          movePlayerTo(player, bestMove.row, bestMove.col);
          await new Promise((resolve) => setTimeout(resolve, AI_ACTION_DELAY));
          pos = gameState.playerPositions[player];
        }
      }

      // Try strategic bomb kicks
      const kickableBombs = getKickableBombs(pos.row, pos.col);

      let bestKick = null;
      let bestKickScore = -Infinity;

      for (const bombInfo of kickableBombs) {
        // Temporarily face the bomb to check kick result
        const originalDir = gameState.playerDirections[player];
        gameState.playerDirections[player] = bombInfo.direction;
        const front = getFrontCell(player);

        if (
          willBeSafeAfterBombAction(
            player,
            "kick",
            front,
            gameState.actionsRemaining
          )
        ) {
          let score = 0;

          // Bonus for kicking toward opponent
          const finalPos = simulateBombKick(
            bombInfo.row,
            bombInfo.col,
            bombInfo.direction
          );
          const bombRange = getExplosionRange(finalPos.row, finalPos.col);
          const opponent = player === "p1" ? "p2" : "p1";
          const opponentPos = gameState.playerPositions[opponent];

          if (bombRange.has(`${opponentPos.row},${opponentPos.col}`)) {
            score += 100;
            if (bombInfo.bomb.timer <= 2) {
              score += 50;
            }
          }

          if (score > bestKickScore) {
            bestKickScore = score;
            bestKick = bombInfo;
          }
        }

        gameState.playerDirections[player] = originalDir;
      }

      if (bestKick) {
        const currentDir = gameState.playerDirections[player];
        if (currentDir !== bestKick.direction) {
          changeDirection(player, bestKick.direction);
          await new Promise((resolve) =>
            setTimeout(resolve, AI_ACTION_DELAY / 2)
          );
        }
        kickBombInFront();
        await new Promise((resolve) => setTimeout(resolve, AI_ACTION_DELAY));
        pos = gameState.playerPositions[player];
        currentlySafe = isSafePosition(pos.row, pos.col, 1);
      }
    }
  }

  // Offensive phase - look for opportunities to threaten opponent while staying safe
  let noActionTurns = 0;
  while (
    gameState.actionsRemaining > 0 &&
    !gameState.gameOver &&
    moveAttempts < 10
  ) {
    moveAttempts++;
    const actions = getAvailableAIActions(player);
    pos = gameState.playerPositions[player];

    if (actions.length === 0) {
      break;
    }

    // Evaluate each action for offensive potential and safety
    let bestAction = null;
    let bestScore = -Infinity;

    for (const action of actions) {
      let score = 0;
      let isSafe = false;

      if (action.type === "move") {
        // Check move safety including chain reactions
        if (!isSafePosition(action.row, action.col, 1)) {
          // If last action, must be safe
          if (gameState.actionsRemaining === 1) {
            continue;
          }
          // Otherwise, check if we can reach safety
          const futureReachable = getReachableWithinMoves(
            player,
            gameState.actionsRemaining - 1,
            { row: action.row, col: action.col }
          );

          let canReachSafety = false;
          for (const posKey of futureReachable) {
            const [r, c] = posKey.split(",").map(Number);
            if (isSafePosition(r, c, 1)) {
              canReachSafety = true;
              break;
            }
          }

          if (!canReachSafety) {
            continue;
          }
        }

        isSafe = true;
      } else if (action.type === "placeBomb" || action.type === "kickBomb") {
        // Check if bomb action leaves us safe
        const front = getFrontCell(player);

        if (
          !willBeSafeAfterBombAction(
            player,
            action.type === "placeBomb" ? "place" : "kick",
            front,
            gameState.actionsRemaining
          )
        ) {
          continue;
        }

        isSafe = true;
      } else {
        // Direction changes are always safe
        isSafe = true;
      }

      if (!isSafe) continue;

      // Evaluate offensive potential
      score = evaluateOffensiveMove(action, player);

      // Bonus for placing bombs when board is empty
      if (action.type === "placeBomb" && gameState.bombs.length === 0) {
        score += 30; // Encourage bomb placement on empty board
      }

      // Prefer moves that maintain more options
      if (action.type === "move") {
        const futureReachable = getReachableWithinMoves(
          player,
          ACTIONS_PER_TURN,
          { row: action.row, col: action.col }
        );
        score += futureReachable.size * 0.5;
      }

      // Add some randomness
      score += Math.random() * 5;

      if (score > bestScore) {
        bestScore = score;
        bestAction = action;
      }
    }

    if (bestAction) {
      const actionTaken = executeAIAction(bestAction, player);
      if (!actionTaken) {
        noActionTurns++;
        if (noActionTurns > 3) {
          break;
        }
      } else {
        noActionTurns = 0;
      }
      await new Promise((resolve) => setTimeout(resolve, AI_ACTION_DELAY));
    } else {
      // No good actions found - if in danger, take any move
      pos = gameState.playerPositions[player];
      if (!isSafePosition(pos.row, pos.col, 1)) {
        const validMoves = getValidMoves(player);
        if (validMoves.size > 0) {
          const bestMove = chooseLeastDangerousMove(
            player,
            validMoves,
            gameState.actionsRemaining
          );
          if (bestMove) {
            movePlayerTo(player, bestMove.row, bestMove.col);
            await new Promise((resolve) =>
              setTimeout(resolve, AI_ACTION_DELAY)
            );
            noActionTurns = 0;
            continue;
          }
        }
      }
      break;
    }
  }
}

function executeAIAction(action, player) {
  switch (action.type) {
    case "move":
      return movePlayerTo(player, action.row, action.col);
    case "changeDirection":
      return changeDirection(player, action.direction);
    case "placeBomb":
      return placeBombInFront();
    case "kickBomb":
      return kickBombInFront();
    default:
      return false;
  }
}

function takeRandomAIAction() {
  const player = gameState.currentPlayer;
  const actions = getAvailableAIActions(player);

  if (actions.length === 0) {
    return false;
  }

  // Pick a random action
  const action = actions[Math.floor(Math.random() * actions.length)];
  return executeAIAction(action, player);
}

// Update getAvailableAIActions to filter out invalid actions
function getAvailableAIActions(player) {
  const actions = [];
  const pos = gameState.playerPositions[player];

  // Get possible moves
  const validMoves = getValidMoves(player);
  validMoves.forEach((moveKey) => {
    const [row, col] = moveKey.split(",").map(Number);
    actions.push({ type: "move", row, col });
  });

  // Add direction changes only if they face something other than a wall or unkickable bomb
  const directions = ["up", "down", "left", "right"];
  const currentDir = gameState.playerDirections[player];
  directions.forEach((dir) => {
    if (dir !== currentDir) {
      const offset = getDirectionOffset(dir);
      const targetRow = pos.row + offset.dr;
      const targetCol = pos.col + offset.dc;
      const targetCellType = getCellType(targetRow, targetCol);
      const targetBomb = getBombAt(targetRow, targetCol);

      // Don't turn to face a wall
      if (targetCellType === "w") {
        return;
      }

      // Don't turn to face an unkickable bomb
      if (targetBomb && !canBombBeKicked(targetRow, targetCol, dir)) {
        return;
      }

      actions.push({ type: "changeDirection", direction: dir });
    }
  });

  // Check if can place bomb in front
  const front = getFrontCell(player);
  const frontCellType = getCellType(front.row, front.col);
  if (frontCellType === "f" && findBombAt(front.row, front.col) === -1) {
    actions.push({ type: "placeBomb" });
  }

  // Check if can kick bomb in front (only if it would actually move)
  if (findBombAt(front.row, front.col) !== -1) {
    if (
      canBombBeKicked(front.row, front.col, gameState.playerDirections[player])
    ) {
      actions.push({ type: "kickBomb" });
    }
  }

  return actions;
}

// [Rest of the original game functions remain the same...]
// Initialize grid state from layout
function initializeGridState() {
  gameState.grid = gridLayout.map((row) => [...row]);
  // Find and update player positions
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (gameState.grid[row][col] === "p1") {
        gameState.playerPositions.p1 = { row, col };
        gameState.highlightOrigin.p1 = { row, col };
        gameState.highlightActionsRemaining.p1 = ACTIONS_PER_TURN;
        gameState.visitedSpaces.p1 = new Set();
        // Add starting position as visited
        gameState.visitedSpaces.p1.add(`${row},${col}`);
      } else if (gameState.grid[row][col] === "p2") {
        gameState.playerPositions.p2 = { row, col };
        gameState.highlightOrigin.p2 = { row, col };
        gameState.highlightActionsRemaining.p2 = ACTIONS_PER_TURN;
        gameState.visitedSpaces.p2 = new Set();
        // Add starting position as visited
        gameState.visitedSpaces.p2.add(`${row},${col}`);
      }
    }
  }
}

function getCellType(row, col) {
  if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
    return "w"; // Out of bounds = wall
  }
  // Return what's in the grid (w, f, p1, p2) - bombs are tracked separately
  return gameState.grid[row][col];
}

function setCellType(row, col, type) {
  if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
    return;
  }
  // Directly set the grid - bombs are tracked separately in bombs array
  gameState.grid[row][col] = type;
}

function isObstacle(row, col) {
  const cellType = getCellType(row, col);
  const hasBomb = findBombAt(row, col) !== -1;
  // Walls, players, and bombs are obstacles
  return cellType === "w" || cellType === "p1" || cellType === "p2" || hasBomb;
}

function findBombAt(row, col) {
  return gameState.bombs.findIndex(
    (bomb) => bomb.row === row && bomb.col === col
  );
}

function getBombAt(row, col) {
  const index = findBombAt(row, col);
  return index !== -1 ? gameState.bombs[index] : null;
}

function getPlayerAt(row, col) {
  const cellType = getCellType(row, col);
  if (cellType === "p1") return "p1";
  if (cellType === "p2") return "p2";
  return null;
}

function getDirectionArrow(direction) {
  switch (direction) {
    case "up":
      return "↑";
    case "down":
      return "↓";
    case "left":
      return "←";
    case "right":
      return "→";
    default:
      return "";
  }
}

// Helper function to get row/col offsets for a direction
function getDirectionOffset(direction) {
  switch (direction) {
    case "up":
      return { dr: -1, dc: 0 };
    case "down":
      return { dr: 1, dc: 0 };
    case "left":
      return { dr: 0, dc: -1 };
    case "right":
      return { dr: 0, dc: 1 };
    default:
      return { dr: 0, dc: 0 };
  }
}

function changeDirection(player, direction) {
  if (gameState.gameOver) {
    return false;
  }

  // Changing direction doesn't use an action
  gameState.playerDirections[player] = direction;
  renderGrid();
  return true;
}

function getValidMoves(player) {
  const pos = gameState.playerPositions[player];
  const validMoves = new Set();

  // Check all 4 adjacent directions
  const directions = [
    { dr: -1, dc: 0 }, // up
    { dr: 1, dc: 0 }, // down
    { dr: 0, dc: -1 }, // left
    { dr: 0, dc: 1 }, // right
  ];

  for (const dir of directions) {
    const newRow = pos.row + dir.dr;
    const newCol = pos.col + dir.dc;

    // Check if this is a valid move (not an obstacle)
    if (!isObstacle(newRow, newCol)) {
      validMoves.add(`${newRow},${newCol}`);
    }
  }

  return validMoves;
}

function getReachableWithinMoves(player, maxMoves, originPos) {
  // Use provided origin position, or default to highlight origin
  // If originPos is explicitly provided, use it (even if it's falsy-like, we check for undefined)
  // Create a new object to avoid reference issues
  const pos =
    originPos !== undefined
      ? { row: originPos.row, col: originPos.col }
      : {
          row: gameState.highlightOrigin[player].row,
          col: gameState.highlightOrigin[player].col,
        };
  const reachable = new Set();
  const visited = new Set();
  const queue = [{ row: pos.row, col: pos.col, moves: 0 }];

  visited.add(`${pos.row},${pos.col}`);

  while (queue.length > 0) {
    const current = queue.shift();
    const key = `${current.row},${current.col}`;

    // Add to reachable if within move limit
    if (current.moves <= maxMoves) {
      reachable.add(key);
    }

    // Don't explore further if we've used all moves
    if (current.moves >= maxMoves) {
      continue;
    }

    // Check all 4 directions
    const directions = [
      { dr: -1, dc: 0 }, // up
      { dr: 1, dc: 0 }, // down
      { dr: 0, dc: -1 }, // left
      { dr: 0, dc: 1 }, // right
    ];

    for (const dir of directions) {
      const newRow = current.row + dir.dr;
      const newCol = current.col + dir.dc;
      const newKey = `${newRow},${newCol}`;

      if (visited.has(newKey)) continue;
      visited.add(newKey);

      // Check if this space is reachable (not a wall, bomb, or other player)
      // Don't treat the current player as an obstacle
      const cellType = getCellType(newRow, newCol);
      const hasBomb = findBombAt(newRow, newCol) !== -1;
      const isOtherPlayer =
        (cellType === "p1" && player !== "p1") ||
        (cellType === "p2" && player !== "p2");

      if (cellType !== "w" && !hasBomb && !isOtherPlayer) {
        queue.push({ row: newRow, col: newCol, moves: current.moves + 1 });
      }
    }
  }

  return reachable;
}

function movePlayerTo(player, targetRow, targetCol) {
  if (gameState.gameOver) {
    return false;
  }

  const pos = gameState.playerPositions[player];
  const history = gameState.moveHistory[player];

  // Check if moving back to previous position (undo move) - only for human players
  if (playerTypes[player] === "human" && history.length > 1) {
    const prevPos = history[history.length - 2];
    if (targetRow === prevPos.row && targetCol === prevPos.col) {
      // Undo move - restore action
      gameState.actionsRemaining++;

      // Remove last position from history
      history.pop();

      // Move player back
      const oldBombIndex = findBombAt(pos.row, pos.col);
      if (oldBombIndex !== -1) {
        gameState.grid[pos.row][pos.col] = "bomb";
      } else {
        gameState.grid[pos.row][pos.col] = "f";
      }

      gameState.grid[targetRow][targetCol] = player;
      gameState.playerPositions[player] = { row: targetRow, col: targetCol };

      // Remove the undone position from visited spaces
      gameState.visitedSpaces[player].delete(`${pos.row},${pos.col}`);

      updateUI();
      // Don't update highlighting during movement
      renderGrid();
      return true;
    }
  }

  // Check if target is reachable from current position with remaining actions
  // IMPORTANT: Use current position (pos), NOT the highlight origin
  // This ensures that after placing/kicking a bomb, movement is restricted
  // to spaces reachable from the NEW position, not the original starting position
  const reachableFromCurrent = getReachableWithinMoves(
    player,
    gameState.actionsRemaining,
    { row: pos.row, col: pos.col } // Explicitly create new object to ensure we use current position
  );
  const targetKey = `${targetRow},${targetCol}`;

  if (!reachableFromCurrent.has(targetKey)) {
    return false; // Not reachable from current position
  }

  // Also check if it's an adjacent move (can only move one space at a time)
  const validMoves = getValidMoves(player);
  if (!validMoves.has(targetKey)) {
    return false; // Not an adjacent move
  }

  // Check if we have actions remaining
  if (gameState.actionsRemaining <= 0) {
    return false;
  }

  // Move player (costs action)
  const oldBombIndex = findBombAt(pos.row, pos.col);
  if (oldBombIndex !== -1) {
    gameState.grid[pos.row][pos.col] = "bomb";
  } else {
    gameState.grid[pos.row][pos.col] = "f";
  }

  // Set new position
  gameState.grid[targetRow][targetCol] = player;
  gameState.playerPositions[player] = { row: targetRow, col: targetCol };

  // Add to history
  history.push({ row: targetRow, col: targetCol });

  // Mark this space as visited
  gameState.visitedSpaces[player].add(`${targetRow},${targetCol}`);

  // Use action
  gameState.actionsRemaining--;
  updateUI();

  // Don't update highlighting during movement
  renderGrid();
  return true;
}

function movePlayer(player) {
  if (gameState.gameOver) {
    return false;
  }

  const pos = gameState.playerPositions[player];
  const direction = gameState.playerDirections[player];
  let newRow = pos.row;
  let newCol = pos.col;

  switch (direction) {
    case "up":
      newRow--;
      break;
    case "down":
      newRow++;
      break;
    case "left":
      newCol--;
      break;
    case "right":
      newCol++;
      break;
    default:
      return false;
  }

  return movePlayerTo(player, newRow, newCol);
}

function getFrontCell(player) {
  const pos = gameState.playerPositions[player];
  const direction = gameState.playerDirections[player];
  const offset = getDirectionOffset(direction);

  return { row: pos.row + offset.dr, col: pos.col + offset.dc };
}

function placeBombInFront() {
  if (gameState.actionsRemaining <= 0 || gameState.gameOver) {
    return false;
  }

  const front = getFrontCell(gameState.currentPlayer);
  const cellType = getCellType(front.row, front.col);

  // Can only place bomb on empty floor
  if (cellType !== "f") {
    return false;
  }

  // Check if there's already a bomb there
  if (findBombAt(front.row, front.col) !== -1) {
    return false;
  }

  // Place bomb (keep floor in grid, track bomb separately)
  gameState.bombs.push({ row: front.row, col: front.col, timer: 4 });

  useAction();

  // Update highlight origin to current position and recalculate with new remaining actions
  const pos = gameState.playerPositions[gameState.currentPlayer];
  gameState.highlightOrigin[gameState.currentPlayer] = {
    row: pos.row,
    col: pos.col,
  };
  gameState.highlightActionsRemaining[gameState.currentPlayer] =
    gameState.actionsRemaining;

  // Reset move history - can't undo past a bomb placement
  gameState.moveHistory[gameState.currentPlayer] = [
    { row: pos.row, col: pos.col },
  ];

  // Reset visited spaces when bomb is placed - start fresh from current position
  gameState.visitedSpaces[gameState.currentPlayer].clear();
  // Add current position as the new starting visited space
  gameState.visitedSpaces[gameState.currentPlayer].add(`${pos.row},${pos.col}`);

  // Re-render to update highlighting from current position with new remaining actions
  renderGrid();
  return true;
}

// Update kickBombInFront to not use action if bomb can't move
function kickBombInFront() {
  if (gameState.actionsRemaining <= 0 || gameState.gameOver) {
    return false;
  }

  const front = getFrontCell(gameState.currentPlayer);

  // Check if there's a bomb in front of the player
  const bombIndex = findBombAt(front.row, front.col);
  if (bombIndex === -1) {
    return false; // No bomb to kick
  }

  const direction = gameState.playerDirections[gameState.currentPlayer];

  // Check if bomb can actually be kicked
  if (!canBombBeKicked(front.row, front.col, direction)) {
    return false; // Don't use action if bomb can't move
  }

  // Move bomb as far as possible in the direction
  let currentRow = front.row;
  let currentCol = front.col;
  const offset = getDirectionOffset(direction);

  while (true) {
    // Calculate next position
    const nextRow = currentRow + offset.dr;
    const nextCol = currentCol + offset.dc;

    // Check if next position is valid (bomb can't move through walls, players, or other bombs)
    const nextCellType = getCellType(nextRow, nextCol);
    const nextHasBomb = findBombAt(nextRow, nextCol) !== -1;
    if (
      nextCellType === "w" ||
      nextCellType === "p1" ||
      nextCellType === "p2" ||
      nextHasBomb
    ) {
      break; // Can't move further
    }

    currentRow = nextRow;
    currentCol = nextCol;
  }

  // Move the bomb (bombs are tracked separately, grid stays as floor/player)
  const bomb = gameState.bombs[bombIndex];
  // Preserve the timer when moving the bomb
  gameState.bombs[bombIndex] = {
    row: currentRow,
    col: currentCol,
    timer: bomb.timer,
  };

  useAction();

  // Update highlight origin to current position and recalculate with new remaining actions
  const pos = gameState.playerPositions[gameState.currentPlayer];
  gameState.highlightOrigin[gameState.currentPlayer] = {
    row: pos.row,
    col: pos.col,
  };
  gameState.highlightActionsRemaining[gameState.currentPlayer] =
    gameState.actionsRemaining;

  // Reset move history - can't undo past a bomb kick
  gameState.moveHistory[gameState.currentPlayer] = [
    { row: pos.row, col: pos.col },
  ];

  // Reset visited spaces when bomb is kicked - start fresh from current position
  gameState.visitedSpaces[gameState.currentPlayer].clear();
  // Add current position as the new starting visited space
  gameState.visitedSpaces[gameState.currentPlayer].add(`${pos.row},${pos.col}`);

  // Re-render to update highlighting from current position with new remaining actions
  renderGrid();
  return true;
}

function useAction() {
  if (gameState.gameOver) return;

  gameState.actionsRemaining--;
  updateUI();

  // Don't auto-end turn during AI processing - let processAITurn handle it
  if (gameState.actionsRemaining <= 0 && !gameState.isProcessingTurn) {
    endTurn();
  }
}

function endTurn() {
  if (gameState.gameOver) return;

  // Reset move history and highlight origin for the player whose turn just ended
  const endedPlayer = gameState.currentPlayer;
  const startPos = gameState.playerPositions[endedPlayer];
  gameState.moveHistory[endedPlayer] = [
    { row: startPos.row, col: startPos.col },
  ];
  gameState.highlightOrigin[endedPlayer] = {
    row: startPos.row,
    col: startPos.col,
  };
  gameState.highlightActionsRemaining[endedPlayer] = ACTIONS_PER_TURN;
  gameState.visitedSpaces[endedPlayer].clear();

  // Switch to next player immediately for visual feedback
  gameState.currentPlayer = gameState.currentPlayer === "p1" ? "p2" : "p1";
  gameState.actionsRemaining = ACTIONS_PER_TURN;

  // Initialize move history and highlight origin for new player
  const newPlayer = gameState.currentPlayer;
  const newPlayerPos = gameState.playerPositions[newPlayer];
  gameState.moveHistory[newPlayer] = [
    { row: newPlayerPos.row, col: newPlayerPos.col },
  ];
  gameState.highlightOrigin[newPlayer] = {
    row: newPlayerPos.row,
    col: newPlayerPos.col,
  };
  gameState.highlightActionsRemaining[newPlayer] = ACTIONS_PER_TURN;
  gameState.visitedSpaces[newPlayer].clear();
  // Add starting position as visited
  gameState.visitedSpaces[newPlayer].add(
    `${newPlayerPos.row},${newPlayerPos.col}`
  );

  updateUI();
  renderGrid();

  // Decrease bomb timers and check for explosions (async)
  decreaseBombTimers().then(() => {
    // Re-render after explosions complete to show any changes
    if (!gameState.gameOver) {
      renderGrid();
      updateUI();

      // Start AI turn if current player is AI
      if (playerTypes[gameState.currentPlayer] === "ai") {
        setTimeout(() => processAITurn(), 1000);
      }
    }
  });
}

// Also fix the typo in decreaseBombTimers:
async function decreaseBombTimers() {
  // Reset global explosion cells tracker
  allExplosionCells = new Set();

  // Decrease all bomb timers
  const bombsToExplode = [];
  for (let i = gameState.bombs.length - 1; i >= 0; i--) {
    gameState.bombs[i].timer--;

    // If timer reaches 0, mark for explosion
    if (gameState.bombs[i].timer <= 0) {
      bombsToExplode.push({
        row: gameState.bombs[i].row,
        col: gameState.bombs[i].col,
      });
    }
  }

  // Animate all explosions
  if (bombsToExplode.length > 0) {
    await animateExplosions(bombsToExplode); // Fixed the line break issue

    // After all explosions are processed, check for player hits
    if (allExplosionCells.size > 0) {
      checkPlayerHits(allExplosionCells);
      renderGrid();
    }
  }
}

// Global set to track all explosion cells across chain reactions
let allExplosionCells = new Set();
let explosionQueue = []; // Queue of explosions to process

// Calculate explosion cells for a bomb (without actually exploding)
function calculateExplosionCells(row, col) {
  const explosionCells = [];
  const processed = new Set();

  function addExplosionCells(startRow, startCol) {
    // Add the bomb's own position first (distance 0)
    const startKey = `${startRow},${startCol}`;
    if (!processed.has(startKey)) {
      explosionCells.push({
        row: startRow,
        col: startCol,
        distance: 0,
        sourceRow: startRow,
        sourceCol: startCol,
      });
      processed.add(startKey);
      allExplosionCells.add(startKey);
    }

    // Explode in 4 directions
    const directions = [
      { dr: -1, dc: 0 }, // up
      { dr: 1, dc: 0 }, // down
      { dr: 0, dc: -1 }, // left
      { dr: 0, dc: 1 }, // right
    ];

    for (const dir of directions) {
      let currentRow = startRow;
      let currentCol = startCol;
      let distance = 0;

      while (true) {
        currentRow += dir.dr;
        currentCol += dir.dc;
        distance++;

        // Stop at walls
        if (getCellType(currentRow, currentCol) === "w") {
          break;
        }

        const cellKey = `${currentRow},${currentCol}`;
        if (!processed.has(cellKey)) {
          explosionCells.push({
            row: currentRow,
            col: currentCol,
            distance,
            sourceRow: startRow,
            sourceCol: startCol,
          });
          processed.add(cellKey);
          allExplosionCells.add(cellKey);

          // Check if there's a bomb here - chain reaction
          const bomb = getBombAt(currentRow, currentCol);
          if (bomb) {
            // Add this bomb to explosion queue
            explosionQueue.push({ row: currentRow, col: currentCol });
            break; // Stop this direction's explosion at the bomb
          }
        }
      }
    }
  }

  addExplosionCells(row, col);
  return explosionCells;
}

async function animateExplosions(initialBombs) {
  // Reset queues
  allExplosionCells = new Set();
  explosionQueue = [...initialBombs];
  const processedBombs = new Set();
  const allExplosionSteps = [];

  // Process all bombs (including chain reactions)
  while (explosionQueue.length > 0) {
    const bomb = explosionQueue.shift();
    const key = `${bomb.row},${bomb.col}`;

    if (processedBombs.has(key)) continue;
    processedBombs.add(key);

    // Remove bomb from game state
    const bombIndex = findBombAt(bomb.row, bomb.col);
    if (bombIndex !== -1) {
      gameState.bombs.splice(bombIndex, 1);
    }

    // Calculate explosion cells for this bomb
    const cells = calculateExplosionCells(bomb.row, bomb.col);
    allExplosionSteps.push(...cells);
  }

  // Sort by distance to animate outward
  allExplosionSteps.sort((a, b) => a.distance - b.distance);

  // Group by distance for simultaneous animation
  const stepsByDistance = {};
  for (const step of allExplosionSteps) {
    if (!stepsByDistance[step.distance]) {
      stepsByDistance[step.distance] = [];
    }
    stepsByDistance[step.distance].push(step);
  }

  // Animate each distance level
  const maxDistance = Math.max(...Object.keys(stepsByDistance).map(Number));
  const activeExplosions = new Set();

  for (let dist = 0; dist <= maxDistance; dist++) {
    if (stepsByDistance[dist]) {
      // Add explosions for this distance
      for (const step of stepsByDistance[dist]) {
        activeExplosions.add(`${step.row},${step.col}`);
      }

      // Render with explosions
      renderGridWithExplosions(activeExplosions);

      // Wait before next distance
      if (dist < maxDistance) {
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    }
  }

  // Hold explosion for a moment
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Clear explosion cells
  for (const cellKey of allExplosionCells) {
    const [r, c] = cellKey.split(",").map(Number);
    const cellType = getCellType(r, c);

    // Remove any bombs at this location
    const bombIdx = findBombAt(r, c);
    if (bombIdx !== -1) {
      gameState.bombs.splice(bombIdx, 1);
    }

    // If not a wall and not a player, set to floor
    if (cellType !== "w" && cellType !== "p1" && cellType !== "p2") {
      gameState.grid[r][c] = "f";
    }
  }

  activeExplosions.clear();
  renderGrid();
}

function renderGridWithExplosions(activeExplosions) {
  const gridContainer = document.getElementById("grid");
  gridContainer.innerHTML = "";

  // Only show highlighting for human players
  const shouldShowHighlighting =
    !gameState.gameOver &&
    !gameState.isProcessingTurn &&
    playerTypes[gameState.currentPlayer] === "human";

  // Calculate spaces reachable using the stored actions remaining (not current)
  const reachableSpaces = shouldShowHighlighting
    ? getReachableWithinMoves(
        gameState.currentPlayer,
        gameState.highlightActionsRemaining[gameState.currentPlayer],
        gameState.highlightOrigin[gameState.currentPlayer]
      )
    : new Set();

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const cell = document.createElement("div");
      cell.className = "cell";

      const cellType = gameState.grid[row][col];
      const hasBomb = findBombAt(row, col) !== -1;
      const isExploding = activeExplosions.has(`${row},${col}`);
      const isReachable =
        shouldShowHighlighting &&
        reachableSpaces.has(`${row},${col}`) &&
        cellType !== "p1" &&
        cellType !== "p2" &&
        !isExploding;
      const isVisited =
        shouldShowHighlighting &&
        !isExploding &&
        gameState.visitedSpaces[gameState.currentPlayer].has(`${row},${col}`) &&
        cellType !== "p1" &&
        cellType !== "p2";

      if (isReachable) {
        cell.classList.add("reachable");
      }
      if (isVisited) {
        cell.classList.add("visited");
      }

      // Render priority: explosion > player > bomb > base terrain
      if (isExploding) {
        cell.classList.add("explosion");
        // Keep player/bomb info if present
        if (cellType === "p1") {
          cell.classList.add("player1");
          const direction = gameState.playerDirections.p1;
          if (gameState.currentPlayer === "p1" && !gameState.gameOver) {
            const label = document.createElement("div");
            label.className = "player-label";
            label.textContent = "P1";
            const count = document.createElement("div");
            count.className = "actions-count";
            count.textContent = gameState.actionsRemaining;
            const dirIndicator = document.createElement("div");
            dirIndicator.className = "direction-indicator";
            dirIndicator.textContent = getDirectionArrow(direction);
            cell.appendChild(label);
            cell.appendChild(count);
            cell.appendChild(dirIndicator);
            cell.classList.add("current-player");
          } else {
            cell.textContent = "P1";
            const dirIndicator = document.createElement("div");
            dirIndicator.className = "direction-indicator";
            dirIndicator.textContent = getDirectionArrow(direction);
            cell.appendChild(dirIndicator);
          }
        } else if (cellType === "p2") {
          cell.classList.add("player2");
          const direction = gameState.playerDirections.p2;
          if (gameState.currentPlayer === "p2" && !gameState.gameOver) {
            const label = document.createElement("div");
            label.className = "player-label";
            label.textContent = "P2";
            const count = document.createElement("div");
            count.className = "actions-count";
            count.textContent = gameState.actionsRemaining;
            const dirIndicator = document.createElement("div");
            dirIndicator.className = "direction-indicator";
            dirIndicator.textContent = getDirectionArrow(direction);
            cell.appendChild(label);
            cell.appendChild(count);
            cell.appendChild(dirIndicator);
            cell.classList.add("current-player");
          } else {
            cell.textContent = "P2";
            const dirIndicator = document.createElement("div");
            dirIndicator.className = "direction-indicator";
            dirIndicator.textContent = getDirectionArrow(direction);
            cell.appendChild(dirIndicator);
          }
        } else if (hasBomb) {
          const bomb = getBombAt(row, col);
          if (bomb) {
            cell.textContent = `💣${bomb.timer}`;
            cell.classList.add(`timer-${bomb.timer}`);
          }
        }
      } else if (cellType === "w") {
        cell.classList.add("wall");
      } else if (cellType === "p1") {
        cell.classList.add("floor", "player1");
        const direction = gameState.playerDirections.p1;
        if (gameState.currentPlayer === "p1" && !gameState.gameOver) {
          const label = document.createElement("div");
          label.className = "player-label";
          label.textContent = "P1";
          const count = document.createElement("div");
          count.className = "actions-count";
          count.textContent = gameState.actionsRemaining;
          const dirIndicator = document.createElement("div");
          dirIndicator.className = "direction-indicator";
          dirIndicator.textContent = getDirectionArrow(direction);
          cell.appendChild(label);
          cell.appendChild(count);
          cell.appendChild(dirIndicator);
          cell.classList.add("current-player");
        } else {
          cell.textContent = "P1";
          const dirIndicator = document.createElement("div");
          dirIndicator.className = "direction-indicator";
          dirIndicator.textContent = getDirectionArrow(direction);
          cell.appendChild(dirIndicator);
        }
        if (hasBomb) {
          const bomb = getBombAt(row, col);
          cell.classList.add("bomb");
          if (bomb) {
            cell.classList.add(`timer-${bomb.timer}`);
          }
        }
      } else if (cellType === "p2") {
        cell.classList.add("floor", "player2");
        const direction = gameState.playerDirections.p2;
        if (gameState.currentPlayer === "p2" && !gameState.gameOver) {
          const label = document.createElement("div");
          label.className = "player-label";
          label.textContent = "P2";
          const count = document.createElement("div");
          count.className = "actions-count";
          count.textContent = gameState.actionsRemaining;
          const dirIndicator = document.createElement("div");
          dirIndicator.className = "direction-indicator";
          dirIndicator.textContent = getDirectionArrow(direction);
          cell.appendChild(label);
          cell.appendChild(count);
          cell.appendChild(dirIndicator);
          cell.classList.add("current-player");
        } else {
          cell.textContent = "P2";
          const dirIndicator = document.createElement("div");
          dirIndicator.className = "direction-indicator";
          dirIndicator.textContent = getDirectionArrow(direction);
          cell.appendChild(dirIndicator);
        }
        if (hasBomb) {
          const bomb = getBombAt(row, col);
          cell.classList.add("bomb");
          if (bomb) {
            cell.classList.add(`timer-${bomb.timer}`);
          }
        }
      } else if (hasBomb) {
        const bomb = getBombAt(row, col);
        cell.classList.add("floor", "bomb");
        if (bomb) {
          cell.textContent = `💣${bomb.timer}`; // Show bomb emoji and timer
          cell.classList.add(`timer-${bomb.timer}`);
        }
      } else if (cellType === "f") {
        cell.classList.add("floor");
      }

      cell.dataset.row = row;
      cell.dataset.col = col;
      cell.dataset.type = cellType;
      if (hasBomb) {
        cell.dataset.hasBomb = "true";
      }

      // Add click handler for movement and bomb actions (only for human players)
      if (
        !gameState.isProcessingTurn &&
        playerTypes[gameState.currentPlayer] === "human"
      ) {
        cell.addEventListener("click", () => handleCellClick(row, col));
      }
      gridContainer.appendChild(cell);
    }
  }
}

function checkPlayerHits(explosionCells) {
  let p1Hit = false;
  let p2Hit = false;

  for (const cellKey of explosionCells) {
    const [r, c] = cellKey.split(",").map(Number);
    const cellType = getCellType(r, c);

    if (cellType === "p1") {
      p1Hit = true;
      // Remove player from grid
      gameState.grid[r][c] = "f";
    } else if (cellType === "p2") {
      p2Hit = true;
      // Remove player from grid
      gameState.grid[r][c] = "f";
    }
  }

  if (p1Hit && p2Hit) {
    gameState.gameOver = true;
    gameState.winner = "tie";
    updateUI();
  } else if (p1Hit) {
    gameState.gameOver = true;
    gameState.winner = "p2";
    updateUI();
  } else if (p2Hit) {
    gameState.gameOver = true;
    gameState.winner = "p1";
    updateUI();
  }
}

function updateUI() {
  const currentPlayerEl = document.getElementById("current-player");
  const actionsEl = document.getElementById("actions-remaining");

  if (gameState.gameOver) {
    let message = "";
    if (gameState.winner === "tie") {
      message = "Game Over: Tie! Both players were hit.";
    } else if (gameState.winner === "p1") {
      message = "Game Over: Player 1 Wins!";
    } else if (gameState.winner === "p2") {
      message = "Game Over: Player 2 Wins!";
    }
    currentPlayerEl.textContent = message;
    actionsEl.textContent = "";
  } else {
    const playerNum = gameState.currentPlayer === "p1" ? "P1" : "P2";
    const playerTypeStr =
      playerTypes[gameState.currentPlayer] === "ai"
        ? ` (AI-${aiDifficulty[gameState.currentPlayer].toUpperCase()})`
        : "";
    currentPlayerEl.innerHTML = `Current Player: <span class="${gameState.currentPlayer}">${playerNum}${playerTypeStr}</span>`;
    actionsEl.textContent = `Actions Remaining: ${gameState.actionsRemaining}`;
  }
}

function renderGrid() {
  const gridContainer = document.getElementById("grid");
  gridContainer.innerHTML = "";

  //Only show highlighting for human players
  const shouldShowHighlighting =
    !gameState.gameOver &&
    !gameState.isProcessingTurn &&
    playerTypes[gameState.currentPlayer] === "human";

  // Calculate spaces reachable using the stored actions remaining (not current)
  const reachableSpaces = shouldShowHighlighting
    ? getReachableWithinMoves(
        gameState.currentPlayer,
        gameState.highlightActionsRemaining[gameState.currentPlayer],
        gameState.highlightOrigin[gameState.currentPlayer]
      )
    : new Set();

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const cell = document.createElement("div");
      cell.className = "cell";

      const cellType = gameState.grid[row][col];
      const hasBomb = findBombAt(row, col) !== -1;
      const isReachable =
        shouldShowHighlighting &&
        reachableSpaces.has(`${row},${col}`) &&
        cellType !== "p1" &&
        cellType !== "p2";
      const isVisited =
        shouldShowHighlighting &&
        gameState.visitedSpaces[gameState.currentPlayer].has(`${row},${col}`) &&
        cellType !== "p1" &&
        cellType !== "p2";

      if (isReachable) {
        cell.classList.add("reachable");
      }
      if (isVisited) {
        cell.classList.add("visited");
      }

      // Render priority: player > bomb > base terrain
      if (cellType === "w") {
        cell.classList.add("wall");
      } else if (cellType === "p1") {
        cell.classList.add("floor", "player1");
        const direction = gameState.playerDirections.p1;
        cell.dataset.direction = direction;
        // Show actions remaining if this is the current player
        if (gameState.currentPlayer === "p1" && !gameState.gameOver) {
          const label = document.createElement("div");
          label.className = "player-label";
          label.textContent = "P1";
          const count = document.createElement("div");
          count.className = "actions-count";
          count.textContent = gameState.actionsRemaining;
          const dirIndicator = document.createElement("div");
          dirIndicator.className = "direction-indicator";
          dirIndicator.textContent = getDirectionArrow(direction);
          cell.appendChild(label);
          cell.appendChild(count);
          cell.appendChild(dirIndicator);
          cell.classList.add("current-player");
        } else {
          cell.textContent = "P1";
          const dirIndicator = document.createElement("div");
          dirIndicator.className = "direction-indicator";
          dirIndicator.textContent = getDirectionArrow(direction);
          cell.appendChild(dirIndicator);
        }
        if (hasBomb) {
          // Player standing on bomb - show both
          const bomb = getBombAt(row, col);
          cell.classList.add("bomb");
          if (bomb) {
            cell.classList.add(`timer-${bomb.timer}`);
          }
        }
      } else if (cellType === "p2") {
        cell.classList.add("floor", "player2");
        const direction = gameState.playerDirections.p2;
        cell.dataset.direction = direction;
        // Show actions remaining if this is the current player
        if (gameState.currentPlayer === "p2" && !gameState.gameOver) {
          const label = document.createElement("div");
          label.className = "player-label";
          label.textContent = "P2";
          const count = document.createElement("div");
          count.className = "actions-count";
          count.textContent = gameState.actionsRemaining;
          const dirIndicator = document.createElement("div");
          dirIndicator.className = "direction-indicator";
          dirIndicator.textContent = getDirectionArrow(direction);
          cell.appendChild(label);
          cell.appendChild(count);
          cell.appendChild(dirIndicator);
          cell.classList.add("current-player");
        } else {
          cell.textContent = "P2";
          const dirIndicator = document.createElement("div");
          dirIndicator.className = "direction-indicator";
          dirIndicator.textContent = getDirectionArrow(direction);
          cell.appendChild(dirIndicator);
        }
        if (hasBomb) {
          // Player standing on bomb - show both
          const bomb = getBombAt(row, col);
          cell.classList.add("bomb");
          if (bomb) {
            cell.classList.add(`timer-${bomb.timer}`);
          }
        }
      } else if (hasBomb) {
        // Bomb on floor
        const bomb = getBombAt(row, col);
        cell.classList.add("floor", "bomb");
        if (bomb) {
          cell.textContent = `💣${bomb.timer}`; // Show bomb emoji and timer
          cell.classList.add(`timer-${bomb.timer}`);
        }
      } else if (cellType === "f") {
        cell.classList.add("floor");
      }

      // Add data attributes for game logic
      cell.dataset.row = row;
      cell.dataset.col = col;
      cell.dataset.type = cellType;
      if (hasBomb) {
        cell.dataset.hasBomb = "true";
      }

      // Add click handler for movement and bomb actions (only for human players)
      if (
        !gameState.isProcessingTurn &&
        playerTypes[gameState.currentPlayer] === "human"
      ) {
        cell.addEventListener("click", () => handleCellClick(row, col));
      }
      gridContainer.appendChild(cell);
    }
  }
}

function handleCellClick(row, col) {
  if (gameState.gameOver || gameState.isProcessingTurn) {
    return;
  }

  // Only handle clicks for human players
  if (playerTypes[gameState.currentPlayer] !== "human") {
    return;
  }

  const player = gameState.currentPlayer;
  const pos = gameState.playerPositions[player];
  const clickedKey = `${row},${col}`;

  // Check if clicking on valid move or previous position (undo)
  const history = gameState.moveHistory[player];
  const canUndo = history.length > 1;
  if (canUndo) {
    const prevPos = history[history.length - 2];
    if (row === prevPos.row && col === prevPos.col) {
      // Undo move - this is always allowed if there's a previous position
      movePlayerTo(player, row, col);
      return;
    }
  }

  // Check if clicked cell is reachable from current position with remaining actions
  // IMPORTANT: Use current position, NOT the highlight origin
  const reachableFromCurrent = getReachableWithinMoves(
    player,
    gameState.actionsRemaining,
    { row: pos.row, col: pos.col } // Explicitly create new object to ensure we use current position
  );

  // Also check if it's an adjacent move (can only move one space at a time)
  const validMoves = getValidMoves(player);

  if (
    reachableFromCurrent.has(clickedKey) &&
    validMoves.has(clickedKey) &&
    (row !== pos.row || col !== pos.col)
  ) {
    movePlayerTo(player, row, col);
    return;
  }

  // Check if clicking on bomb in front - kick it
  const front = getFrontCell(player);
  if (row === front.row && col === front.col) {
    if (findBombAt(row, col) !== -1) {
      kickBombInFront();
    } else if (getCellType(row, col) === "f") {
      placeBombInFront();
    }
  }
}

// Update keyboard handler to use the same logic
document.addEventListener("keydown", (e) => {
  if (gameState.gameOver || gameState.isProcessingTurn) {
    return;
  }

  // Only process keyboard input for human players
  if (playerTypes[gameState.currentPlayer] !== "human") {
    return;
  }

  const player = gameState.currentPlayer;
  const currentDirection = gameState.playerDirections[player];

  switch (e.key) {
    case "ArrowUp":
      e.preventDefault();
      if (currentDirection === "up") {
        // Move forward if already facing up
        movePlayer(player);
      } else {
        // Change direction to up
        changeDirection(player, "up");
      }
      break;
    case "ArrowDown":
      e.preventDefault();
      if (currentDirection === "down") {
        // Move forward if already facing down
        movePlayer(player);
      } else {
        // Change direction to down
        changeDirection(player, "down");
      }
      break;
    case "ArrowLeft":
      e.preventDefault();
      if (currentDirection === "left") {
        // Move forward if already facing left
        movePlayer(player);
      } else {
        // Change direction to left
        changeDirection(player, "left");
      }
      break;
    case "ArrowRight":
      e.preventDefault();
      if (currentDirection === "right") {
        // Move forward if already facing right
        movePlayer(player);
      } else {
        // Change direction to right
        changeDirection(player, "right");
      }
      break;
    case " ":
      e.preventDefault();
      // Try to kick bomb first, if no bomb then place one
      // Note: kickBombInFront now returns false without using action if bomb can't move
      if (!kickBombInFront()) {
        placeBombInFront();
      }
      break;
    case "Enter":
      e.preventDefault();
      // End turn early
      endTurn();
      break;
  }
});

// Initialize the game when the page loads
document.addEventListener("DOMContentLoaded", () => {
  initializePlayerSelection();
});
