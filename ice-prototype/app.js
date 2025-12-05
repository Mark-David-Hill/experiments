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
const AI_ACTION_DELAY = 500;
const PLAYER_MAX_HEALTH = 5;
const ICE_BLOCK_MAX_HEALTH = 6;
const ICE_BLOCK_DAMAGE = 1;

// Character types: "bomber" or "freezer"
let characterTypes = {
  p1: null,
  p2: null,
};

// Player types configuration
let playerTypes = {
  p1: null,
  p2: null,
};

// AI difficulty levels
let aiDifficulty = {
  p1: "easy",
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
  playerHealth: {
    p1: PLAYER_MAX_HEALTH,
    p2: PLAYER_MAX_HEALTH,
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
  iceBlocks: [],
  grid: [],
  gameOver: false,
  winner: null,
  isProcessingTurn: false,
  isFirstTurn: true,
};

// Helper function to find ice blocks
function getIceBlockAt(row, col) {
  return gameState.iceBlocks.find((ice) => ice.row === row && ice.col === col);
}

function findIceBlockAt(row, col) {
  return gameState.iceBlocks.findIndex(
    (ice) => ice.row === row && ice.col === col
  );
}

// Check if there's a kickable object (bomb or ice) at position
function hasKickableObjectAt(row, col) {
  return findBombAt(row, col) !== -1 || findIceBlockAt(row, col) !== -1;
}

// Add helper function to find kickable objects (bombs or ice blocks) around a position
function getKickableObjects(row, col) {
  const kickableObjects = [];
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
    const iceBlock = getIceBlockAt(checkRow, checkCol);

    if (bomb && canChainBeKicked(checkRow, checkCol, dir)) {
      kickableObjects.push({
        row: checkRow,
        col: checkCol,
        direction: dir,
        type: "bomb",
        object: bomb,
      });
    }

    if (iceBlock && canChainBeKicked(checkRow, checkCol, dir)) {
      kickableObjects.push({
        row: checkRow,
        col: checkCol,
        direction: dir,
        type: "ice",
        object: iceBlock,
      });
    }
  }

  return kickableObjects;
}

// Check if a chain of objects can be kicked (has empty space at the end)
function canChainBeKicked(startRow, startCol, direction) {
  const offset = getDirectionOffset(direction);
  let currentRow = startRow;
  let currentCol = startCol;

  // Traverse the chain of bombs/ice blocks
  while (true) {
    const nextRow = currentRow + offset.dr;
    const nextCol = currentCol + offset.dc;

    const nextCellType = getCellType(nextRow, nextCol);
    const nextHasBomb = findBombAt(nextRow, nextCol) !== -1;
    const nextHasIce = findIceBlockAt(nextRow, nextCol) !== -1;

    // If next position has a bomb or ice, continue checking the chain
    if (nextHasBomb || nextHasIce) {
      currentRow = nextRow;
      currentCol = nextCol;
      continue;
    }

    // If next position is a wall or player, chain cannot be kicked
    if (
      nextCellType === "w" ||
      nextCellType === "p1" ||
      nextCellType === "p2"
    ) {
      return false;
    }

    // If next position is empty floor, chain can be kicked
    if (nextCellType === "f") {
      return true;
    }

    return false;
  }
}

// Find the last object in a chain and the empty space beyond it
function findChainEnd(startRow, startCol, direction) {
  const offset = getDirectionOffset(direction);
  let currentRow = startRow;
  let currentCol = startCol;
  let lastObjectRow = startRow;
  let lastObjectCol = startCol;
  let lastObjectType = findBombAt(startRow, startCol) !== -1 ? "bomb" : "ice";

  // Traverse the chain of bombs/ice blocks
  while (true) {
    const nextRow = currentRow + offset.dr;
    const nextCol = currentCol + offset.dc;

    const nextHasBomb = findBombAt(nextRow, nextCol) !== -1;
    const nextHasIce = findIceBlockAt(nextRow, nextCol) !== -1;

    if (nextHasBomb || nextHasIce) {
      currentRow = nextRow;
      currentCol = nextCol;
      lastObjectRow = nextRow;
      lastObjectCol = nextCol;
      lastObjectType = nextHasBomb ? "bomb" : "ice";
      continue;
    }

    // Found the end of the chain
    break;
  }

  // Now find where the last object would travel to
  let targetRow = lastObjectRow;
  let targetCol = lastObjectCol;

  while (true) {
    const nextRow = targetRow + offset.dr;
    const nextCol = targetCol + offset.dc;

    const nextCellType = getCellType(nextRow, nextCol);
    const nextHasBomb = findBombAt(nextRow, nextCol) !== -1;
    const nextHasIce = findIceBlockAt(nextRow, nextCol) !== -1;

    // Stop if we hit an obstacle
    if (nextCellType === "w" || nextHasBomb || nextHasIce) {
      break;
    }

    // Check for player collision (ice blocks stop and damage, bombs pass through)
    if (nextCellType === "p1" || nextCellType === "p2") {
      break;
    }

    targetRow = nextRow;
    targetCol = nextCol;
  }

  return {
    lastObjectRow,
    lastObjectCol,
    lastObjectType,
    targetRow,
    targetCol,
  };
}

// Update the old canBombBeKicked to use the new function
function canBombBeKicked(bombRow, bombCol, direction) {
  return canChainBeKicked(bombRow, bombCol, direction);
}

function canObjectBeKicked(objRow, objCol, direction, objectType) {
  return canChainBeKicked(objRow, objCol, direction);
}

// Initialize player selection
function initializePlayerSelection() {
  const playerTypeBtns = document.querySelectorAll(".player-type-btn");
  const characterTypeBtns = document.querySelectorAll(".character-type-btn");
  const startBtn = document.getElementById("start-game-btn");

  playerTypeBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const player = e.target.dataset.player;
      const type = e.target.dataset.type;

      document
        .querySelectorAll(`.player-type-btn[data-player="${player}"]`)
        .forEach((b) => {
          b.classList.remove("active");
        });

      e.target.classList.add("active");
      playerTypes[player] = type;

      const difficultyDiv = document.getElementById(`${player}-difficulty`);
      if (type === "ai") {
        difficultyDiv.style.display = "block";
      } else {
        difficultyDiv.style.display = "none";
      }

      checkStartButtonEnabled();
    });
  });

  characterTypeBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const player = e.target.dataset.player;
      const character = e.target.dataset.character;

      document
        .querySelectorAll(`.character-type-btn[data-player="${player}"]`)
        .forEach((b) => {
          b.classList.remove("active");
        });

      e.target.classList.add("active");
      characterTypes[player] = character;

      checkStartButtonEnabled();
    });
  });

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

function checkStartButtonEnabled() {
  const startBtn = document.getElementById("start-game-btn");
  if (
    playerTypes.p1 &&
    playerTypes.p2 &&
    characterTypes.p1 &&
    characterTypes.p2
  ) {
    startBtn.disabled = false;
  }
}

