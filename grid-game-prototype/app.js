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
};

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

  // Check if moving back to previous position (undo move)
  if (history.length > 1) {
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

  if (gameState.actionsRemaining <= 0) {
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
    }
  });
}

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
    await animateExplosions(bombsToExplode);

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

  // Calculate spaces reachable using the stored actions remaining (not current)
  const reachableSpaces = !gameState.gameOver
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
        reachableSpaces.has(`${row},${col}`) &&
        cellType !== "p1" &&
        cellType !== "p2" &&
        !isExploding &&
        !gameState.gameOver;
      const isVisited =
        !gameState.gameOver &&
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
          cell.textContent = `💣${bomb.timer}`;
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

      // Add click handler for movement and bomb actions
      cell.addEventListener("click", () => handleCellClick(row, col));
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
    currentPlayerEl.innerHTML = `Current Player: <span class="${gameState.currentPlayer}">${playerNum}</span>`;
    actionsEl.textContent = `Actions Remaining: ${gameState.actionsRemaining}`;
  }
}

function renderGrid() {
  const gridContainer = document.getElementById("grid");
  gridContainer.innerHTML = "";

  // Calculate spaces reachable using the stored actions remaining (not current)
  const reachableSpaces = !gameState.gameOver
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
        reachableSpaces.has(`${row},${col}`) &&
        cellType !== "p1" &&
        cellType !== "p2" &&
        !gameState.gameOver;
      const isVisited =
        !gameState.gameOver &&
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

      // Add click handler for movement and bomb actions
      cell.addEventListener("click", () => handleCellClick(row, col));
      gridContainer.appendChild(cell);
    }
  }
}

function handleCellClick(row, col) {
  if (gameState.gameOver) {
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

// Keyboard controls
document.addEventListener("keydown", (e) => {
  if (gameState.gameOver) {
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
  initializeGridState();
  renderGrid();
  updateUI();
});