function resetPlayerSelection() {
  playerTypes.p1 = null;
  playerTypes.p2 = null;
  characterTypes.p1 = null;
  characterTypes.p2 = null;
  aiDifficulty.p1 = "easy";
  aiDifficulty.p2 = "easy";
  document.querySelectorAll(".player-type-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  document.querySelectorAll(".character-type-btn").forEach((btn) => {
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
  document.getElementById("player-selection").style.display = "none";
  document.getElementById("game-screen").style.display = "block";

  let p1TypeStr =
    playerTypes.p1 === "human" ? "Human" : `AI (${aiDifficulty.p1})`;
  let p2TypeStr =
    playerTypes.p2 === "human" ? "Human" : `AI (${aiDifficulty.p2})`;

  let p1CharStr = characterTypes.p1 === "bomber" ? "💣 Bomber" : "🧊 Freezer";
  let p2CharStr = characterTypes.p2 === "bomber" ? "💣 Bomber" : "🧊 Freezer";

  document.getElementById(
    "p1-type"
  ).textContent = `${p1TypeStr} - ${p1CharStr}`;
  document.getElementById(
    "p2-type"
  ).textContent = `${p2TypeStr} - ${p2CharStr}`;

  resetGameState();
  initializeGridState();
  renderGrid();
  updateUI();

  if (playerTypes[gameState.currentPlayer] === "ai") {
    setTimeout(() => processAITurn(), 1000);
  }
}

function resetGameState() {
  gameState = {
    currentPlayer: "p1",
    actionsRemaining: 3,
    playerPositions: {
      p1: { row: 1, col: 1 },
      p2: { row: 5, col: 5 },
    },
    playerHealth: {
      p1: PLAYER_MAX_HEALTH,
      p2: PLAYER_MAX_HEALTH,
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
      p1: 3,
      p2: ACTIONS_PER_TURN,
    },
    visitedSpaces: {
      p1: new Set(),
      p2: new Set(),
    },
    bombs: [],
    iceBlocks: [],
    grid: [],
    gameOver: false,
    winner: null,
    isProcessingTurn: false,
    isFirstTurn: true,
  };
}

// AI Utility Functions
function getExplosionRange(bombRow, bombCol) {
  const cells = new Set();
  cells.add(`${bombRow},${bombCol}`);

  const directions = [
    { dr: -1, dc: 0 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 },
  ];

  for (const dir of directions) {
    let currentRow = bombRow;
    let currentCol = bombCol;

    while (true) {
      currentRow += dir.dr;
      currentCol += dir.dc;

      if (getCellType(currentRow, currentCol) === "w") {
        break;
      }

      cells.add(`${currentRow},${currentCol}`);

      const bombAtPos = getBombAt(currentRow, currentCol);
      if (bombAtPos) {
        break;
      }
    }
  }

  return cells;
}

function getAllThreatenedCells(turnsInFuture = 0) {
  const threatenedCells = new Set();
  const processedBombs = new Set();
  const bombsToProcess = [];

  for (const bomb of gameState.bombs) {
    if (bomb.timer <= turnsInFuture + 1) {
      bombsToProcess.push({ row: bomb.row, col: bomb.col, timer: bomb.timer });
    }
  }

  while (bombsToProcess.length > 0) {
    const bomb = bombsToProcess.shift();
    const key = `${bomb.row},${bomb.col}`;

    if (processedBombs.has(key)) continue;
    processedBombs.add(key);

    const explosionCells = getExplosionRange(bomb.row, bomb.col);
    explosionCells.forEach((cell) => threatenedCells.add(cell));

    for (const cellKey of explosionCells) {
      const [r, c] = cellKey.split(",").map(Number);
      const bombAtCell = getBombAt(r, c);
      if (bombAtCell && !processedBombs.has(cellKey)) {
        bombsToProcess.push({ row: r, col: c, timer: bombAtCell.timer });
      }
    }
  }

  return threatenedCells;
}

function isSafePosition(row, col, turnsInFuture = 0) {
  const threatenedCells = getAllThreatenedCells(turnsInFuture);
  return !threatenedCells.has(`${row},${col}`);
}

function willBeSafeAfterAction(
  player,
  actionType,
  actionPos,
  remainingActions
) {
  const currentPos = gameState.playerPositions[player];

  if (
    actionType === "placeObject" &&
    gameState.bombs.length === 0 &&
    gameState.iceBlocks.length === 0
  ) {
    if (remainingActions <= 1) {
      const validMoves = getValidMoves(player);
      return validMoves.size > 0;
    }
    return true;
  }

  const originalBombs = [...gameState.bombs];
  const originalIce = [...gameState.iceBlocks];

  if (actionType === "placeObject") {
    if (characterTypes[player] === "bomber") {
      gameState.bombs.push({
        row: actionPos.row,
        col: actionPos.col,
        timer: 4,
      });
    } else {
      gameState.iceBlocks.push({
        row: actionPos.row,
        col: actionPos.col,
        health: ICE_BLOCK_MAX_HEALTH,
      });
    }
  } else if (actionType === "kick") {
    const bombIndex = findBombAt(actionPos.row, actionPos.col);
    const iceIndex = findIceBlockAt(actionPos.row, actionPos.col);

    if (bombIndex !== -1 || iceIndex !== -1) {
      const direction = gameState.playerDirections[player];
      const chainEnd = findChainEnd(actionPos.row, actionPos.col, direction);

      if (chainEnd.lastObjectType === "bomb") {
        const idx = findBombAt(chainEnd.lastObjectRow, chainEnd.lastObjectCol);
        if (idx !== -1) {
          gameState.bombs[idx] = {
            ...gameState.bombs[idx],
            row: chainEnd.targetRow,
            col: chainEnd.targetCol,
          };
        }
      } else {
        const idx = findIceBlockAt(
          chainEnd.lastObjectRow,
          chainEnd.lastObjectCol
        );
        if (idx !== -1) {
          gameState.iceBlocks[idx] = {
            ...gameState.iceBlocks[idx],
            row: chainEnd.targetRow,
            col: chainEnd.targetCol,
          };
        }
      }
    }
  }

  let isSafe = false;
  const turnsToCheck = aiDifficulty[player] === "hard" ? 1 : 0;

  if (isSafePosition(currentPos.row, currentPos.col, turnsToCheck)) {
    isSafe = true;
  } else {
    const safePositions = findSafePositions(
      currentPos.row,
      currentPos.col,
      remainingActions - 1
    );
    isSafe = safePositions.length > 0;
  }

  gameState.bombs = originalBombs;
  gameState.iceBlocks = originalIce;

  return isSafe;
}

function chooseLeastDangerousMove(player, moves, remainingActions) {
  let bestMove = null;
  let bestScore = -Infinity;

  for (const moveKey of moves) {
    const [row, col] = moveKey.split(",").map(Number);
    let score = 0;

    const futureReachable = getReachableWithinMoves(
      player,
      remainingActions - 1,
      { row, col }
    );
    score += futureReachable.size * 10;

    const eventualSafePositions = findSafePositions(
      row,
      col,
      remainingActions - 1
    );
    score += eventualSafePositions.length * 20;

    for (const bomb of gameState.bombs) {
      const distance = Math.abs(bomb.row - row) + Math.abs(bomb.col - col);
      score += distance * (5 - bomb.timer);
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
      isSafe = isSafePosition(r, c, 0);
    } else if (difficulty === "hard") {
      isSafe = isSafePosition(r, c, 1);
    }

    if (isSafe) {
      safePositions.push({ row: r, col: c });
    }
  }

  return safePositions;
}

function getPathToPosition(fromRow, fromCol, toRow, toCol, maxMoves) {
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
  const opponent = player === "p1" ? "p2" : "p1";
  const opponentPos = gameState.playerPositions[opponent];
  let score = 0;

  if (action.type === "placeObject") {
    const front = getFrontCell(player);

    if (characterTypes[player] === "bomber") {
      const bombRange = getExplosionRange(front.row, front.col);

      if (bombRange.has(`${opponentPos.row},${opponentPos.col}`)) {
        score += 50;
      }

      const opponentSafePositions = findSafePositionsAfterBomb(
        opponentPos.row,
        opponentPos.col,
        ACTIONS_PER_TURN,
        { row: front.row, col: front.col, timer: 4 }
      );

      if (opponentSafePositions.length === 0) {
        score += 100;
      } else if (opponentSafePositions.length <= 2) {
        score += 25;
      }
    } else {
      // Freezer - evaluate ice placement strategically
      const playerPos = gameState.playerPositions[player];
      const direction = gameState.playerDirections[player];

      // Check if placing ice here would set up a future kick toward opponent
      const distanceToOpponent =
        Math.abs(front.row - opponentPos.row) +
        Math.abs(front.col - opponentPos.col);

      // Bonus for placing ice in line with opponent
      if (front.row === opponentPos.row || front.col === opponentPos.col) {
        score += 30;

        // Extra bonus if opponent is close
        if (distanceToOpponent <= 3) {
          score += 20;
        }
      }

      // Check if we could immediately kick this ice toward opponent
      const kickResult = simulateIceKickTowardOpponent(
        front.row,
        front.col,
        opponentPos
      );
      if (kickResult.wouldHit) {
        score += 50;
      } else if (kickResult.distance <= 2) {
        score += 25;
      }

      // Base score for placing obstacle
      score += 10;

      // Bonus if it restricts opponent movement
      const opponentReachable = getReachableWithinMoves(
        opponent,
        ACTIONS_PER_TURN,
        opponentPos
      );
      if (opponentReachable.size < 8) {
        score += 15;
      }
    }
  } else if (action.type === "kickObject") {
    const front = getFrontCell(player);
    const kickDirection = gameState.playerDirections[player];

    if (hasKickableObjectAt(front.row, front.col)) {
      const chainEnd = findChainEnd(front.row, front.col, kickDirection);

      if (chainEnd.lastObjectType === "bomb") {
        const bombRange = getExplosionRange(
          chainEnd.targetRow,
          chainEnd.targetCol
        );

        if (bombRange.has(`${opponentPos.row},${opponentPos.col}`)) {
          const bomb = getBombAt(
            chainEnd.lastObjectRow,
            chainEnd.lastObjectCol
          );
          score += 30;
          if (bomb && bomb.timer <= 2) {
            score += 20;
          }
        }
      } else {
        // Ice block kick evaluation - significantly improved
        const offset = getDirectionOffset(kickDirection);
        const beyondTarget = {
          row: chainEnd.targetRow + offset.dr,
          col: chainEnd.targetCol + offset.dc,
        };
        const cellBeyond = getCellType(beyondTarget.row, beyondTarget.col);

        // High priority: will directly hit opponent
        if (cellBeyond === opponent) {
          score += 80;

          // Even higher if opponent has low health
          if (gameState.playerHealth[opponent] <= 2) {
            score += 40;
          }
        }

        // Check distance to opponent after kick
        const distAfterKick =
          Math.abs(chainEnd.targetRow - opponentPos.row) +
          Math.abs(chainEnd.targetCol - opponentPos.col);

        // Bonus for getting ice closer to opponent
        if (distAfterKick <= 1) {
          score += 35;
        } else if (distAfterKick <= 2) {
          score += 20;
        } else if (distAfterKick <= 3) {
          score += 10;
        }

        // Bonus if ice ends up in same row or column as opponent (future kick potential)
        if (
          chainEnd.targetRow === opponentPos.row ||
          chainEnd.targetCol === opponentPos.col
        ) {
          score += 25;

          // Check if there's a clear path to opponent from the ice's new position
          if (
            hasDirectPathToOpponent(
              chainEnd.targetRow,
              chainEnd.targetCol,
              opponentPos
            )
          ) {
            score += 15;
          }
        }
      }
    }
  }

  return score;
}

// New helper function to simulate kicking ice toward opponent
function simulateIceKickTowardOpponent(iceRow, iceCol, opponentPos) {
  const directions = ["up", "down", "left", "right"];
  let bestResult = { wouldHit: false, distance: Infinity };

  for (const dir of directions) {
    const offset = getDirectionOffset(dir);
    let currentRow = iceRow;
    let currentCol = iceCol;

    // Simulate the ice traveling
    while (true) {
      const nextRow = currentRow + offset.dr;
      const nextCol = currentCol + offset.dc;

      const nextCellType = getCellType(nextRow, nextCol);
      const nextHasBomb = findBombAt(nextRow, nextCol) !== -1;
      const nextHasIce = findIceBlockAt(nextRow, nextCol) !== -1;

      // Check if we'd hit the opponent
      if (nextRow === opponentPos.row && nextCol === opponentPos.col) {
        return { wouldHit: true, distance: 0 };
      }

      // Stop if we hit an obstacle
      if (
        nextCellType === "w" ||
        nextHasBomb ||
        nextHasIce ||
        nextCellType === "p1" ||
        nextCellType === "p2"
      ) {
        break;
      }

      currentRow = nextRow;
      currentCol = nextCol;
    }

    // Calculate distance from final position to opponent
    const dist =
      Math.abs(currentRow - opponentPos.row) +
      Math.abs(currentCol - opponentPos.col);
    if (dist < bestResult.distance) {
      bestResult = { wouldHit: false, distance: dist };
    }
  }

  return bestResult;
}

// New helper function to check if there's a direct path from ice to opponent
function hasDirectPathToOpponent(fromRow, fromCol, opponentPos) {
  // Check horizontal path
  if (fromRow === opponentPos.row) {
    const minCol = Math.min(fromCol, opponentPos.col);
    const maxCol = Math.max(fromCol, opponentPos.col);
    let blocked = false;

    for (let col = minCol + 1; col < maxCol; col++) {
      const cellType = getCellType(fromRow, col);
      if (
        cellType === "w" ||
        findBombAt(fromRow, col) !== -1 ||
        findIceBlockAt(fromRow, col) !== -1
      ) {
        blocked = true;
        break;
      }
    }

    if (!blocked) return true;
  }

  // Check vertical path
  if (fromCol === opponentPos.col) {
    const minRow = Math.min(fromRow, opponentPos.row);
    const maxRow = Math.max(fromRow, opponentPos.row);
    let blocked = false;

    for (let row = minRow + 1; row < maxRow; row++) {
      const cellType = getCellType(row, fromCol);
      if (
        cellType === "w" ||
        findBombAt(row, fromCol) !== -1 ||
        findIceBlockAt(row, fromCol) !== -1
      ) {
        blocked = true;
        break;
      }
    }

    if (!blocked) return true;
  }

  return false;
}

function findSafePositionsAfterBomb(fromRow, fromCol, maxMoves, newBomb) {
  const tempBombs = [...gameState.bombs, newBomb];
  const originalBombs = gameState.bombs;
  gameState.bombs = tempBombs;

  const safePositions = findSafePositions(fromRow, fromCol, maxMoves);

  gameState.bombs = originalBombs;

  return safePositions;
}

function simulateObjectKick(objRow, objCol, direction, objectType) {
  const chainEnd = findChainEnd(objRow, objCol, direction);
  return { row: chainEnd.targetRow, col: chainEnd.targetCol };
}

function simulateBombKick(bombRow, bombCol, direction) {
  return simulateObjectKick(bombRow, bombCol, direction, "bomb");
}

// AI Logic Functions
async function processAITurn() {
  if (gameState.gameOver || playerTypes[gameState.currentPlayer] !== "ai") {
    return;
  }

  gameState.isProcessingTurn = true;
  const difficulty = aiDifficulty[gameState.currentPlayer];

  if (difficulty === "easy") {
    await processEasyAI();
  } else if (difficulty === "medium") {
    await processMediumAI();
  } else if (difficulty === "hard") {
    await processHardAI();
  }

  gameState.isProcessingTurn = false;

  if (!gameState.gameOver && gameState.actionsRemaining >= 0) {
    endTurn();
  }
}

async function processEasyAI() {
  let noActionTurns = 0;

  while (gameState.actionsRemaining > 0 && !gameState.gameOver) {
    const actions = getAvailableAIActions(gameState.currentPlayer);

    if (actions.length === 0) {
      const pos = gameState.playerPositions[gameState.currentPlayer];
      const kickableObjects = getKickableObjects(pos.row, pos.col);

      if (kickableObjects.length > 0) {
        const objToKick =
          kickableObjects[Math.floor(Math.random() * kickableObjects.length)];

        const currentDir = gameState.playerDirections[gameState.currentPlayer];
        if (currentDir !== objToKick.direction) {
          changeDirection(gameState.currentPlayer, objToKick.direction);
          await new Promise((resolve) =>
            setTimeout(resolve, AI_ACTION_DELAY / 2)
          );
        }

        kickObjectInFront();
        await new Promise((resolve) => setTimeout(resolve, AI_ACTION_DELAY));
        noActionTurns = 0;
      } else {
        break;
      }
    } else {
      const action = actions[Math.floor(Math.random() * actions.length)];
      const actionTaken = executeAIAction(action, gameState.currentPlayer);

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

async function processMediumAI() {
  const player = gameState.currentPlayer;
  let pos = gameState.playerPositions[player];
  let moveAttempts = 0;

  let currentlySafe = isSafePosition(pos.row, pos.col, 0);

  if (!currentlySafe) {
    const safePositions = findSafePositions(
      pos.row,
      pos.col,
      gameState.actionsRemaining
    );

    if (safePositions.length > 0) {
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
        for (const step of shortestPath) {
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

        currentlySafe = isSafePosition(pos.row, pos.col, 0);
      }
    } else {
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

      if (validMoves.size === 0) {
        const kickableObjects = getKickableObjects(pos.row, pos.col);
        if (kickableObjects.length > 0) {
          const objInfo = kickableObjects[0];
          const currentDir = gameState.playerDirections[player];
          if (currentDir !== objInfo.direction) {
            changeDirection(player, objInfo.direction);
            await new Promise((resolve) =>
              setTimeout(resolve, AI_ACTION_DELAY / 2)
            );
          }
          kickObjectInFront();
          await new Promise((resolve) => setTimeout(resolve, AI_ACTION_DELAY));
          pos = gameState.playerPositions[player];
        }
      }
    }
  }

  let noActionTurns = 0;
  while (
    gameState.actionsRemaining > 0 &&
    !gameState.gameOver &&
    moveAttempts < 10
  ) {
    moveAttempts++;
    const actions = getAvailableAIActions(player);
    pos = gameState.playerPositions[player];

    const safeActions = actions.filter((action) => {
      if (action.type === "move") {
        const moveSafe = isSafePosition(action.row, action.col, 0);

        if (gameState.actionsRemaining === 1) {
          return moveSafe;
        }

        if (moveSafe) {
          return true;
        } else {
          const futureReachable = getReachableWithinMoves(
            player,
            gameState.actionsRemaining - 1,
            { row: action.row, col: action.col }
          );

          for (const posKey of futureReachable) {
            const [r, c] = posKey.split(",").map(Number);
            if (isSafePosition(r, c, 0)) {
              return true;
            }
          }
        }
        return false;
      } else if (action.type === "placeObject") {
        const front = getFrontCell(player);
        return willBeSafeAfterAction(
          player,
          "placeObject",
          front,
          gameState.actionsRemaining
        );
      } else if (action.type === "kickObject") {
        const front = getFrontCell(player);
        return willBeSafeAfterAction(
          player,
          "kick",
          front,
          gameState.actionsRemaining
        );
      }
      return true;
    });

    if (safeActions.length === 0) {
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

// Updated processHardAI to be more aggressive with ice as freezer
async function processHardAI() {
  const player = gameState.currentPlayer;
  let pos = gameState.playerPositions[player];
  let moveAttempts = 0;

  let currentlySafe = isSafePosition(pos.row, pos.col, 1);

  // For freezer, also check for immediate attack opportunities before moving to safety
  if (characterTypes[player] === "freezer" && gameState.actionsRemaining > 0) {
    const immediateAttack = findImmediateIceAttack(player);
    if (immediateAttack) {
      // Execute the attack sequence
      for (const action of immediateAttack.actions) {
        if (gameState.actionsRemaining <= 0 || gameState.gameOver) break;

        if (action.type === "changeDirection") {
          changeDirection(player, action.direction);
          await new Promise((resolve) =>
            setTimeout(resolve, AI_ACTION_DELAY / 2)
          );
        } else if (action.type === "kick") {
          kickObjectInFront();
          await new Promise((resolve) => setTimeout(resolve, AI_ACTION_DELAY));
        } else if (action.type === "place") {
          placeObjectInFront();
          await new Promise((resolve) => setTimeout(resolve, AI_ACTION_DELAY));
        }
      }
      pos = gameState.playerPositions[player];
      currentlySafe = isSafePosition(pos.row, pos.col, 1);
    }
  }

  if (!currentlySafe) {
    const safePositions = findSafePositions(
      pos.row,
      pos.col,
      gameState.actionsRemaining
    );

    if (safePositions.length > 0) {
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
          let score = 100 - path.length;

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

      const kickableObjects = getKickableObjects(pos.row, pos.col);

      let bestKick = null;
      let bestKickScore = -Infinity;

      for (const objInfo of kickableObjects) {
        const originalDir = gameState.playerDirections[player];
        gameState.playerDirections[player] = objInfo.direction;
        const front = getFrontCell(player);

        if (
          willBeSafeAfterAction(
            player,
            "kick",
            front,
            gameState.actionsRemaining
          )
        ) {
          let score = 0;
          const chainEnd = findChainEnd(
            objInfo.row,
            objInfo.col,
            objInfo.direction
          );

          if (chainEnd.lastObjectType === "bomb") {
            const bombRange = getExplosionRange(
              chainEnd.targetRow,
              chainEnd.targetCol
            );
            const opponent = player === "p1" ? "p2" : "p1";
            const opponentPos = gameState.playerPositions[opponent];

            if (bombRange.has(`${opponentPos.row},${opponentPos.col}`)) {
              score += 100;
              if (objInfo.object.timer <= 2) {
                score += 50;
              }
            }
          } else {
            const opponent = player === "p1" ? "p2" : "p1";
            const opponentPos = gameState.playerPositions[opponent];
            const offset = getDirectionOffset(objInfo.direction);
            const beyondTarget = {
              row: chainEnd.targetRow + offset.dr,
              col: chainEnd.targetCol + offset.dc,
            };

            if (getCellType(beyondTarget.row, beyondTarget.col) === opponent) {
              score += 80;
            }
          }

          if (score > bestKickScore) {
            bestKickScore = score;
            bestKick = objInfo;
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
        kickObjectInFront();
        await new Promise((resolve) => setTimeout(resolve, AI_ACTION_DELAY));
        pos = gameState.playerPositions[player];
        currentlySafe = isSafePosition(pos.row, pos.col, 1);
      }
    }
  }

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

    // For freezer, prioritize offensive actions more heavily
    let bestAction = null;
    let bestScore = -Infinity;

    for (const action of actions) {
      let score = 0;
      let isSafe = false;

      if (action.type === "move") {
        if (!isSafePosition(action.row, action.col, 1)) {
          if (gameState.actionsRemaining === 1) {
            continue;
          }
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

        // For freezer, evaluate if this move positions us for an ice attack
        if (characterTypes[player] === "freezer") {
          const opponent = player === "p1" ? "p2" : "p1";
          const opponentPos = gameState.playerPositions[opponent];

          // Bonus for moving into same row or column as opponent
          if (
            action.row === opponentPos.row ||
            action.col === opponentPos.col
          ) {
            score += 15;

            // Check if we'd have a clear shot after moving
            if (hasDirectPathToOpponent(action.row, action.col, opponentPos)) {
              score += 25;
            }
          }

          // Bonus for closing distance to opponent
          const currentDist =
            Math.abs(pos.row - opponentPos.row) +
            Math.abs(pos.col - opponentPos.col);
          const newDist =
            Math.abs(action.row - opponentPos.row) +
            Math.abs(action.col - opponentPos.col);
          if (newDist < currentDist) {
            score += 10;
          }
        }
      } else if (
        action.type === "placeObject" ||
        action.type === "kickObject"
      ) {
        const front = getFrontCell(player);

        if (
          !willBeSafeAfterAction(
            player,
            action.type === "placeObject" ? "placeObject" : "kick",
            front,
            gameState.actionsRemaining
          )
        ) {
          continue;
        }

        isSafe = true;
      } else {
        isSafe = true;
      }

      if (!isSafe) continue;

      score += evaluateOffensiveMove(action, player);

      if (
        action.type === "placeObject" &&
        gameState.bombs.length === 0 &&
        gameState.iceBlocks.length === 0
      ) {
        score += 30;
      }

      if (action.type === "move") {
        const futureReachable = getReachableWithinMoves(
          player,
          ACTIONS_PER_TURN,
          { row: action.row, col: action.col }
        );
        score += futureReachable.size * 0.5;
      }

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

// New function to find immediate ice attack opportunities
function findImmediateIceAttack(player) {
  const pos = gameState.playerPositions[player];
  const opponent = player === "p1" ? "p2" : "p1";
  const opponentPos = gameState.playerPositions[opponent];

  // Check if we can kick existing ice at opponent
  const kickableObjects = getKickableObjects(pos.row, pos.col);

  for (const obj of kickableObjects) {
    if (obj.type === "ice") {
      const chainEnd = findChainEnd(obj.row, obj.col, obj.direction);
      const offset = getDirectionOffset(obj.direction);
      const beyondTarget = {
        row: chainEnd.targetRow + offset.dr,
        col: chainEnd.targetCol + offset.dc,
      };

      if (
        beyondTarget.row === opponentPos.row &&
        beyondTarget.col === opponentPos.col
      ) {
        // Can hit opponent with existing ice!
        const actions = [];
        if (gameState.playerDirections[player] !== obj.direction) {
          actions.push({ type: "changeDirection", direction: obj.direction });
        }
        actions.push({ type: "kick" });

        // Verify this is safe
        const front = getFrontCell(player);
        if (
          willBeSafeAfterAction(
            player,
            "kick",
            { row: obj.row, col: obj.col },
            gameState.actionsRemaining
          )
        ) {
          return { actions, score: 100 };
        }
      }
    }
  }

  // Check if we can place ice and immediately kick it at opponent
  const directions = ["up", "down", "left", "right"];

  for (const dir of directions) {
    const offset = getDirectionOffset(dir);
    const frontRow = pos.row + offset.dr;
    const frontCol = pos.col + offset.dc;

    // Check if we can place ice in front
    const cellType = getCellType(frontRow, frontCol);
    if (cellType !== "f" || hasKickableObjectAt(frontRow, frontCol)) {
      continue;
    }

    // Simulate placing ice and then check if kicking it would hit opponent
    const kickSimResult = simulateIceKickFromPosition(
      frontRow,
      frontCol,
      dir,
      opponentPos
    );

    if (kickSimResult.wouldHit && gameState.actionsRemaining >= 2) {
      const actions = [];
      if (gameState.playerDirections[player] !== dir) {
        actions.push({ type: "changeDirection", direction: dir });
      }
      actions.push({ type: "place" });
      actions.push({ type: "kick" });

      // Verify safety
      if (
        willBeSafeAfterAction(
          player,
          "placeObject",
          { row: frontRow, col: frontCol },
          gameState.actionsRemaining
        )
      ) {
        return { actions, score: 80 };
      }
    }
  }

  // Check if moving one space would set up an attack
  if (gameState.actionsRemaining >= 3) {
    const validMoves = getValidMoves(player);

    for (const moveKey of validMoves) {
      const [moveRow, moveCol] = moveKey.split(",").map(Number);

      // From this new position, check each direction
      for (const dir of directions) {
        const offset = getDirectionOffset(dir);
        const frontRow = moveRow + offset.dr;
        const frontCol = moveCol + offset.dc;

        const cellType = getCellType(frontRow, frontCol);
        if (cellType !== "f" || hasKickableObjectAt(frontRow, frontCol)) {
          continue;
        }

        const kickSimResult = simulateIceKickFromPosition(
          frontRow,
          frontCol,
          dir,
          opponentPos
        );

        if (kickSimResult.wouldHit) {
          // Need to figure out direction to move
          const moveDir = getDirectionToTarget(
            pos.row,
            pos.col,
            moveRow,
            moveCol
          );
          if (!moveDir) continue;

          const actions = [];
          if (gameState.playerDirections[player] !== moveDir) {
            actions.push({ type: "changeDirection", direction: moveDir });
          }
          actions.push({ type: "move", row: moveRow, col: moveCol });
          if (dir !== moveDir) {
            actions.push({ type: "changeDirection", direction: dir });
          }
          actions.push({ type: "place" });
          actions.push({ type: "kick" });

          // Only if we have enough actions
          if (
            actions.filter((a) => a.type !== "changeDirection").length <=
            gameState.actionsRemaining
          ) {
            return { actions, score: 60 };
          }
        }
      }
    }
  }

  return null;
}

// Helper to simulate ice kick from a position
function simulateIceKickFromPosition(iceRow, iceCol, direction, opponentPos) {
  const offset = getDirectionOffset(direction);
  let currentRow = iceRow;
  let currentCol = iceCol;

  while (true) {
    const nextRow = currentRow + offset.dr;
    const nextCol = currentCol + offset.dc;

    // Check if we'd hit the opponent
    if (nextRow === opponentPos.row && nextCol === opponentPos.col) {
      return { wouldHit: true, finalRow: currentRow, finalCol: currentCol };
    }

    const nextCellType = getCellType(nextRow, nextCol);
    const nextHasBomb = findBombAt(nextRow, nextCol) !== -1;
    const nextHasIce = findIceBlockAt(nextRow, nextCol) !== -1;

    if (
      nextCellType === "w" ||
      nextHasBomb ||
      nextHasIce ||
      nextCellType === "p1" ||
      nextCellType === "p2"
    ) {
      return { wouldHit: false, finalRow: currentRow, finalCol: currentCol };
    }

    currentRow = nextRow;
    currentCol = nextCol;
  }
}

// Helper to get direction from one cell to adjacent cell
function getDirectionToTarget(fromRow, fromCol, toRow, toCol) {
  if (toRow < fromRow) return "up";
  if (toRow > fromRow) return "down";
  if (toCol < fromCol) return "left";
  if (toCol > fromCol) return "right";
  return null;
}

function executeAIAction(action, player) {
  switch (action.type) {
    case "move":
      return movePlayerTo(player, action.row, action.col);
    case "changeDirection":
      return changeDirection(player, action.direction);
    case "placeObject":
      return placeObjectInFront();
    case "kickObject":
      return kickObjectInFront();
    default:
      return false;
  }
}

function getAvailableAIActions(player) {
  const actions = [];
  const pos = gameState.playerPositions[player];

  const validMoves = getValidMoves(player);
  validMoves.forEach((moveKey) => {
    const [row, col] = moveKey.split(",").map(Number);
    actions.push({ type: "move", row, col });
  });

  const directions = ["up", "down", "left", "right"];
  const currentDir = gameState.playerDirections[player];
  directions.forEach((dir) => {
    if (dir !== currentDir) {
      const offset = getDirectionOffset(dir);
      const targetRow = pos.row + offset.dr;
      const targetCol = pos.col + offset.dc;
      const targetCellType = getCellType(targetRow, targetCol);

      if (targetCellType === "w") {
        return;
      }

      if (
        hasKickableObjectAt(targetRow, targetCol) &&
        !canChainBeKicked(targetRow, targetCol, dir)
      ) {
        return;
      }

      actions.push({ type: "changeDirection", direction: dir });
    }
  });

  const front = getFrontCell(player);
  const frontCellType = getCellType(front.row, front.col);

  if (frontCellType === "p1" || frontCellType === "p2") {
    const direction = gameState.playerDirections[player];
    const offset = getDirectionOffset(direction);
    const kickToRow = front.row + offset.dr;
    const kickToCol = front.col + offset.dc;
    const targetCellType = getCellType(kickToRow, kickToCol);
    const targetHasBomb = findBombAt(kickToRow, kickToCol) !== -1;
    const targetHasIce = findIceBlockAt(kickToRow, kickToCol) !== -1;

    if (targetCellType === "f" && !targetHasBomb && !targetHasIce) {
      actions.push({ type: "kickObject" });
    }
  }

  if (frontCellType === "f" && !hasKickableObjectAt(front.row, front.col)) {
    actions.push({ type: "placeObject" });
  }

  if (hasKickableObjectAt(front.row, front.col)) {
    if (
      canChainBeKicked(front.row, front.col, gameState.playerDirections[player])
    ) {
      actions.push({ type: "kickObject" });
    }
  }

  return actions;
}

function initializeGridState() {
  gameState.grid = gridLayout.map((row) => [...row]);
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (gameState.grid[row][col] === "p1") {
        gameState.playerPositions.p1 = { row, col };
        gameState.highlightOrigin.p1 = { row, col };
        gameState.highlightActionsRemaining.p1 = gameState.isFirstTurn
          ? 3
          : ACTIONS_PER_TURN;
        gameState.visitedSpaces.p1 = new Set();
        gameState.visitedSpaces.p1.add(`${row},${col}`);
      } else if (gameState.grid[row][col] === "p2") {
        gameState.playerPositions.p2 = { row, col };
        gameState.highlightOrigin.p2 = { row, col };
        gameState.highlightActionsRemaining.p2 = ACTIONS_PER_TURN;
        gameState.visitedSpaces.p2 = new Set();
        gameState.visitedSpaces.p2.add(`${row},${col}`);
      }
    }
  }

  if (gameState.currentPlayer === "p1" && gameState.isFirstTurn) {
    gameState.actionsRemaining = 3;
  } else {
    gameState.actionsRemaining = ACTIONS_PER_TURN;
  }
}

function getCellType(row, col) {
  if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
    return "w";
  }
  return gameState.grid[row][col];
}

function setCellType(row, col, type) {
  if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
    return;
  }
  gameState.grid[row][col] = type;
}

function isObstacle(row, col) {
  const cellType = getCellType(row, col);
  const hasBomb = findBombAt(row, col) !== -1;
  const hasIce = findIceBlockAt(row, col) !== -1;
  return (
    cellType === "w" ||
    cellType === "p1" ||
    cellType === "p2" ||
    hasBomb ||
    hasIce
  );
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

  gameState.playerDirections[player] = direction;
  renderGrid();
  return true;
}

function getValidMoves(player) {
  const pos = gameState.playerPositions[player];
  const validMoves = new Set();

  const directions = [
    { dr: -1, dc: 0 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 },
  ];

  for (const dir of directions) {
    const newRow = pos.row + dir.dr;
    const newCol = pos.col + dir.dc;

    if (!isObstacle(newRow, newCol)) {
      validMoves.add(`${newRow},${newCol}`);
    }
  }

  return validMoves;
}

function getReachableWithinMoves(player, maxMoves, originPos) {
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

    if (current.moves <= maxMoves) {
      reachable.add(key);
    }

    if (current.moves >= maxMoves) {
      continue;
    }

    const directions = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 },
    ];

    for (const dir of directions) {
      const newRow = current.row + dir.dr;
      const newCol = current.col + dir.dc;
      const newKey = `${newRow},${newCol}`;

      if (visited.has(newKey)) continue;
      visited.add(newKey);

      const cellType = getCellType(newRow, newCol);
      const hasBomb = findBombAt(newRow, newCol) !== -1;
      const hasIce = findIceBlockAt(newRow, newCol) !== -1;
      const isOtherPlayer =
        (cellType === "p1" && player !== "p1") ||
        (cellType === "p2" && player !== "p2");

      if (cellType !== "w" && !hasBomb && !hasIce && !isOtherPlayer) {
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

  if (playerTypes[player] === "human" && history.length > 1) {
    const prevPos = history[history.length - 2];
    if (targetRow === prevPos.row && targetCol === prevPos.col) {
      gameState.actionsRemaining++;

      history.pop();

      const oldBombIndex = findBombAt(pos.row, pos.col);
      const oldIceIndex = findIceBlockAt(pos.row, pos.col);
      if (oldBombIndex !== -1) {
        gameState.grid[pos.row][pos.col] = "bomb";
      } else if (oldIceIndex !== -1) {
        gameState.grid[pos.row][pos.col] = "ice";
      } else {
        gameState.grid[pos.row][pos.col] = "f";
      }

      gameState.grid[targetRow][targetCol] = player;
      gameState.playerPositions[player] = { row: targetRow, col: targetCol };

      gameState.visitedSpaces[player].delete(`${pos.row},${pos.col}`);

      updateUI();
      renderGrid();
      return true;
    }
  }

  const reachableFromCurrent = getReachableWithinMoves(
    player,
    gameState.actionsRemaining,
    { row: pos.row, col: pos.col }
  );
  const targetKey = `${targetRow},${targetCol}`;

  if (!reachableFromCurrent.has(targetKey)) {
    return false;
  }

  const validMoves = getValidMoves(player);
  if (!validMoves.has(targetKey)) {
    return false;
  }

  if (gameState.actionsRemaining <= 0) {
    return false;
  }

  const oldBombIndex = findBombAt(pos.row, pos.col);
  const oldIceIndex = findIceBlockAt(pos.row, pos.col);
  if (oldBombIndex !== -1) {
    gameState.grid[pos.row][pos.col] = "bomb";
  } else if (oldIceIndex !== -1) {
    gameState.grid[pos.row][pos.col] = "ice";
  } else {
    gameState.grid[pos.row][pos.col] = "f";
  }

  gameState.grid[targetRow][targetCol] = player;
  gameState.playerPositions[player] = { row: targetRow, col: targetCol };

  history.push({ row: targetRow, col: targetCol });

  gameState.visitedSpaces[player].add(`${targetRow},${targetCol}`);

  gameState.actionsRemaining--;
  updateUI();

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

function placeObjectInFront() {
  if (gameState.actionsRemaining <= 0 || gameState.gameOver) {
    return false;
  }

  const player = gameState.currentPlayer;
  const front = getFrontCell(player);
  const cellType = getCellType(front.row, front.col);

  if (cellType !== "f") {
    return false;
  }

  if (hasKickableObjectAt(front.row, front.col)) {
    return false;
  }

  if (characterTypes[player] === "bomber") {
    gameState.bombs.push({ row: front.row, col: front.col, timer: 4 });
  } else {
    gameState.iceBlocks.push({
      row: front.row,
      col: front.col,
      health: ICE_BLOCK_MAX_HEALTH,
    });
  }

  useAction();

  const pos = gameState.playerPositions[player];
  gameState.highlightOrigin[player] = {
    row: pos.row,
    col: pos.col,
  };
  gameState.highlightActionsRemaining[player] = gameState.actionsRemaining;

  gameState.moveHistory[player] = [{ row: pos.row, col: pos.col }];

  gameState.visitedSpaces[player].clear();
  gameState.visitedSpaces[player].add(`${pos.row},${pos.col}`);

  renderGrid();
  return true;
}

function kickPlayerInFront() {
  if (gameState.actionsRemaining <= 0 || gameState.gameOver) {
    return false;
  }

  const front = getFrontCell(gameState.currentPlayer);
  const cellType = getCellType(front.row, front.col);

  const playerToKick =
    cellType === "p1" ? "p1" : cellType === "p2" ? "p2" : null;
  if (!playerToKick) {
    return false;
  }

  if (playerToKick === gameState.currentPlayer) {
    return false;
  }

  const direction = gameState.playerDirections[gameState.currentPlayer];
  const offset = getDirectionOffset(direction);

  const kickToRow = front.row + offset.dr;
  const kickToCol = front.col + offset.dc;

  const targetCellType = getCellType(kickToRow, kickToCol);
  const targetHasBomb = findBombAt(kickToRow, kickToCol) !== -1;
  const targetHasIce = findIceBlockAt(kickToRow, kickToCol) !== -1;

  if (
    targetCellType !== "f" ||
    targetHasBomb ||
    targetHasIce ||
    targetCellType === "p1" ||
    targetCellType === "p2"
  ) {
    return false;
  }

  const playerPos = gameState.playerPositions[playerToKick];

  const oldBombIndex = findBombAt(playerPos.row, playerPos.col);
  const oldIceIndex = findIceBlockAt(playerPos.row, playerPos.col);
  if (oldBombIndex !== -1) {
    gameState.grid[playerPos.row][playerPos.col] = "bomb";
  } else if (oldIceIndex !== -1) {
    gameState.grid[playerPos.row][playerPos.col] = "ice";
  } else {
    gameState.grid[playerPos.row][playerPos.col] = "f";
  }

  gameState.grid[kickToRow][kickToCol] = playerToKick;
  gameState.playerPositions[playerToKick] = { row: kickToRow, col: kickToCol };

  useAction();

  const pos = gameState.playerPositions[gameState.currentPlayer];
  gameState.highlightOrigin[gameState.currentPlayer] = {
    row: pos.row,
    col: pos.col,
  };
  gameState.highlightActionsRemaining[gameState.currentPlayer] =
    gameState.actionsRemaining;

  gameState.moveHistory[gameState.currentPlayer] = [
    { row: pos.row, col: pos.col },
  ];

  gameState.visitedSpaces[gameState.currentPlayer].clear();
  gameState.visitedSpaces[gameState.currentPlayer].add(`${pos.row},${pos.col}`);

  renderGrid();
  return true;
}

function kickObjectInFront() {
  if (gameState.actionsRemaining <= 0 || gameState.gameOver) {
    return false;
  }

  const front = getFrontCell(gameState.currentPlayer);

  const cellType = getCellType(front.row, front.col);
  if (cellType === "p1" || cellType === "p2") {
    return kickPlayerInFront();
  }

  if (!hasKickableObjectAt(front.row, front.col)) {
    return false;
  }

  const direction = gameState.playerDirections[gameState.currentPlayer];

  // Check if the chain can be kicked
  if (!canChainBeKicked(front.row, front.col, direction)) {
    return false;
  }

  const offset = getDirectionOffset(direction);

  // Find the last object in the chain and where it will end up
  const chainEnd = findChainEnd(front.row, front.col, direction);

  // Get the object that will be moved (the last one in the chain)
  const lastObjBombIndex = findBombAt(
    chainEnd.lastObjectRow,
    chainEnd.lastObjectCol
  );
  const lastObjIceIndex = findIceBlockAt(
    chainEnd.lastObjectRow,
    chainEnd.lastObjectCol
  );

  // Check what the kicked object will collide with
  const collisionRow = chainEnd.targetRow + offset.dr;
  const collisionCol = chainEnd.targetCol + offset.dc;
  const collisionCellType = getCellType(collisionRow, collisionCol);
  const collisionHasBomb = findBombAt(collisionRow, collisionCol) !== -1;
  const collisionHasIce = findIceBlockAt(collisionRow, collisionCol) !== -1;
  const collisionPlayer = getPlayerAt(collisionRow, collisionCol);

  if (lastObjBombIndex !== -1) {
    // Moving a bomb
    const bomb = gameState.bombs[lastObjBombIndex];
    gameState.bombs[lastObjBombIndex] = {
      row: chainEnd.targetRow,
      col: chainEnd.targetCol,
      timer: bomb.timer,
    };
  } else if (lastObjIceIndex !== -1) {
    // Moving an ice block
    const ice = gameState.iceBlocks[lastObjIceIndex];

    // Move ice to target position first
    gameState.iceBlocks[lastObjIceIndex] = {
      row: chainEnd.targetRow,
      col: chainEnd.targetCol,
      health: ice.health,
    };

    // Now apply collision damage after movement
    let damageToIce = 0;

    // Check what it collided with
    if (collisionCellType === "w") {
      // Hit a wall
      damageToIce = 1;
    } else if (collisionHasBomb) {
      // Hit a bomb
      damageToIce = 1;
    } else if (collisionHasIce) {
      // Hit another ice block - both take damage
      damageToIce = 1;
      const otherIceIndex = findIceBlockAt(collisionRow, collisionCol);
      if (otherIceIndex !== -1) {
        gameState.iceBlocks[otherIceIndex].health -= 1;
        if (gameState.iceBlocks[otherIceIndex].health <= 0) {
          // Remove the other ice block if it breaks
          // But we need to be careful about index shifting
          if (otherIceIndex < lastObjIceIndex) {
            // Other ice is before our ice in array, removal will shift our index
            gameState.iceBlocks.splice(otherIceIndex, 1);
            // Update our reference since array shifted
            const newLastObjIceIndex = lastObjIceIndex - 1;
            gameState.iceBlocks[newLastObjIceIndex].health -= damageToIce;
            if (gameState.iceBlocks[newLastObjIceIndex].health <= 0) {
              gameState.iceBlocks.splice(newLastObjIceIndex, 1);
            }
            damageToIce = 0; // Already applied
          } else {
            gameState.iceBlocks.splice(otherIceIndex, 1);
          }
        }
      }
    } else if (collisionPlayer) {
      // Hit a player
      damageToIce = 1;
      gameState.playerHealth[collisionPlayer] -= ICE_BLOCK_DAMAGE;

      if (gameState.playerHealth[collisionPlayer] <= 0) {
        gameState.gameOver = true;
        gameState.winner = collisionPlayer === "p1" ? "p2" : "p1";
        const playerPos = gameState.playerPositions[collisionPlayer];
        gameState.grid[playerPos.row][playerPos.col] = "f";
      }
    }

    // Apply damage to the kicked ice (if not already handled)
    if (damageToIce > 0) {
      // Need to find the ice again in case array was modified
      const currentIceIndex = findIceBlockAt(
        chainEnd.targetRow,
        chainEnd.targetCol
      );
      if (currentIceIndex !== -1) {
        gameState.iceBlocks[currentIceIndex].health -= damageToIce;
        if (gameState.iceBlocks[currentIceIndex].health <= 0) {
          gameState.iceBlocks.splice(currentIceIndex, 1);
        }
      }
    }
  }

  useAction();

  const pos = gameState.playerPositions[gameState.currentPlayer];
  gameState.highlightOrigin[gameState.currentPlayer] = {
    row: pos.row,
    col: pos.col,
  };
  gameState.highlightActionsRemaining[gameState.currentPlayer] =
    gameState.actionsRemaining;

  gameState.moveHistory[gameState.currentPlayer] = [
    { row: pos.row, col: pos.col },
  ];

  gameState.visitedSpaces[gameState.currentPlayer].clear();
  gameState.visitedSpaces[gameState.currentPlayer].add(`${pos.row},${pos.col}`);

  renderGrid();
  return true;
}

function useAction() {
  if (gameState.gameOver) return;

  gameState.actionsRemaining--;
  updateUI();

  if (gameState.actionsRemaining <= 0 && !gameState.isProcessingTurn) {
    endTurn();
  }
}

function endTurn() {
  if (gameState.gameOver) return;

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

  gameState.currentPlayer = gameState.currentPlayer === "p1" ? "p2" : "p1";

  if (gameState.isFirstTurn) {
    gameState.isFirstTurn = false;
  }
  gameState.actionsRemaining = ACTIONS_PER_TURN;

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
  gameState.visitedSpaces[newPlayer].add(
    `${newPlayerPos.row},${newPlayerPos.col}`
  );

  updateUI();
  renderGrid();

  decreaseBombTimersAndMeltIce().then(() => {
    if (!gameState.gameOver) {
      renderGrid();
      updateUI();

      if (playerTypes[gameState.currentPlayer] === "ai") {
        setTimeout(() => processAITurn(), 1000);
      }
    }
  });
}

async function decreaseBombTimersAndMeltIce() {
  allExplosionCells = new Set();

  // Melt ice blocks (lose 1 health per turn)
  for (let i = gameState.iceBlocks.length - 1; i >= 0; i--) {
    gameState.iceBlocks[i].health--;
    if (gameState.iceBlocks[i].health <= 0) {
      gameState.iceBlocks.splice(i, 1);
    }
  }

  const bombsToExplode = [];
  for (let i = gameState.bombs.length - 1; i >= 0; i--) {
    gameState.bombs[i].timer--;

    if (gameState.bombs[i].timer <= 0) {
      bombsToExplode.push({
        row: gameState.bombs[i].row,
        col: gameState.bombs[i].col,
      });
    }
  }

  if (bombsToExplode.length > 0) {
    await animateExplosions(bombsToExplode);

    if (allExplosionCells.size > 0) {
      checkPlayerHits(allExplosionCells);
      renderGrid();
    }
  }
}

let allExplosionCells = new Set();
let explosionQueue = [];

function calculateExplosionCells(row, col) {
  const explosionCells = [];
  const processed = new Set();

  function addExplosionCells(startRow, startCol) {
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

    const directions = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 },
    ];

    for (const dir of directions) {
      let currentRow = startRow;
      let currentCol = startCol;
      let distance = 0;

      while (true) {
        currentRow += dir.dr;
        currentCol += dir.dc;
        distance++;

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

          const bomb = getBombAt(currentRow, currentCol);
          if (bomb) {
            explosionQueue.push({ row: currentRow, col: currentCol });
            break;
          }

          // Ice blocks don't stop explosions but get destroyed
          const iceIndex = findIceBlockAt(currentRow, currentCol);
          if (iceIndex !== -1) {
            gameState.iceBlocks.splice(iceIndex, 1);
          }
        }
      }
    }
  }

  addExplosionCells(row, col);
  return explosionCells;
}

async function animateExplosions(initialBombs) {
  allExplosionCells = new Set();
  explosionQueue = [...initialBombs];
  const processedBombs = new Set();
  const allExplosionSteps = [];

  while (explosionQueue.length > 0) {
    const bomb = explosionQueue.shift();
    const key = `${bomb.row},${bomb.col}`;

    if (processedBombs.has(key)) continue;
    processedBombs.add(key);

    const bombIndex = findBombAt(bomb.row, bomb.col);
    if (bombIndex !== -1) {
      gameState.bombs.splice(bombIndex, 1);
    }

    const cells = calculateExplosionCells(bomb.row, bomb.col);
    allExplosionSteps.push(...cells);
  }

  allExplosionSteps.sort((a, b) => a.distance - b.distance);

  const stepsByDistance = {};
  for (const step of allExplosionSteps) {
    if (!stepsByDistance[step.distance]) {
      stepsByDistance[step.distance] = [];
    }
    stepsByDistance[step.distance].push(step);
  }

  const maxDistance = Math.max(...Object.keys(stepsByDistance).map(Number));
  const activeExplosions = new Set();

  for (let dist = 0; dist <= maxDistance; dist++) {
    if (stepsByDistance[dist]) {
      for (const step of stepsByDistance[dist]) {
        activeExplosions.add(`${step.row},${step.col}`);
      }

      renderGridWithExplosions(activeExplosions);

      if (dist < maxDistance) {
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 300));

  for (const cellKey of allExplosionCells) {
    const [r, c] = cellKey.split(",").map(Number);
    const cellType = getCellType(r, c);

    const bombIdx = findBombAt(r, c);
    if (bombIdx !== -1) {
      gameState.bombs.splice(bombIdx, 1);
    }

    const iceIdx = findIceBlockAt(r, c);
    if (iceIdx !== -1) {
      gameState.iceBlocks.splice(iceIdx, 1);
    }

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

  const shouldShowHighlighting =
    !gameState.gameOver &&
    !gameState.isProcessingTurn &&
    playerTypes[gameState.currentPlayer] === "human";

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
      const hasIce = findIceBlockAt(row, col) !== -1;
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

      if (isExploding) {
        cell.classList.add("explosion");
        renderCellContent(cell, row, col, cellType, hasBomb, hasIce);
      } else if (cellType === "w") {
        cell.classList.add("wall");
      } else {
        cell.classList.add("floor");
        renderCellContent(cell, row, col, cellType, hasBomb, hasIce);
      }

      cell.dataset.row = row;
      cell.dataset.col = col;
      cell.dataset.type = cellType;
      if (hasBomb) {
        cell.dataset.hasBomb = "true";
      }
      if (hasIce) {
        cell.dataset.hasIce = "true";
      }

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

function renderCellContent(cell, row, col, cellType, hasBomb, hasIce) {
  if (cellType === "p1") {
    cell.classList.add("player1");
    const direction = gameState.playerDirections.p1;
    if (gameState.currentPlayer === "p1" && !gameState.gameOver) {
      const label = document.createElement("div");
      label.className = "player-label";
      label.textContent = "P1";
      const health = document.createElement("div");
      health.className = "health-display";
      health.textContent = `❤️${gameState.playerHealth.p1}`;
      const count = document.createElement("div");
      count.className = "actions-count";
      count.textContent = gameState.actionsRemaining;
      const dirIndicator = document.createElement("div");
      dirIndicator.className = "direction-indicator";
      dirIndicator.textContent = getDirectionArrow(direction);
      cell.appendChild(label);
      cell.appendChild(health);
      cell.appendChild(count);
      cell.appendChild(dirIndicator);
      cell.classList.add("current-player");
    } else {
      const label = document.createElement("div");
      label.className = "player-label";
      label.textContent = "P1";
      const health = document.createElement("div");
      health.className = "health-display";
      health.textContent = `❤️${gameState.playerHealth.p1}`;
      const dirIndicator = document.createElement("div");
      dirIndicator.className = "direction-indicator";
      dirIndicator.textContent = getDirectionArrow(direction);
      cell.appendChild(label);
      cell.appendChild(health);
      cell.appendChild(dirIndicator);
    }
    if (hasBomb) {
      const bomb = getBombAt(row, col);
      cell.classList.add("bomb");
      if (bomb) {
        cell.classList.add(`timer-${bomb.timer}`);
      }
    }
    if (hasIce) {
      cell.classList.add("ice-block");
    }
  } else if (cellType === "p2") {
    cell.classList.add("player2");
    const direction = gameState.playerDirections.p2;
    if (gameState.currentPlayer === "p2" && !gameState.gameOver) {
      const label = document.createElement("div");
      label.className = "player-label";
      label.textContent = "P2";
      const health = document.createElement("div");
      health.className = "health-display";
      health.textContent = `❤️${gameState.playerHealth.p2}`;
      const count = document.createElement("div");
      count.className = "actions-count";
      count.textContent = gameState.actionsRemaining;
      const dirIndicator = document.createElement("div");
      dirIndicator.className = "direction-indicator";
      dirIndicator.textContent = getDirectionArrow(direction);
      cell.appendChild(label);
      cell.appendChild(health);
      cell.appendChild(count);
      cell.appendChild(dirIndicator);
      cell.classList.add("current-player");
    } else {
      const label = document.createElement("div");
      label.className = "player-label";
      label.textContent = "P2";
      const health = document.createElement("div");
      health.className = "health-display";
      health.textContent = `❤️${gameState.playerHealth.p2}`;
      const dirIndicator = document.createElement("div");
      dirIndicator.className = "direction-indicator";
      dirIndicator.textContent = getDirectionArrow(direction);
      cell.appendChild(label);
      cell.appendChild(health);
      cell.appendChild(dirIndicator);
    }
    if (hasBomb) {
      const bomb = getBombAt(row, col);
      cell.classList.add("bomb");
      if (bomb) {
        cell.classList.add(`timer-${bomb.timer}`);
      }
    }
    if (hasIce) {
      cell.classList.add("ice-block");
    }
  } else if (hasBomb) {
    const bomb = getBombAt(row, col);
    cell.classList.add("bomb");
    if (bomb) {
      cell.textContent = `💣${bomb.timer}`;
      cell.classList.add(`timer-${bomb.timer}`);
    }
  } else if (hasIce) {
    const ice = getIceBlockAt(row, col);
    cell.classList.add("ice-block");
    if (ice) {
      cell.textContent = `🧊${ice.health}`;
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
      gameState.grid[r][c] = "f";
    } else if (cellType === "p2") {
      p2Hit = true;
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
    const charTypeStr =
      characterTypes[gameState.currentPlayer] === "bomber" ? " 💣" : " 🧊";
    currentPlayerEl.innerHTML = `Current Player: <span class="${gameState.currentPlayer}">${playerNum}${charTypeStr}${playerTypeStr}</span>`;
    actionsEl.textContent = `Actions Remaining: ${
      gameState.actionsRemaining
    } | Health: ❤️${gameState.playerHealth[gameState.currentPlayer]}`;
  }
}

function renderGrid() {
  const gridContainer = document.getElementById("grid");
  gridContainer.innerHTML = "";

  const shouldShowHighlighting =
    !gameState.gameOver &&
    !gameState.isProcessingTurn &&
    playerTypes[gameState.currentPlayer] === "human";

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
      const hasIce = findIceBlockAt(row, col) !== -1;
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

      if (cellType === "w") {
        cell.classList.add("wall");
      } else {
        cell.classList.add("floor");
        renderCellContent(cell, row, col, cellType, hasBomb, hasIce);
      }

      cell.dataset.row = row;
      cell.dataset.col = col;
      cell.dataset.type = cellType;
      if (hasBomb) {
        cell.dataset.hasBomb = "true";
      }
      if (hasIce) {
        cell.dataset.hasIce = "true";
      }

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

  if (playerTypes[gameState.currentPlayer] !== "human") {
    return;
  }

  const player = gameState.currentPlayer;
  const pos = gameState.playerPositions[player];
  const clickedKey = `${row},${col}`;

  const history = gameState.moveHistory[player];
  const canUndo = history.length > 1;
  if (canUndo) {
    const prevPos = history[history.length - 2];
    if (row === prevPos.row && col === prevPos.col) {
      movePlayerTo(player, row, col);
      return;
    }
  }

  const reachableFromCurrent = getReachableWithinMoves(
    player,
    gameState.actionsRemaining,
    { row: pos.row, col: pos.col }
  );

  const validMoves = getValidMoves(player);

  if (
    reachableFromCurrent.has(clickedKey) &&
    validMoves.has(clickedKey) &&
    (row !== pos.row || col !== pos.col)
  ) {
    movePlayerTo(player, row, col);
    return;
  }

  const front = getFrontCell(player);
  if (row === front.row && col === front.col) {
    const frontCellType = getCellType(row, col);
    if (frontCellType === "p1" || frontCellType === "p2") {
      kickObjectInFront();
    } else if (hasKickableObjectAt(row, col)) {
      kickObjectInFront();
    } else if (frontCellType === "f") {
      placeObjectInFront();
    }
  }
}

document.addEventListener("keydown", (e) => {
  if (gameState.gameOver || gameState.isProcessingTurn) {
    return;
  }

  if (playerTypes[gameState.currentPlayer] !== "human") {
    return;
  }

  const player = gameState.currentPlayer;
  const currentDirection = gameState.playerDirections[player];

  switch (e.key) {
    case "ArrowUp":
      e.preventDefault();
      if (currentDirection === "up") {
        movePlayer(player);
      } else {
        changeDirection(player, "up");
      }
      break;
    case "ArrowDown":
      e.preventDefault();
      if (currentDirection === "down") {
        movePlayer(player);
      } else {
        changeDirection(player, "down");
      }
      break;
    case "ArrowLeft":
      e.preventDefault();
      if (currentDirection === "left") {
        movePlayer(player);
      } else {
        changeDirection(player, "left");
      }
      break;
    case "ArrowRight":
      e.preventDefault();
      if (currentDirection === "right") {
        movePlayer(player);
      } else {
        changeDirection(player, "right");
      }
      break;
    case " ":
      e.preventDefault();
      if (!kickObjectInFront()) {
        placeObjectInFront();
      }
      break;
    case "Enter":
      e.preventDefault();
      endTurn();
      break;
  }
});

document.addEventListener("DOMContentLoaded", () => {
  initializePlayerSelection();
});
