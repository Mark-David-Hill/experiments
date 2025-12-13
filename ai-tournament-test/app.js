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

let aiProcessingCancelled = false;

// Configuration for exploration mode
const EXPLORATION_CONFIG = {
  DB_NAME: "BombGameExploration",
  DB_VERSION: 1,
  STORE_NAME: "gameStates",
  MAX_DEPTH: 20, // Maximum number of turns to simulate
  BATCH_SIZE: 100, // Process in batches for UI responsiveness
  MAX_SEQUENCE_DEPTH: 5,
};

class ExpertAI {
  constructor() {
    this.db = new GameStateDatabase();
    this.stateCache = new Map();
    this.transitionCache = new Map();
    this.initialized = false;
    this.currentGameTurnCount = 0; // Track turns PER GAME, not globally
  }

  // Add method to reset per-game state
  startNewGame() {
    this.currentGameTurnCount = 0;
    this.transitionCache.clear();
  }

  async init() {
    if (!this.initialized) {
      await this.db.init();
      this.initialized = true;
    }
  }

  clearTurnCache() {
    this.transitionCache.clear();
    // Keep stateCache as it's read-only from database
  }

  serializeState(state) {
    const bombs = state.bombs
      .map((b) => `b${b.row},${b.col}:${b.timer}`)
      .sort();

    const p1 = `p1:${state.playerPositions.p1.row},${state.playerPositions.p1.col}`;
    const p2 = `p2:${state.playerPositions.p2.row},${state.playerPositions.p2.col}`;
    const turn = `turn:${state.currentPlayer}`;

    return [turn, p1, p2, ...bombs].join("|");
  }

  serializeEndOfTurnState(state, player) {
    const opponent = player === "p1" ? "p2" : "p1";

    const adjustedBombs = state.bombs
      .filter((b) => b.timer > 1)
      .map((b) => ({ ...b, timer: b.timer - 1 }));

    const bombs = adjustedBombs
      .map((b) => `b${b.row},${b.col}:${b.timer}`)
      .sort();

    const p1 = `p1:${state.playerPositions.p1.row},${state.playerPositions.p1.col}`;
    const p2 = `p2:${state.playerPositions.p2.row},${state.playerPositions.p2.col}`;
    const turn = `turn:${opponent}`;

    return [turn, p1, p2, ...bombs].join("|");
  }

  async getStateData(stateKey) {
    if (this.stateCache.has(stateKey)) {
      return this.stateCache.get(stateKey);
    }

    const data = await this.db.getState(stateKey);

    if (data) {
      this.stateCache.set(stateKey, data);
    }

    return data;
  }

  convertToSimulatorState(gs) {
    return {
      currentPlayer: gs.currentPlayer,
      actionsRemaining: gs.actionsRemaining,
      playerPositions: {
        p1: { ...gs.playerPositions.p1 },
        p2: { ...gs.playerPositions.p2 },
      },
      playerDirections: {
        p1: gs.playerDirections.p1,
        p2: gs.playerDirections.p2,
      },
      bombs: gs.bombs.map((b) => ({ ...b })),
      grid: gs.grid.map((row) => [...row]),
      gameOver: gs.gameOver,
      winner: gs.winner,
      isFirstTurn: gs.isFirstTurn,
    };
  }

  // ==================== TRANSITION & LOOKAHEAD EVALUATION ====================

  async evaluateTransitions(stateData, player, depth = 2) {
    if (
      !stateData ||
      !stateData.transitions ||
      stateData.transitions.length === 0
    ) {
      return null;
    }

    const cacheKey = `${stateData.id}:${player}:${depth}`;
    if (this.transitionCache.has(cacheKey)) {
      return this.transitionCache.get(cacheKey);
    }

    let weightedScore = 0;
    let totalWeight = 0;
    const transitionScores = [];
    const opponent = player === "p1" ? "p2" : "p1";

    for (const transition of stateData.transitions) {
      const nextStateData = await this.getStateData(transition.nextState);
      if (!nextStateData || nextStateData.totalGames < 2) continue;

      const wins = nextStateData.wins[player] || 0;
      const losses = nextStateData.wins[opponent] || 0;
      const ties = nextStateData.wins.tie || 0;
      const total = nextStateData.totalGames;

      // FIX: Value ties much higher - they're better than losses!
      // Use 0.5 for ties vs 1.0 for wins (previously 0.3)
      const score = (wins * 1.0 + ties * 0.5) / total;
      const winRate = wins / total;
      const lossRate = losses / total;

      const weight = Math.sqrt(total);

      transitionScores.push({
        nextState: transition.nextState,
        score,
        winRate,
        lossRate,
        tieRate: ties / total,
        totalGames: total,
        weight,
      });

      let futureScore = score;
      if (
        depth > 1 &&
        nextStateData.transitions &&
        nextStateData.transitions.length > 0
      ) {
        const futureEval = await this.evaluateTransitions(
          nextStateData,
          player,
          depth - 1
        );
        if (futureEval && futureEval.confidence > 0.3) {
          futureScore = score * 0.6 + futureEval.score * 0.4;
        }
      }

      weightedScore += futureScore * weight;
      totalWeight += weight;
    }

    if (totalWeight === 0) {
      this.transitionCache.set(cacheKey, null);
      return null;
    }

    const result = {
      score: weightedScore / totalWeight,
      winRate:
        transitionScores.reduce((sum, t) => sum + t.winRate * t.weight, 0) /
        totalWeight,
      confidence: Math.min(1, totalWeight / 20),
      evaluatedCount: transitionScores.length,
      bestTransition: transitionScores.sort((a, b) => b.score - a.score)[0],
      worstTransition: transitionScores.sort((a, b) => a.score - b.score)[0],
    };

    this.transitionCache.set(cacheKey, result);
    return result;
  }

  async evaluateTurnOutcome(state, actions, player) {
    const simulator = new ExplorationSimulator();
    let currentState = { ...state };
    let actionsUsed = 0;

    for (const action of actions) {
      if (currentState.gameOver) break;
      if (action.type === "endTurn") break;

      currentState = simulator.applyAction(currentState, player, action);

      if (action.type !== "changeDirection") {
        actionsUsed++;
      }
    }

    const endOfTurnKey = this.serializeEndOfTurnState(currentState, player);
    const currentStateKey = this.serializeState(currentState);

    const endOfTurnData = await this.getStateData(endOfTurnKey);
    const currentData = await this.getStateData(currentStateKey);

    let transitionEval = null;
    if (endOfTurnData && endOfTurnData.transitions) {
      transitionEval = await this.evaluateTransitions(endOfTurnData, player, 2);
    }

    return {
      resultState: currentState,
      currentStateKey,
      endOfTurnKey,
      endOfTurnData,
      currentData,
      transitionEval,
      actionsUsed,
    };
  }

  // ==================== THREAT & SAFETY ANALYSIS ====================

  isPositionThreatened(state, row, col, maxTimer = 4) {
    const simulator = new ExplorationSimulator();

    for (const bomb of state.bombs) {
      if (bomb.timer > maxTimer) continue;

      const explosionCells = simulator.getExplosionCells(
        state,
        bomb.row,
        bomb.col
      );
      for (const cell of explosionCells) {
        if (cell.row === row && cell.col === col) {
          return { threatened: true, timer: bomb.timer };
        }
      }
    }

    return { threatened: false, timer: Infinity };
  }

  countEscapeRoutes(state, row, col) {
    let routes = 0;
    const directions = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 },
    ];

    for (const dir of directions) {
      const newRow = row + dir.dr;
      const newCol = col + dir.dc;

      if (this.isValidMovePosition(state, newRow, newCol)) {
        routes++;
      }
    }

    return routes;
  }

  isValidMovePosition(state, row, col) {
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
      return false;
    }
    const cellType = state.grid[row][col];
    const hasBomb = state.bombs.some((b) => b.row === row && b.col === col);
    return cellType === "f" && !hasBomb;
  }

  getReachablePositions(state, startRow, startCol, maxMoves) {
    const reachable = new Set();
    const visited = new Set();
    const queue = [{ row: startRow, col: startCol, moves: 0 }];

    while (queue.length > 0) {
      const current = queue.shift();
      const key = `${current.row},${current.col}`;

      if (visited.has(key)) continue;
      visited.add(key);

      if (current.moves <= maxMoves) {
        reachable.add(key);
      }

      if (current.moves >= maxMoves) continue;

      const directions = [
        { dr: -1, dc: 0 },
        { dr: 1, dc: 0 },
        { dr: 0, dc: -1 },
        { dr: 0, dc: 1 },
      ];

      for (const dir of directions) {
        const newRow = current.row + dir.dr;
        const newCol = current.col + dir.dc;

        if (this.isValidMovePosition(state, newRow, newCol)) {
          queue.push({ row: newRow, col: newCol, moves: current.moves + 1 });
        }
      }
    }

    return reachable;
  }

  findSafePositions(state, player, maxMoves) {
    const pos = state.playerPositions[player];
    const reachable = this.getReachablePositions(
      state,
      pos.row,
      pos.col,
      maxMoves
    );
    const safePositions = [];

    for (const posKey of reachable) {
      const [r, c] = posKey.split(",").map(Number);
      const threat = this.isPositionThreatened(state, r, c, 2);

      if (!threat.threatened) {
        safePositions.push({ row: r, col: c });
      }
    }

    return safePositions;
  }

  getFrontCell(state, player) {
    const pos = state.playerPositions[player];
    const direction = state.playerDirections[player];
    const offset = this.getDirectionOffset(direction);
    return { row: pos.row + offset.dr, col: pos.col + offset.dc };
  }

  getDirectionOffset(direction) {
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

  simulateBombKick(state, bombRow, bombCol, direction) {
    const offset = this.getDirectionOffset(direction);
    let currentRow = bombRow;
    let currentCol = bombCol;

    while (true) {
      const nextRow = currentRow + offset.dr;
      const nextCol = currentCol + offset.dc;

      const nextCellType = state.grid[nextRow]?.[nextCol];
      const nextHasBomb = state.bombs.some(
        (b) => b.row === nextRow && b.col === nextCol
      );

      if (
        nextCellType === "w" ||
        nextCellType === "p1" ||
        nextCellType === "p2" ||
        nextHasBomb ||
        nextCellType === undefined
      ) {
        break;
      }

      currentRow = nextRow;
      currentCol = nextCol;
    }

    return { row: currentRow, col: currentCol };
  }

  // ==================== AGGRESSIVE HEURISTIC EVALUATION ====================

  heuristicEvaluation(state, player, aggressionBonus = 0) {
    let score = 0;
    const opponent = player === "p1" ? "p2" : "p1";
    const playerPos = state.playerPositions[player];
    const opponentPos = state.playerPositions[opponent];
    const simulator = new ExplorationSimulator();

    // 1. SURVIVAL - Highest priority
    const playerThreat = this.isPositionThreatened(
      state,
      playerPos.row,
      playerPos.col,
      3
    );
    const opponentThreat = this.isPositionThreatened(
      state,
      opponentPos.row,
      opponentPos.col,
      3
    );

    if (playerThreat.threatened) {
      score -= 800 / playerThreat.timer;

      const safePositions = this.findSafePositions(state, player, 5);
      if (safePositions.length === 0) {
        score -= 3000;
      } else if (safePositions.length <= 2) {
        score -= 400;
      }
    }

    // 2. OFFENSIVE EVALUATION - Enhanced with aggression scaling
    if (opponentThreat.threatened) {
      // Base score for opponent being threatened
      const threatScore = 600 / opponentThreat.timer;
      score += threatScore * (1 + aggressionBonus * 0.5);

      const opponentSafePositions = this.findSafePositions(state, opponent, 5);
      if (opponentSafePositions.length === 0) {
        // CHECKMATE - massive bonus
        score += 2500 * (1 + aggressionBonus);
      } else if (opponentSafePositions.length === 1) {
        // Near checkmate - very high bonus
        score += 1200 * (1 + aggressionBonus * 0.5);
      } else if (opponentSafePositions.length <= 2) {
        score += 600 * (1 + aggressionBonus * 0.3);
      }
    }

    // 3. MOBILITY
    const playerMobility = this.countEscapeRoutes(
      state,
      playerPos.row,
      playerPos.col
    );
    const opponentMobility = this.countEscapeRoutes(
      state,
      opponentPos.row,
      opponentPos.col
    );

    score += playerMobility * 25;
    score -= opponentMobility * 15;

    if (playerMobility <= 1) {
      score -= 120;
    }

    // Bonus for cornering opponent
    if (opponentMobility <= 1) {
      score += 150 * (1 + aggressionBonus * 0.3);
    } else if (opponentMobility <= 2) {
      score += 60 * (1 + aggressionBonus * 0.2);
    }

    // 4. CONTROL - Area control is important
    const playerReachable = this.getReachablePositions(
      state,
      playerPos.row,
      playerPos.col,
      3
    );
    const opponentReachable = this.getReachablePositions(
      state,
      opponentPos.row,
      opponentPos.col,
      3
    );

    score += playerReachable.size * 5;
    score -= opponentReachable.size * 4;

    // Bonus for having more control than opponent
    if (playerReachable.size > opponentReachable.size) {
      score += (playerReachable.size - opponentReachable.size) * 8;
    }

    // 5. DISTANCE & POSITIONING
    const distance =
      Math.abs(playerPos.row - opponentPos.row) +
      Math.abs(playerPos.col - opponentPos.col);

    if (state.bombs.length === 0) {
      // No bombs - getting closer is good, especially with aggression
      if (distance > 3) {
        score -= (distance - 3) * (15 + aggressionBonus * 10);
      }
      // Reward being at striking distance
      if (distance === 2 || distance === 3) {
        score += 40 * (1 + aggressionBonus * 0.3);
      }
    } else {
      // Bombs exist
      if (distance === 1) {
        score -= 60;
      } else if (distance >= 2 && distance <= 4) {
        score += 20;
      }
    }

    // 6. BOMB PRESSURE - Can we threaten from here?
    const front = this.getFrontCell(state, player);
    if (this.isValidMovePosition(state, front.row, front.col)) {
      const testState = {
        ...state,
        bombs: [...state.bombs, { row: front.row, col: front.col, timer: 4 }],
      };

      const explosionCells = simulator.getExplosionCells(
        testState,
        front.row,
        front.col
      );
      const wouldThreatenOpponent = explosionCells.some(
        (cell) => cell.row === opponentPos.row && cell.col === opponentPos.col
      );

      if (wouldThreatenOpponent) {
        score += 100 * (1 + aggressionBonus * 0.3);
      }
    }

    // 7. ACTIVE BOMB BONUS - Having bombs on the field is generally good (applies pressure)
    if (state.bombs.length > 0 && !playerThreat.threatened) {
      score += state.bombs.length * 30;
    }

    return score;
  }

  // ==================== SEQUENCE GENERATION & EVALUATION ====================

  generateActionSequences(state, player, maxDepth, actionsRemaining) {
    const sequences = [];
    const simulator = new ExplorationSimulator();

    const generate = (
      currentState,
      currentSequence,
      remainingActions,
      depth
    ) => {
      if (currentSequence.length > 0) {
        sequences.push([...currentSequence]);
      }

      if (depth <= 0 || remainingActions <= 0 || currentState.gameOver) {
        return;
      }

      const actions = simulator
        .getAllPossibleActions(currentState, player)
        .filter((a) => a.type !== "endTurn");

      const dirChanges = currentSequence.filter(
        (a) => a.type === "changeDirection"
      ).length;

      for (const action of actions) {
        if (action.type === "changeDirection" && dirChanges >= 1) {
          continue;
        }

        const newState = simulator.applyAction(currentState, player, action);
        const actionCost = action.type === "changeDirection" ? 0 : 1;
        const newRemaining = remainingActions - actionCost;

        // Pruning - but less aggressive to allow risky-but-winning plays
        if (action.type !== "changeDirection") {
          const playerPos = newState.playerPositions[player];
          const threat = this.isPositionThreatened(
            newState,
            playerPos.row,
            playerPos.col,
            1
          );
          if (threat.threatened && newRemaining < threat.timer) {
            const safePositions = this.findSafePositions(
              newState,
              player,
              newRemaining
            );
            if (safePositions.length === 0) {
              continue;
            }
          }
        }

        generate(
          { ...newState, actionsRemaining: newRemaining },
          [...currentSequence, action],
          newRemaining,
          depth - 1
        );
      }
    };

    generate(state, [], actionsRemaining, maxDepth);

    if (!sequences.some((s) => s.length === 0)) {
      sequences.push([]);
    }

    return sequences;
  }

  async evaluateSequence(state, sequence, player, aggressionLevel = 0) {
    const outcome = await this.evaluateTurnOutcome(state, sequence, player);
    const resultState = outcome.resultState;
    const playerPos = resultState.playerPositions[player];
    const opponent = player === "p1" ? "p2" : "p1";
    const opponentPos = resultState.playerPositions[opponent];
    const simulator = new ExplorationSimulator();

    let score = 0;
    let confidence = 0;
    let components = {};

    // 1. SAFETY CHECK (unchanged)
    const threat = this.isPositionThreatened(
      resultState,
      playerPos.row,
      playerPos.col,
      2
    );
    if (threat.threatened) {
      const actionsAfter = Math.max(
        0,
        (state.actionsRemaining || 5) - outcome.actionsUsed
      );
      const safePositions = this.findSafePositions(
        resultState,
        player,
        actionsAfter
      );

      if (safePositions.length === 0 && threat.timer <= actionsAfter + 1) {
        return { score: -10000, confidence: 1, components: { death: true } };
      }

      score -= 800 / threat.timer;
      components.threatPenalty = -800 / threat.timer;
    }

    // 2. CHECKMATE DETECTION (unchanged - already good)
    const opponentThreat = this.isPositionThreatened(
      resultState,
      opponentPos.row,
      opponentPos.col,
      2
    );
    if (opponentThreat.threatened) {
      const opponentSafePositions = this.findSafePositions(
        resultState,
        opponent,
        5
      );

      if (opponentSafePositions.length === 0) {
        score += 3000 + 1000 / opponentThreat.timer;
        components.checkmate = true;
        components.checkmateTimer = opponentThreat.timer;
      } else if (opponentSafePositions.length === 1) {
        score += 800 + 200 / opponentThreat.timer;
        components.nearCheckmate = true;
      } else if (opponentSafePositions.length <= 2) {
        score += 400;
        components.limitedEscape = true;
      }
    }

    // 3. DATABASE WIN RATE - FIX TIE VALUATION
    if (outcome.endOfTurnData && outcome.endOfTurnData.totalGames >= 5) {
      const wins = outcome.endOfTurnData.wins[player] || 0;
      const losses = outcome.endOfTurnData.wins[opponent] || 0;
      const ties = outcome.endOfTurnData.wins.tie || 0;
      const total = outcome.endOfTurnData.totalGames;

      // FIX: Ties should be worth 0.5, not 0.2
      // A tie is infinitely better than a loss!
      const dbScore = (wins * 1.0 + ties * 0.5) / total;

      // FIX: Increase confidence weight for database data
      const dataConfidence = Math.min(0.85, total / 50); // Was 0.7 and total/100

      // Center around 0.5 (equal wins/ties/losses)
      const normalizedDbScore = (dbScore - 0.5) * 1200; // Increased from 1000
      score += normalizedDbScore * dataConfidence;
      confidence += dataConfidence * 0.5; // Increased from 0.4

      components.databaseScore = normalizedDbScore * dataConfidence;
      components.databaseWinRate = wins / total;
      components.databaseTieRate = ties / total;
      components.databaseGames = total;
    }

    // 4. TRANSITION EVALUATION - FIX TIE VALUATION
    if (outcome.transitionEval && outcome.transitionEval.confidence > 0.2) {
      const transScore = outcome.transitionEval.score;
      const transConfidence = outcome.transitionEval.confidence;

      // Center around 0.5 (matching the new tie weight)
      const normalizedTransScore = (transScore - 0.5) * 1000;
      score += normalizedTransScore * transConfidence;
      confidence += transConfidence * 0.35; // Increased from 0.3

      components.transitionScore = normalizedTransScore * transConfidence;

      if (outcome.transitionEval.bestTransition) {
        const best = outcome.transitionEval.bestTransition;
        // FIX: Lower threshold since we're valuing ties more
        if (best.winRate > 0.5 && best.totalGames >= 5) {
          score += 150;
          components.strongWinningLine = true;
        }
      }
    }

    // 5. HEURISTIC EVALUATION - Reduce weight when we have good data
    const heuristicScore = this.heuristicEvaluation(
      resultState,
      player,
      aggressionLevel
    );
    const heuristicWeight = Math.max(0.2, 1 - confidence); // Minimum 0.2 (was 0.3)
    score += heuristicScore * heuristicWeight * 0.5; // Reduced from 0.6
    confidence += heuristicWeight * 0.15; // Reduced from 0.3

    components.heuristicScore = heuristicScore * heuristicWeight * 0.5;

    // Rest of the function remains the same...
    // (sequence-specific evaluation, aggression bonuses, etc.)

    return { score, confidence, components, outcome };
  }

  // ==================== MAIN DECISION FUNCTION ====================

  async getBestAction(state, player, actionsRemaining) {
    const simState = this.convertToSimulatorState(state);

    // FIX: Track turn count properly
    this.currentGameTurnCount++;

    // Calculate aggression - but more conservatively
    let aggressionLevel = 0;

    // Only increase aggression after many turns
    if (this.currentGameTurnCount > 15) {
      aggressionLevel += (this.currentGameTurnCount - 15) * 0.03; // Reduced from 0.05
    }

    const opponent = player === "p1" ? "p2" : "p1";
    const playerMobility = this.countEscapeRoutes(
      simState,
      simState.playerPositions[player].row,
      simState.playerPositions[player].col
    );
    const opponentMobility = this.countEscapeRoutes(
      simState,
      simState.playerPositions[opponent].row,
      simState.playerPositions[opponent].col
    );

    if (playerMobility > opponentMobility + 1) {
      // Require bigger advantage
      aggressionLevel += 0.15; // Reduced from 0.2
    }

    aggressionLevel = Math.min(aggressionLevel, 1.0); // Cap lower (was 1.5)

    // FIX: Properly handle first turn with 3 actions
    const searchDepth = Math.min(actionsRemaining + 1, 4);
    const sequences = this.generateActionSequences(
      simState,
      player,
      searchDepth,
      actionsRemaining // Pass actual remaining actions
    );

    if (sequences.length === 0) {
      return { action: { type: "endTurn" }, score: 0, sequence: [] };
    }

    let bestSequence = [];
    let bestScore = -Infinity;
    let bestEval = null;

    for (const sequence of sequences) {
      const evaluation = await this.evaluateSequence(
        simState,
        sequence,
        player,
        aggressionLevel
      );

      if (evaluation.score > bestScore) {
        bestScore = evaluation.score;
        bestSequence = sequence;
        bestEval = evaluation;
      }
    }

    // FIX: Better fallback logic
    if (bestScore < -500 || bestSequence.length === 0) {
      // Desperately look for ANY safe action
      const simulator = new ExplorationSimulator();
      const allActions = simulator
        .getAllPossibleActions(simState, player)
        .filter((a) => a.type !== "endTurn");

      for (const action of allActions) {
        const testState = simulator.applyAction(simState, player, action);
        const pos = testState.playerPositions[player];
        const threat = this.isPositionThreatened(
          testState,
          pos.row,
          pos.col,
          2
        );

        if (!threat.threatened || action.type === "changeDirection") {
          console.log(`Expert AI: Using safety fallback - ${action.type}`);
          return {
            action: action,
            score: -100,
            sequence: [action],
            fallback: true,
          };
        }
      }
    }

    console.log(`Expert AI evaluation:`, {
      bestScore: bestScore.toFixed(1),
      sequenceLength: bestSequence.length,
      firstAction: bestSequence[0]?.type || "endTurn",
      aggression: aggressionLevel.toFixed(2),
      turnCount: this.currentGameTurnCount,
      components: bestEval?.components,
    });

    if (bestSequence.length === 0) {
      return {
        action: { type: "endTurn" },
        score: bestScore,
        sequence: bestSequence,
      };
    }

    return {
      action: bestSequence[0],
      score: bestScore,
      sequence: bestSequence,
      evaluation: bestEval,
    };
  }

  resetGameState() {
    this.currentGameTurnCount = 0;
    this.transitionCache.clear();
  }

  // Reset turn counter (call at start of new game)
  resetTurnCount() {
    this.turnCount = 0;
  }
}

// IndexedDB wrapper for game state storage
class GameStateDatabase {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(
        EXPLORATION_CONFIG.DB_NAME,
        EXPLORATION_CONFIG.DB_VERSION
      );

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(EXPLORATION_CONFIG.STORE_NAME)) {
          const store = db.createObjectStore(EXPLORATION_CONFIG.STORE_NAME, {
            keyPath: "id",
          });
          store.createIndex("turnNumber", "turnNumber", { unique: false });
          store.createIndex("occurrences", "occurrences", { unique: false });
        }
      };
    });
  }

  async saveState(stateKey, stateData) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(
        [EXPLORATION_CONFIG.STORE_NAME],
        "readwrite"
      );
      const store = transaction.objectStore(EXPLORATION_CONFIG.STORE_NAME);

      // First try to get existing state
      const getRequest = store.get(stateKey);

      getRequest.onsuccess = () => {
        const existing = getRequest.result;

        if (existing) {
          // Merge with existing data
          existing.occurrences += stateData.occurrences || 1;
          existing.wins.p1 += stateData.wins?.p1 || 0;
          existing.wins.p2 += stateData.wins?.p2 || 0;
          existing.wins.tie += stateData.wins?.tie || 0;
          existing.totalGames += stateData.totalGames || 0;

          if (stateData.averageGameLength) {
            existing.averageGameLength =
              (existing.averageGameLength * (existing.totalGames - 1) +
                stateData.averageGameLength) /
              existing.totalGames;
          }

          // Merge transitions
          if (stateData.transitions) {
            existing.transitions = existing.transitions || [];
            for (const trans of stateData.transitions) {
              if (
                !existing.transitions.some(
                  (t) =>
                    t.nextState === trans.nextState &&
                    JSON.stringify(t.action) === JSON.stringify(trans.action)
                )
              ) {
                existing.transitions.push(trans);
              }
            }
          }

          const putRequest = store.put(existing);
          putRequest.onsuccess = () => resolve(existing);
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          // Create new entry
          const newData = {
            id: stateKey,
            ...stateData,
            wins: stateData.wins || { p1: 0, p2: 0, tie: 0 },
            transitions: stateData.transitions || [],
            totalGames: stateData.totalGames || 0,
            averageGameLength: stateData.averageGameLength || 0,
          };

          const putRequest = store.put(newData);
          putRequest.onsuccess = () => resolve(newData);
          putRequest.onerror = () => reject(putRequest.error);
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async getState(stateKey) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(
        [EXPLORATION_CONFIG.STORE_NAME],
        "readonly"
      );
      const store = transaction.objectStore(EXPLORATION_CONFIG.STORE_NAME);
      const request = store.get(stateKey);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllStates() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(
        [EXPLORATION_CONFIG.STORE_NAME],
        "readonly"
      );
      const store = transaction.objectStore(EXPLORATION_CONFIG.STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getStateCount() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(
        [EXPLORATION_CONFIG.STORE_NAME],
        "readonly"
      );
      const store = transaction.objectStore(EXPLORATION_CONFIG.STORE_NAME);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clearAllData() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(
        [EXPLORATION_CONFIG.STORE_NAME],
        "readwrite"
      );
      const store = transaction.objectStore(EXPLORATION_CONFIG.STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async exportToJSON() {
    const states = await this.getAllStates();
    const metadata = {
      totalStates: states.length,
      exportedAt: new Date().toISOString(),
      version: EXPLORATION_CONFIG.DB_VERSION,
    };

    return {
      metadata,
      states,
    };
  }

  async importFromJSON(jsonData) {
    if (!jsonData.states || !Array.isArray(jsonData.states)) {
      throw new Error("Invalid JSON format");
    }

    let imported = 0;
    let merged = 0;

    for (const state of jsonData.states) {
      const existing = await this.getState(state.id);

      if (existing) {
        // Merge data
        await this.saveState(state.id, {
          ...state,
          occurrences: existing.occurrences + (state.occurrences || 1),
          wins: {
            p1: (existing.wins?.p1 || 0) + (state.wins?.p1 || 0),
            p2: (existing.wins?.p2 || 0) + (state.wins?.p2 || 0),
            tie: (existing.wins?.tie || 0) + (state.wins?.tie || 0),
          },
          totalGames: (existing.totalGames || 0) + (state.totalGames || 0),
        });
        merged++;
      } else {
        await this.saveState(state.id, state);
        imported++;
      }
    }

    return { imported, merged, total: jsonData.states.length };
  }
}

// Data structure to store game state information
// Data structure to store game state information
class GameStateData {
  constructor() {
    this.db = new GameStateDatabase();
    this.currentBatch = new Map(); // Store states in memory until batch save
  }

  async init() {
    await this.db.init();
  }

  serializeState(state) {
    // Create a normalized representation of the game state
    const grid = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const cell = state.grid[row][col];
        if (cell !== "w" && cell !== "f") {
          grid.push(`${row},${col}:${cell}`);
        }
      }
    }

    // Include bomb positions and timers
    const bombs = state.bombs
      .map((b) => `b${b.row},${b.col}:${b.timer}`)
      .sort();

    // Include player positions and directions
    const p1 = `p1:${state.playerPositions.p1.row},${state.playerPositions.p1.col}`;
    const p2 = `p2:${state.playerPositions.p2.row},${state.playerPositions.p2.col}`;
    const turn = `turn:${state.currentPlayer}`;

    return [turn, p1, p2, ...bombs].join("|");
  }

  async addState(state, turnNumber, actions) {
    const key = this.serializeState(state);

    if (!this.currentBatch.has(key)) {
      this.currentBatch.set(key, {
        turnNumber,
        occurrences: 0,
        wins: { p1: 0, p2: 0, tie: 0 },
        actions: actions || [],
        averageGameLength: 0,
        totalGames: 0,
        transitions: [],
      });
    }

    const stateInfo = this.currentBatch.get(key);
    stateInfo.occurrences++;

    return key;
  }

  updateOutcome(stateKey, winner, gameLength) {
    if (!this.currentBatch.has(stateKey)) return;

    const state = this.currentBatch.get(stateKey);
    if (winner === "p1") state.wins.p1++;
    else if (winner === "p2") state.wins.p2++;
    else if (winner === "tie") state.wins.tie++;

    // Update average game length
    state.totalGames++;
    state.averageGameLength =
      (state.averageGameLength * (state.totalGames - 1) + gameLength) /
      state.totalGames;
  }

  addTransition(fromState, toState, action) {
    if (!this.currentBatch.has(fromState)) return;

    const state = this.currentBatch.get(fromState);
    state.transitions.push({
      nextState: toState,
      action: action,
    });
  }

  async saveBatch() {
    for (const [key, data] of this.currentBatch.entries()) {
      await this.db.saveState(key, data);
    }
    this.currentBatch.clear();
  }

  async getStateCount() {
    return await this.db.getStateCount();
  }
}

// Exploration mode game simulator
class ExplorationSimulator {
  constructor() {
    this.data = new GameStateData();
    this.gamesSimulated = 0;
    this.currentGameStates = [];
    this.exploredPaths = new Set();
    this.explorationStrategy = "mixed"; // 'random', 'smart', or 'mixed'
  }

  // Add method to choose between random and tactical exploration
  chooseExplorationSequence(state, sequences) {
    // Filter out obviously suicidal sequences
    const safeSequences = sequences.filter((seq) => {
      return !this.isSequenceObviouslySuicidal(seq, state);
    });

    const viableSequences =
      safeSequences.length > 0 ? safeSequences : sequences;

    if (this.explorationStrategy === "random") {
      // Pure random (current behavior)
      return viableSequences[
        Math.floor(Math.random() * viableSequences.length)
      ];
    } else if (this.explorationStrategy === "smart") {
      // Use heuristics to pick promising sequences
      return this.chooseTacticalSequence(viableSequences, state);
    } else {
      // Mixed: 70% smart, 30% random for diversity
      if (Math.random() < 0.7) {
        return this.chooseTacticalSequence(viableSequences, state);
      } else {
        return viableSequences[
          Math.floor(Math.random() * viableSequences.length)
        ];
      }
    }
  }

  isSequenceObviouslySuicidal(sequence, state) {
    // Quick check: does this sequence end with player in danger with no escape?
    const simulator = new ExplorationSimulator();
    let testState = { ...state };
    const player = state.currentPlayer;

    // Apply all actions in sequence
    for (const action of sequence) {
      if (action.type === "endTurn") break;
      testState = simulator.applyAction(testState, player, action);
    }

    // Check if player is in immediate danger
    const pos = testState.playerPositions[player];
    const threatened = this.isPositionThreatened(
      testState,
      pos.row,
      pos.col,
      1
    );

    if (threatened.threatened) {
      // Check if there are escape routes
      const safePositions = this.findSafePositions(testState, player, 2);
      return safePositions.length === 0; // Suicidal if no escape
    }

    return false;
  }

  chooseTacticalSequence(sequences, state) {
    const player = state.currentPlayer;
    const opponent = player === "p1" ? "p2" : "p1";
    const opponentPos = state.playerPositions[opponent];

    let bestSequence = null;
    let bestScore = -Infinity;

    for (const seq of sequences) {
      let score = 0;

      // Apply sequence to get result
      let testState = { ...state };
      for (const action of seq) {
        if (action.type === "endTurn") break;
        testState = this.applyAction(testState, player, action);
      }

      const playerPos = testState.playerPositions[player];

      // 1. Survival bonus
      const threatened = this.isPositionThreatened(
        testState,
        playerPos.row,
        playerPos.col,
        2
      );
      if (!threatened.threatened) {
        score += 100;
      } else {
        score -= 200;
      }

      // 2. Mobility bonus
      const mobility = this.countEscapeRoutes(
        testState,
        playerPos.row,
        playerPos.col
      );
      score += mobility * 20;

      // 3. Aggression bonus
      const hasBombAction = seq.some((a) => a.type === "placeBomb");
      if (hasBombAction) {
        // Check if bomb threatens opponent
        const bombs = testState.bombs;
        for (const bomb of bombs) {
          const explosionCells = this.getExplosionCells(
            testState,
            bomb.row,
            bomb.col
          );
          const threatensOpponent = explosionCells.some(
            (cell) =>
              cell.row === opponentPos.row && cell.col === opponentPos.col
          );
          if (threatensOpponent) {
            score += 50;
          }
        }
      }

      // 4. Distance management
      const distance =
        Math.abs(playerPos.row - opponentPos.row) +
        Math.abs(playerPos.col - opponentPos.col);
      if (distance >= 2 && distance <= 4) {
        score += 10; // Good tactical distance
      }

      // 5. Randomness for diversity (small amount)
      score += Math.random() * 5;

      if (score > bestScore) {
        bestScore = score;
        bestSequence = seq;
      }
    }

    return bestSequence || sequences[0];
  }

  // Helper methods for tactical evaluation
  isPositionThreatened(state, row, col, maxTimer) {
    for (const bomb of state.bombs) {
      if (bomb.timer > maxTimer) continue;
      const explosionCells = this.getExplosionCells(state, bomb.row, bomb.col);
      for (const cell of explosionCells) {
        if (cell.row === row && cell.col === col) {
          return { threatened: true, timer: bomb.timer };
        }
      }
    }
    return { threatened: false, timer: Infinity };
  }

  findSafePositions(state, player, maxMoves) {
    const pos = state.playerPositions[player];
    const reachable = this.getReachablePositions(
      state,
      pos.row,
      pos.col,
      maxMoves
    );
    const safePositions = [];

    for (const posKey of reachable) {
      const [r, c] = posKey.split(",").map(Number);
      const threat = this.isPositionThreatened(state, r, c, 2);
      if (!threat.threatened) {
        safePositions.push({ row: r, col: c });
      }
    }

    return safePositions;
  }

  getReachablePositions(state, startRow, startCol, maxMoves) {
    const reachable = new Set();
    const visited = new Set();
    const queue = [{ row: startRow, col: startCol, moves: 0 }];

    while (queue.length > 0) {
      const current = queue.shift();
      const key = `${current.row},${current.col}`;

      if (visited.has(key)) continue;
      visited.add(key);

      if (current.moves <= maxMoves) {
        reachable.add(key);
      }

      if (current.moves >= maxMoves) continue;

      const directions = [
        { dr: -1, dc: 0 },
        { dr: 1, dc: 0 },
        { dr: 0, dc: -1 },
        { dr: 0, dc: 1 },
      ];

      for (const dir of directions) {
        const newRow = current.row + dir.dr;
        const newCol = current.col + dir.dc;

        if (this.canMoveTo(state, newRow, newCol)) {
          queue.push({ row: newRow, col: newCol, moves: current.moves + 1 });
        }
      }
    }

    return reachable;
  }

  canMoveTo(state, row, col) {
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE)
      return false;
    const cellType = state.grid[row][col];
    const hasBomb = state.bombs.some((b) => b.row === row && b.col === col);
    return cellType === "f" && !hasBomb;
  }

  countEscapeRoutes(state, row, col) {
    let routes = 0;
    const directions = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 },
    ];

    for (const dir of directions) {
      const newRow = row + dir.dr;
      const newCol = col + dir.dc;
      if (this.canMoveTo(state, newRow, newCol)) {
        routes++;
      }
    }

    return routes;
  }

  getExplosionCells(state, bombRow, bombCol) {
    const cells = [{ row: bombRow, col: bombCol }];
    const directions = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 },
    ];

    for (const { dr, dc } of directions) {
      let row = bombRow + dr;
      let col = bombCol + dc;

      while (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
        if (state.grid[row][col] === "w") break;
        cells.push({ row, col });
        if (state.bombs.some((b) => b.row === row && b.col === col)) break;
        row += dr;
        col += dc;
      }
    }

    return cells;
  }

  async init() {
    await this.data.init();
    const count = await this.data.getStateCount();
    console.log(`Initialized with ${count} existing states in database`);
  }

  cloneGameState(state) {
    return {
      currentPlayer: state.currentPlayer,
      actionsRemaining: state.actionsRemaining,
      playerPositions: {
        p1: { ...state.playerPositions.p1 },
        p2: { ...state.playerPositions.p2 },
      },
      playerDirections: {
        p1: state.playerDirections.p1,
        p2: state.playerDirections.p2,
      },
      bombs: state.bombs.map((b) => ({ ...b })),
      grid: state.grid.map((row) => [...row]),
      gameOver: state.gameOver,
      winner: state.winner,
      isFirstTurn: state.isFirstTurn,
    };
  }

  getAllPossibleActions(state, player) {
    const actions = [];
    const pos = state.playerPositions[player];

    // Movement actions
    const directions = [
      { dr: -1, dc: 0, dir: "up" },
      { dr: 1, dc: 0, dir: "down" },
      { dr: 0, dc: -1, dir: "left" },
      { dr: 0, dc: 1, dir: "right" },
    ];

    for (const { dr, dc, dir } of directions) {
      const newRow = pos.row + dr;
      const newCol = pos.col + dc;

      if (this.canMoveTo(state, newRow, newCol)) {
        actions.push({
          type: "move",
          row: newRow,
          col: newCol,
          direction: dir,
        });
      }
    }

    // Bomb placement
    const front = this.getFrontCell(state, player);
    if (this.canPlaceBomb(state, front.row, front.col)) {
      actions.push({ type: "placeBomb", row: front.row, col: front.col });
    }

    // Bomb/player kicking
    if (this.canKick(state, player, front.row, front.col)) {
      actions.push({ type: "kick", row: front.row, col: front.col });
    }

    // Direction changes
    for (const dir of ["up", "down", "left", "right"]) {
      if (state.playerDirections[player] !== dir) {
        actions.push({ type: "changeDirection", direction: dir });
      }
    }

    // End turn early
    actions.push({ type: "endTurn" });

    return actions;
  }

  canPlaceBomb(state, row, col) {
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE)
      return false;
    const cellType = state.grid[row][col];
    const hasBomb = state.bombs.some((b) => b.row === row && b.col === col);
    return cellType === "f" && !hasBomb;
  }

  canKick(state, player, row, col) {
    const cellType = state.grid[row][col];
    const hasBomb = state.bombs.some((b) => b.row === row && b.col === col);

    // Can kick player or bomb
    if (cellType === "p1" || cellType === "p2" || hasBomb) {
      const direction = state.playerDirections[player];
      const offset = this.getDirectionOffset(direction);
      const nextRow = row + offset.dr;
      const nextCol = col + offset.dc;

      // Check if there's space to kick to
      return this.canMoveTo(state, nextRow, nextCol);
    }
    return false;
  }

  getFrontCell(state, player) {
    const pos = state.playerPositions[player];
    const direction = state.playerDirections[player];
    const offset = this.getDirectionOffset(direction);
    return { row: pos.row + offset.dr, col: pos.col + offset.dc };
  }

  getDirectionOffset(direction) {
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

  applyAction(state, player, action) {
    const newState = this.cloneGameState(state);

    switch (action.type) {
      case "move":
        this.applyMove(newState, player, action.row, action.col);
        newState.actionsRemaining--;
        break;

      case "placeBomb":
        newState.bombs.push({ row: action.row, col: action.col, timer: 4 });
        newState.actionsRemaining--;
        break;

      case "kick":
        this.applyKick(newState, player, action.row, action.col);
        newState.actionsRemaining--;
        break;

      case "changeDirection":
        newState.playerDirections[player] = action.direction;
        break;

      case "endTurn":
        newState.actionsRemaining = 0;
        break;
    }

    return newState;
  }

  applyMove(state, player, row, col) {
    const pos = state.playerPositions[player];
    state.grid[pos.row][pos.col] = "f";
    state.grid[row][col] = player;
    state.playerPositions[player] = { row, col };
  }

  applyKick(state, player, targetRow, targetCol) {
    const direction = state.playerDirections[player];
    const offset = this.getDirectionOffset(direction);
    const bombIndex = state.bombs.findIndex(
      (b) => b.row === targetRow && b.col === targetCol
    );

    if (bombIndex !== -1) {
      // Kick bomb
      let currentRow = targetRow;
      let currentCol = targetCol;

      while (true) {
        const nextRow = currentRow + offset.dr;
        const nextCol = currentCol + offset.dc;

        if (!this.canMoveTo(state, nextRow, nextCol)) break;

        currentRow = nextRow;
        currentCol = nextCol;
      }

      state.bombs[bombIndex].row = currentRow;
      state.bombs[bombIndex].col = currentCol;
    } else {
      // Kick player
      const targetPlayer = state.grid[targetRow][targetCol];
      if (targetPlayer === "p1" || targetPlayer === "p2") {
        const kickToRow = targetRow + offset.dr;
        const kickToCol = targetCol + offset.dc;

        state.grid[targetRow][targetCol] = "f";
        state.grid[kickToRow][kickToCol] = targetPlayer;
        state.playerPositions[targetPlayer] = {
          row: kickToRow,
          col: kickToCol,
        };
      }
    }
  }

  processTurnEnd(state) {
    const newState = this.cloneGameState(state);

    // Switch players
    newState.currentPlayer = newState.currentPlayer === "p1" ? "p2" : "p1";

    // Fix: Properly handle action counts based on first turn
    if (newState.isFirstTurn) {
      if (newState.currentPlayer === "p1") {
        // First player's first turn gets 3 actions
        newState.actionsRemaining = 3;
      } else {
        // Player 2's first turn gets 5 actions, and this ends the first turn phase
        newState.actionsRemaining = 5;
        newState.isFirstTurn = false;
      }
    } else {
      // All subsequent turns get 5 actions
      newState.actionsRemaining = 5;
    }

    // Process bomb timers
    for (let i = newState.bombs.length - 1; i >= 0; i--) {
      newState.bombs[i].timer--;
      if (newState.bombs[i].timer <= 0) {
        this.processBombExplosion(newState, newState.bombs[i]);
        newState.bombs.splice(i, 1);
      }
    }

    return newState;
  }

  processBombExplosion(state, bomb) {
    const explosionCells = this.getExplosionCells(state, bomb.row, bomb.col);

    for (const { row, col } of explosionCells) {
      const cellType = state.grid[row][col];

      if (cellType === "p1") {
        state.gameOver = true;
        if (state.winner === "p2") state.winner = "tie";
        else state.winner = "p2";
      } else if (cellType === "p2") {
        state.gameOver = true;
        if (state.winner === "p1") state.winner = "tie";
        else state.winner = "p1";
      }

      // Trigger chain reactions
      const chainBombIndex = state.bombs.findIndex(
        (b) => b.row === row && b.col === col
      );
      if (
        chainBombIndex !== -1 &&
        chainBombIndex !== state.bombs.indexOf(bomb)
      ) {
        state.bombs[chainBombIndex].timer = 0;
      }
    }
  }

  generateTurnSequences(state, maxActions, depth = 0) {
    if (depth >= maxActions || state.actionsRemaining <= 0) {
      return [[]];
    }

    const sequences = [];
    const player = state.currentPlayer;
    const actions = this.getAllPossibleActions(state, player);

    // Always include the option to end turn early
    sequences.push([{ type: "endTurn" }]);

    for (const action of actions) {
      if (action.type === "endTurn") continue;

      const newState = this.applyAction(state, player, action);

      if (!newState.gameOver) {
        const subSequences = this.generateTurnSequences(
          newState,
          maxActions,
          depth + 1
        );

        for (const subSeq of subSequences) {
          sequences.push([action, ...subSeq]);
        }
      } else {
        sequences.push([action]);
      }
    }

    return sequences;
  }

  createInitialState() {
    return {
      currentPlayer: "p1",
      actionsRemaining: 3, // First player's first turn gets 3 actions
      playerPositions: {
        p1: { row: 1, col: 1 },
        p2: { row: 5, col: 5 },
      },
      playerDirections: {
        p1: "right",
        p2: "left",
      },
      bombs: [],
      grid: gridLayout.map((row) => [...row]),
      gameOver: false,
      winner: null,
      isFirstTurn: true,
    };
  }

  async runExploration(numGames, progressCallback) {
    await this.init();

    console.log(`Starting exploration of ${numGames} games...`);

    for (let i = 0; i < numGames; i++) {
      await this.simulateGame(EXPLORATION_CONFIG.MAX_DEPTH);

      if (progressCallback) {
        progressCallback(i + 1, numGames);
      }

      // Save batch periodically
      if ((i + 1) % EXPLORATION_CONFIG.BATCH_SIZE === 0) {
        await this.data.saveBatch();
        console.log(`Saved batch after ${i + 1} games`);
      }

      // Yield to prevent browser freezing
      if (i % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    // Save final batch
    await this.data.saveBatch();

    const totalStates = await this.data.getStateCount();
    console.log(`Exploration complete! Simulated ${this.gamesSimulated} games`);
    console.log(`Total unique states in database: ${totalStates}`);

    return { gamesSimulated: this.gamesSimulated, totalStates };
  }

  // Update simulateGame to use new sequence selection
  async simulateGame(maxTurns) {
    let state = this.createInitialState();
    const gameStates = [];
    let turnCount = 0;

    while (!state.gameOver && turnCount < maxTurns) {
      const player = state.currentPlayer;
      const stateKey = await this.data.addState(state, turnCount, []);
      gameStates.push({ key: stateKey, state: this.cloneGameState(state) });

      let maxActionsForSequence;
      if (state.isFirstTurn && state.currentPlayer === "p1") {
        maxActionsForSequence = 3;
      } else {
        maxActionsForSequence = 5;
      }

      const sequenceDepth = Math.min(
        maxActionsForSequence,
        EXPLORATION_CONFIG.MAX_SEQUENCE_DEPTH
      );
      const sequences = this.generateTurnSequences(state, sequenceDepth);

      // Use improved sequence selection
      let chosenSequence = this.chooseExplorationSequence(state, sequences);

      // Apply the chosen sequence
      for (const action of chosenSequence) {
        if (state.gameOver || state.actionsRemaining <= 0) break;
        state = this.applyAction(state, player, action);
      }

      state = this.processTurnEnd(state);
      turnCount++;
    }

    // Update outcomes
    for (const { key } of gameStates) {
      this.data.updateOutcome(key, state.winner, turnCount);
    }

    // Record transitions
    for (let i = 0; i < gameStates.length - 1; i++) {
      this.data.addTransition(gameStates[i].key, gameStates[i + 1].key, null);
    }

    this.gamesSimulated++;
    return state;
  }
}

// UI for exploration mode with import/export
function initializeExplorationMode() {
  // Add exploration mode section to the player selection screen
  const playerSelection = document.getElementById("player-selection");

  const explorationSection = document.createElement("div");
  explorationSection.className = "exploration-section";
  explorationSection.style.marginTop = "20px";
  explorationSection.innerHTML = `
    <h3>AI Training Mode</h3>
    <div class="exploration-controls">
      <div style="margin-bottom: 10px;">
        <label>Number of games to simulate:</label>
        <input type="number" id="exploration-games" value="100" min="1" max="10000" />
      </div>
      
      <div style="margin-bottom: 10px;">
        <label>Exploration strategy:</label>
        <select id="exploration-strategy">
          <option value="mixed">Mixed (70% smart, 30% random) - Recommended</option>
          <option value="smart">Smart (tactical play only)</option>
          <option value="random">Random (pure exploration)</option>
        </select>
      </div>
      
      <div style="margin-bottom: 10px;">
        <button id="start-exploration-btn">Start Exploration</button>
      </div>
      
      <div style="margin-bottom: 10px;">
        <button id="export-data-btn">Export Data to JSON</button>
        <button id="import-data-btn">Import Data from JSON</button>
        <button id="clear-data-btn" style="background-color: #ff6666;">Clear All Data</button>
        <input type="file" id="import-file-input" accept=".json" style="display: none;" />
      </div>
      
      <div id="data-stats" style="margin-bottom: 10px; font-size: 14px;"></div>
      
      <div id="exploration-progress" style="display: none; margin-top: 10px;">
        <progress id="exploration-progress-bar" max="100" value="0"></progress>
        <span id="exploration-progress-text">0/0</span>
      </div>
      
      <div id="exploration-results" style="display: none; margin-top: 10px;"></div>
    </div>
  `;

  playerSelection.appendChild(explorationSection);

  // Update data stats on load
  updateDataStats();

  // Start exploration button
  document
    .getElementById("start-exploration-btn")
    .addEventListener("click", async () => {
      const numGames = parseInt(
        document.getElementById("exploration-games").value
      );
      const strategy = document.getElementById("exploration-strategy").value;

      if (isNaN(numGames) || numGames < 1) {
        alert("Please enter a valid number of games (1 or more)");
        return;
      }

      const btn = document.getElementById("start-exploration-btn");
      const progressDiv = document.getElementById("exploration-progress");
      const progressBar = document.getElementById("exploration-progress-bar");
      const progressText = document.getElementById("exploration-progress-text");
      const resultsDiv = document.getElementById("exploration-results");

      btn.disabled = true;
      progressDiv.style.display = "block";
      resultsDiv.style.display = "none";

      const simulator = new ExplorationSimulator();
      simulator.explorationStrategy = strategy; // Set the strategy

      const result = await simulator.runExploration(
        numGames,
        (current, total) => {
          const percent = (current / total) * 100;
          progressBar.value = percent;
          progressText.textContent = `${current}/${total} games simulated`;
        }
      );

      btn.disabled = false;
      progressDiv.style.display = "none";
      resultsDiv.style.display = "block";
      resultsDiv.innerHTML = `
      <strong>Exploration Complete!</strong><br>
      Strategy: ${strategy}<br>
      Games simulated: ${result.gamesSimulated}<br>
      Total unique states in database: ${result.totalStates}
    `;

      updateDataStats();
    });

  // Export data button
  document
    .getElementById("export-data-btn")
    .addEventListener("click", async () => {
      const db = new GameStateDatabase();
      await db.init();

      const jsonData = await db.exportToJSON();
      const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.downloa = `bomb_game_data_${new Date().getTime()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      alert(`Exported ${jsonData.states.length} states to JSON file`);
    });

  // Import data button
  document.getElementById("import-data-btn").addEventListener("click", () => {
    document.getElementById("import-file-input").click();
  });

  // Handle file import
  document
    .getElementById("import-file-input")
    .addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const jsonData = JSON.parse(text);

        const db = new GameStateDatabase();
        await db.init();

        const result = await db.importFromJSON(jsonData);

        alert(
          `Import complete!\nNew states imported: ${result.imported}\nStates merged: ${result.merged}\nTotal in file: ${result.total}`
        );

        updateDataStats();
      } catch (error) {
        alert(`Error importing file: ${error.message}`);
      }

      // Clear the input so the same file can be imported again if needed
      e.target.value = "";
    });

  // Clear data button
  document
    .getElementById("clear-data-btn")
    .addEventListener("click", async () => {
      if (
        !confirm(
          "Are you sure you want to clear all exploration data? This cannot be undone."
        )
      ) {
        return;
      }

      const db = new GameStateDatabase();
      await db.init();
      await db.clearAllData();

      alert("All exploration data has been cleared");
      updateDataStats();
    });

  // Function to update data statistics display
  async function updateDataStats() {
    const statsDiv = document.getElementById("data-stats");

    try {
      const db = new GameStateDatabase();
      await db.init();
      const count = await db.getStateCount();

      statsDiv.innerHTML = `<strong>Current database:</strong> ${count} unique states`;
    } catch (error) {
      statsDiv.innerHTML = "<em>No data available</em>";
    }
  }
}

// Initialize exploration mode when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  initializeExplorationMode();
});

// ==================== TOURNAMENT MODE ====================

class TournamentSimulator {
  constructor() {
    this.results = {};
    this.isRunning = false;
    this.shouldCancel = false;
    this.collectData = false; // Flag to enable/disable data collection
    this.gameStateData = null; // For storing game states
    this.gamesCollected = 0;
    this.statesCollected = 0;
  }

  async init() {
    // Initialize data collection if enabled
    if (this.collectData) {
      this.gameStateData = new GameStateData();
      await this.gameStateData.init();
    }
  }

  createInitialState() {
    return {
      currentPlayer: "p1",
      actionsRemaining: 3,
      playerPositions: {
        p1: { row: 1, col: 1 },
        p2: { row: 5, col: 5 },
      },
      playerDirections: {
        p1: "right",
        p2: "left",
      },
      bombs: [],
      grid: gridLayout.map((row) => [...row]),
      gameOver: false,
      winner: null,
      isFirstTurn: true,
    };
  }

  cloneState(state) {
    return {
      currentPlayer: state.currentPlayer,
      actionsRemaining: state.actionsRemaining,
      playerPositions: {
        p1: { ...state.playerPositions.p1 },
        p2: { ...state.playerPositions.p2 },
      },
      playerDirections: {
        p1: state.playerDirections.p1,
        p2: state.playerDirections.p2,
      },
      bombs: state.bombs.map((b) => ({ ...b })),
      grid: state.grid.map((row) => [...row]),
      gameOver: state.gameOver,
      winner: state.winner,
      isFirstTurn: state.isFirstTurn,
    };
  }

  // Serialize state for database storage (same format as exploration mode)
  serializeState(state) {
    const bombs = state.bombs
      .map((b) => `b${b.row},${b.col}:${b.timer}`)
      .sort();

    const p1 = `p1:${state.playerPositions.p1.row},${state.playerPositions.p1.col}`;
    const p2 = `p2:${state.playerPositions.p2.row},${state.playerPositions.p2.col}`;
    const turn = `turn:${state.currentPlayer}`;

    return [turn, p1, p2, ...bombs].join("|");
  }

  // Serialize end-of-turn state (bombs tick down, turn switches)
  serializeEndOfTurnState(state, player) {
    const opponent = player === "p1" ? "p2" : "p1";

    const adjustedBombs = state.bombs
      .filter((b) => b.timer > 1)
      .map((b) => ({ ...b, timer: b.timer - 1 }));

    const bombs = adjustedBombs
      .map((b) => `b${b.row},${b.col}:${b.timer}`)
      .sort();

    const p1 = `p1:${state.playerPositions.p1.row},${state.playerPositions.p1.col}`;
    const p2 = `p2:${state.playerPositions.p2.row},${state.playerPositions.p2.col}`;
    const turn = `turn:${opponent}`;

    return [turn, p1, p2, ...bombs].join("|");
  }

  // ==================== SIMULATION HELPERS ====================
  // (Keep all existing helper methods: getDirectionOffset, isValidPosition, etc.)

  getDirectionOffset(direction) {
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

  isValidPosition(state, row, col) {
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE)
      return false;
    const cellType = state.grid[row][col];
    const hasBomb = state.bombs.some((b) => b.row === row && b.col === col);
    return cellType === "f" && !hasBomb;
  }

  getFrontCell(state, player) {
    const pos = state.playerPositions[player];
    const direction = state.playerDirections[player];
    const offset = this.getDirectionOffset(direction);
    return { row: pos.row + offset.dr, col: pos.col + offset.dc };
  }

  getExplosionCells(state, bombRow, bombCol) {
    const cells = [{ row: bombRow, col: bombCol }];
    const directions = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 },
    ];

    for (const { dr, dc } of directions) {
      let row = bombRow + dr;
      let col = bombCol + dc;

      while (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
        if (state.grid[row][col] === "w") break;
        cells.push({ row, col });
        if (state.bombs.some((b) => b.row === row && b.col === col)) break;
        row += dr;
        col += dc;
      }
    }

    return cells;
  }

  isPositionThreatened(state, row, col, maxTimer = 4) {
    for (const bomb of state.bombs) {
      if (bomb.timer > maxTimer) continue;
      const explosionCells = this.getExplosionCells(state, bomb.row, bomb.col);
      for (const cell of explosionCells) {
        if (cell.row === row && cell.col === col) {
          return { threatened: true, timer: bomb.timer };
        }
      }
    }
    return { threatened: false, timer: Infinity };
  }

  getReachablePositions(state, startRow, startCol, maxMoves) {
    const reachable = new Set();
    const visited = new Set();
    const queue = [{ row: startRow, col: startCol, moves: 0 }];

    while (queue.length > 0) {
      const current = queue.shift();
      const key = `${current.row},${current.col}`;

      if (visited.has(key)) continue;
      visited.add(key);

      if (current.moves <= maxMoves) {
        reachable.add(key);
      }

      if (current.moves >= maxMoves) continue;

      const directions = [
        { dr: -1, dc: 0 },
        { dr: 1, dc: 0 },
        { dr: 0, dc: -1 },
        { dr: 0, dc: 1 },
      ];

      for (const dir of directions) {
        const newRow = current.row + dir.dr;
        const newCol = current.col + dir.dc;

        if (this.isValidPosition(state, newRow, newCol)) {
          queue.push({ row: newRow, col: newCol, moves: current.moves + 1 });
        }
      }
    }

    return reachable;
  }

  findSafePositions(state, player, maxMoves) {
    const pos = state.playerPositions[player];
    const reachable = this.getReachablePositions(
      state,
      pos.row,
      pos.col,
      maxMoves
    );
    const safePositions = [];

    for (const posKey of reachable) {
      const [r, c] = posKey.split(",").map(Number);
      const threat = this.isPositionThreatened(state, r, c, 2);
      if (!threat.threatened) {
        safePositions.push({ row: r, col: c });
      }
    }

    return safePositions;
  }

  countEscapeRoutes(state, row, col) {
    let routes = 0;
    const directions = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 },
    ];

    for (const dir of directions) {
      if (this.isValidPosition(state, row + dir.dr, col + dir.dc)) {
        routes++;
      }
    }

    return routes;
  }

  // ==================== ACTION EXECUTION ====================
  // (Keep all existing action methods: getAllActions, applyAction, processTurnEnd)

  getAllActions(state, player) {
    const actions = [];
    const pos = state.playerPositions[player];
    const direction = state.playerDirections[player];

    const directions = [
      { dr: -1, dc: 0, dir: "up" },
      { dr: 1, dc: 0, dir: "down" },
      { dr: 0, dc: -1, dir: "left" },
      { dr: 0, dc: 1, dir: "right" },
    ];

    for (const { dr, dc, dir } of directions) {
      const newRow = pos.row + dr;
      const newCol = pos.col + dc;
      if (this.isValidPosition(state, newRow, newCol)) {
        actions.push({
          type: "move",
          row: newRow,
          col: newCol,
          direction: dir,
        });
      }
    }

    for (const dir of ["up", "down", "left", "right"]) {
      if (state.playerDirections[player] !== dir) {
        actions.push({ type: "changeDirection", direction: dir });
      }
    }

    const front = this.getFrontCell(state, player);
    if (this.isValidPosition(state, front.row, front.col)) {
      actions.push({ type: "placeBomb", row: front.row, col: front.col });
    }

    const frontCell = state.grid[front.row]?.[front.col];
    const frontBomb = state.bombs.find(
      (b) => b.row === front.row && b.col === front.col
    );

    if (frontBomb || frontCell === "p1" || frontCell === "p2") {
      const offset = this.getDirectionOffset(direction);
      const kickToRow = front.row + offset.dr;
      const kickToCol = front.col + offset.dc;

      if (this.isValidPosition(state, kickToRow, kickToCol)) {
        actions.push({ type: "kick", row: front.row, col: front.col });
      }
    }

    return actions;
  }

  applyAction(state, player, action) {
    const newState = this.cloneState(state);

    switch (action.type) {
      case "move": {
        const pos = newState.playerPositions[player];
        newState.grid[pos.row][pos.col] = "f";
        newState.grid[action.row][action.col] = player;
        newState.playerPositions[player] = { row: action.row, col: action.col };
        newState.actionsRemaining--;
        break;
      }

      case "changeDirection": {
        newState.playerDirections[player] = action.direction;
        break;
      }

      case "placeBomb": {
        newState.bombs.push({ row: action.row, col: action.col, timer: 4 });
        newState.actionsRemaining--;
        break;
      }

      case "kick": {
        const direction = newState.playerDirections[player];
        const offset = this.getDirectionOffset(direction);
        const targetRow = action.row;
        const targetCol = action.col;

        const targetCell = newState.grid[targetRow][targetCol];
        if (targetCell === "p1" || targetCell === "p2") {
          const kickedPlayer = targetCell;
          const kickToRow = targetRow + offset.dr;
          const kickToCol = targetCol + offset.dc;

          newState.grid[targetRow][targetCol] = "f";
          newState.grid[kickToRow][kickToCol] = kickedPlayer;
          newState.playerPositions[kickedPlayer] = {
            row: kickToRow,
            col: kickToCol,
          };
        } else {
          const bombIndex = newState.bombs.findIndex(
            (b) => b.row === targetRow && b.col === targetCol
          );

          if (bombIndex !== -1) {
            let currentRow = targetRow;
            let currentCol = targetCol;

            while (true) {
              const nextRow = currentRow + offset.dr;
              const nextCol = currentCol + offset.dc;

              if (!this.isValidPosition(newState, nextRow, nextCol)) break;

              currentRow = nextRow;
              currentCol = nextCol;
            }

            newState.bombs[bombIndex].row = currentRow;
            newState.bombs[bombIndex].col = currentCol;
          }
        }
        newState.actionsRemaining--;
        break;
      }
    }

    return newState;
  }

  processTurnEnd(state) {
    const newState = this.cloneState(state);

    newState.currentPlayer = newState.currentPlayer === "p1" ? "p2" : "p1";

    if (newState.isFirstTurn && newState.currentPlayer === "p2") {
      newState.actionsRemaining = 5;
      newState.isFirstTurn = false;
    } else if (newState.isFirstTurn && newState.currentPlayer === "p1") {
      newState.actionsRemaining = 3;
    } else {
      newState.actionsRemaining = 5;
    }

    const explodingBombs = [];
    for (let i = newState.bombs.length - 1; i >= 0; i--) {
      newState.bombs[i].timer--;
      if (newState.bombs[i].timer <= 0) {
        explodingBombs.push({
          row: newState.bombs[i].row,
          col: newState.bombs[i].col,
        });
        newState.bombs.splice(i, 1);
      }
    }

    const allExplosionCells = new Set();
    const processedBombs = new Set();

    while (explodingBombs.length > 0) {
      const bomb = explodingBombs.shift();
      const key = `${bomb.row},${bomb.col}`;
      if (processedBombs.has(key)) continue;
      processedBombs.add(key);

      const cells = this.getExplosionCells(newState, bomb.row, bomb.col);
      for (const cell of cells) {
        allExplosionCells.add(`${cell.row},${cell.col}`);

        const chainBombIndex = newState.bombs.findIndex(
          (b) => b.row === cell.row && b.col === cell.col
        );
        if (chainBombIndex !== -1) {
          explodingBombs.push({
            row: newState.bombs[chainBombIndex].row,
            col: newState.bombs[chainBombIndex].col,
          });
          newState.bombs.splice(chainBombIndex, 1);
        }
      }
    }

    let p1Hit = false;
    let p2Hit = false;

    for (const cellKey of allExplosionCells) {
      const [r, c] = cellKey.split(",").map(Number);
      if (newState.grid[r][c] === "p1") {
        p1Hit = true;
        newState.grid[r][c] = "f";
      } else if (newState.grid[r][c] === "p2") {
        p2Hit = true;
        newState.grid[r][c] = "f";
      }
    }

    if (p1Hit && p2Hit) {
      newState.gameOver = true;
      newState.winner = "tie";
    } else if (p1Hit) {
      newState.gameOver = true;
      newState.winner = "p2";
    } else if (p2Hit) {
      newState.gameOver = true;
      newState.winner = "p1";
    }

    return newState;
  }

  // ==================== AI IMPLEMENTATIONS ====================
  // (Keep all existing AI methods: getEasyAIAction, getMediumAIAction, getHardAIAction)

  getEasyAIAction(state, player) {
    const actions = this.getAllActions(state, player);
    if (actions.length === 0) return null;

    const nonDirActions = actions.filter((a) => a.type !== "changeDirection");
    if (nonDirActions.length > 0 && Math.random() > 0.3) {
      return nonDirActions[Math.floor(Math.random() * nonDirActions.length)];
    }

    return actions[Math.floor(Math.random() * actions.length)];
  }

  getMediumAIAction(state, player) {
    const pos = state.playerPositions[player];
    const actions = this.getAllActions(state, player);

    const threat = this.isPositionThreatened(state, pos.row, pos.col, 2);

    if (threat.threatened) {
      for (const action of actions) {
        if (action.type === "move") {
          const moveThreat = this.isPositionThreatened(
            state,
            action.row,
            action.col,
            2
          );
          if (!moveThreat.threatened) {
            const newMobility = this.countEscapeRoutes(
              state,
              action.row,
              action.col
            );
            if (newMobility >= 1) {
              return action;
            }
          }
        }
      }

      for (const action of actions) {
        if (action.type === "kick") {
          return action;
        }
      }
    }

    const safeActions = actions.filter((action) => {
      if (action.type === "move") {
        const moveThreat = this.isPositionThreatened(
          state,
          action.row,
          action.col,
          2
        );
        if (moveThreat.threatened) return false;

        const newMobility = this.countEscapeRoutes(
          state,
          action.row,
          action.col
        );
        return newMobility >= 1;
      }
      if (action.type === "placeBomb") {
        const newState = this.applyAction(state, player, action);
        const safeAfter = this.findSafePositions(
          newState,
          player,
          newState.actionsRemaining
        );
        return safeAfter.length > 0;
      }
      if (action.type === "kick") {
        return true;
      }
      return true;
    });

    const nonDirSafeActions = safeActions.filter(
      (a) => a.type !== "changeDirection"
    );

    if (nonDirSafeActions.length > 0) {
      return nonDirSafeActions[
        Math.floor(Math.random() * nonDirSafeActions.length)
      ];
    }

    if (safeActions.length > 0) {
      return safeActions[Math.floor(Math.random() * safeActions.length)];
    }

    const nonDirActions = actions.filter((a) => a.type !== "changeDirection");
    if (nonDirActions.length > 0) {
      return nonDirActions[Math.floor(Math.random() * nonDirActions.length)];
    }

    return actions.length > 0 ? actions[0] : null;
  }

  getHardAIAction(state, player) {
    const pos = state.playerPositions[player];
    const opponent = player === "p1" ? "p2" : "p1";
    const opponentPos = state.playerPositions[opponent];
    const actions = this.getAllActions(state, player);
    const currentActionsRemaining = state.actionsRemaining;

    const currentThreat = this.isPositionThreatened(state, pos.row, pos.col, 2);

    if (currentThreat.threatened) {
      let bestEscapeAction = null;
      let bestEscapeScore = -Infinity;

      for (const action of actions) {
        if (action.type === "move") {
          const moveThreat = this.isPositionThreatened(
            state,
            action.row,
            action.col,
            2
          );
          if (!moveThreat.threatened) {
            const newMobility = this.countEscapeRoutes(
              state,
              action.row,
              action.col
            );
            let score = newMobility * 100;

            for (const bomb of state.bombs) {
              const oldDist =
                Math.abs(pos.row - bomb.row) + Math.abs(pos.col - bomb.col);
              const newDist =
                Math.abs(action.row - bomb.row) +
                Math.abs(action.col - bomb.col);
              if (newDist > oldDist) {
                score += 50;
              }
            }

            if (score > bestEscapeScore) {
              bestEscapeScore = score;
              bestEscapeAction = action;
            }
          }
        }

        if (action.type === "kick") {
          const front = this.getFrontCell(state, player);
          const bomb = state.bombs.find(
            (b) => b.row === front.row && b.col === front.col
          );
          if (bomb) {
            const newState = this.applyAction(state, player, action);
            const stillThreatened = this.isPositionThreatened(
              newState,
              pos.row,
              pos.col,
              2
            );
            if (!stillThreatened.threatened) {
              return action;
            }
          }
        }
      }

      if (bestEscapeAction) {
        return bestEscapeAction;
      }

      const moveActions = actions.filter((a) => a.type === "move");
      if (moveActions.length > 0) {
        let bestMove = moveActions[0];
        let bestMobility = -1;
        for (const move of moveActions) {
          const mobility = this.countEscapeRoutes(state, move.row, move.col);
          if (mobility > bestMobility) {
            bestMobility = mobility;
            bestMove = move;
          }
        }
        return bestMove;
      }
    }

    let bestAction = null;
    let bestScore = -Infinity;

    for (const action of actions) {
      let score = 0;

      if (action.type === "move") {
        const moveThreat = this.isPositionThreatened(
          state,
          action.row,
          action.col,
          2
        );
        if (moveThreat.threatened) {
          const actionsAfterMove = currentActionsRemaining - 1;
          const safeFromThere = this.findSafePositions(
            this.applyAction(state, player, action),
            player,
            actionsAfterMove
          );
          if (safeFromThere.length === 0) {
            score -= 2000;
          } else {
            score -= 200;
          }
        }

        const newMobility = this.countEscapeRoutes(
          state,
          action.row,
          action.col
        );
        score += newMobility * 40;

        if (newMobility <= 1) {
          score -= 100;
        }

        const oldDist =
          Math.abs(pos.row - opponentPos.row) +
          Math.abs(pos.col - opponentPos.col);
        const newDist =
          Math.abs(action.row - opponentPos.row) +
          Math.abs(action.col - opponentPos.col);

        if (state.bombs.length === 0) {
          if (newDist < oldDist) {
            score += 30;
          }
        } else {
          if (newDist >= 2 && newDist <= 4) {
            score += 20;
          }
        }
      }

      if (action.type === "placeBomb") {
        const front = this.getFrontCell(state, player);
        const newState = this.applyAction(state, player, action);

        const actionsAfterBomb = newState.actionsRemaining;
        const ourSafePositions = this.findSafePositions(
          newState,
          player,
          actionsAfterBomb
        );

        if (ourSafePositions.length === 0) {
          score -= 5000;
          continue;
        } else if (ourSafePositions.length <= 1) {
          score -= 200;
        }

        const explosionCells = this.getExplosionCells(
          newState,
          front.row,
          front.col
        );
        const threatensOpponent = explosionCells.some(
          (cell) => cell.row === opponentPos.row && cell.col === opponentPos.col
        );

        if (threatensOpponent) {
          score += 100;

          const opponentSafe = this.findSafePositions(newState, opponent, 4);
          if (opponentSafe.length === 0) {
            score += 500;
          } else if (opponentSafe.length <= 2) {
            score += 150;
          }
        } else {
          score -= 50;
        }

        const opponentReachableBefore = this.getReachablePositions(
          state,
          opponentPos.row,
          opponentPos.col,
          3
        );
        const opponentReachableAfter = this.getReachablePositions(
          newState,
          opponentPos.row,
          opponentPos.col,
          3
        );
        if (opponentReachableAfter.size < opponentReachableBefore.size) {
          score +=
            (opponentReachableBefore.size - opponentReachableAfter.size) * 10;
        }
      }

      if (action.type === "kick") {
        const front = this.getFrontCell(state, player);
        const frontCell = state.grid[front.row]?.[front.col];
        const bomb = state.bombs.find(
          (b) => b.row === front.row && b.col === front.col
        );

        if (bomb) {
          const direction = state.playerDirections[player];
          const kickedPos = this.simulateKick(
            state,
            front.row,
            front.col,
            direction
          );

          const explosionCells = this.getExplosionCells(
            {
              ...state,
              bombs: state.bombs.map((b) =>
                b === bomb
                  ? { ...b, row: kickedPos.row, col: kickedPos.col }
                  : b
              ),
            },
            kickedPos.row,
            kickedPos.col
          );

          const threatensOpponent = explosionCells.some(
            (cell) =>
              cell.row === opponentPos.row && cell.col === opponentPos.col
          );

          if (threatensOpponent) {
            score += 120;
            if (bomb.timer <= 2) {
              score += 150;
            }
          }

          const newState = this.applyAction(state, player, action);
          const wasThreatened = this.isPositionThreatened(
            state,
            pos.row,
            pos.col,
            2
          );
          const nowThreatened = this.isPositionThreatened(
            newState,
            pos.row,
            pos.col,
            2
          );

          if (wasThreatened.threatened && !nowThreatened.threatened) {
            score += 200;
          }
        }

        if (frontCell === "p1" || frontCell === "p2") {
          const kickedPlayer = frontCell;
          if (kickedPlayer === opponent) {
            const newState = this.applyAction(state, player, action);
            const newOpponentPos = newState.playerPositions[opponent];
            const opponentThreat = this.isPositionThreatened(
              newState,
              newOpponentPos.row,
              newOpponentPos.col,
              2
            );

            if (opponentThreat.threatened) {
              score += 200;

              const opponentCanEscape = this.findSafePositions(
                newState,
                opponent,
                5
              );
              if (opponentCanEscape.length === 0) {
                score += 400;
              }
            }

            const opponentMobilityBefore = this.countEscapeRoutes(
              state,
              opponentPos.row,
              opponentPos.col
            );
            const opponentMobilityAfter = this.countEscapeRoutes(
              newState,
              newOpponentPos.row,
              newOpponentPos.col
            );

            if (opponentMobilityAfter < opponentMobilityBefore) {
              score += (opponentMobilityBefore - opponentMobilityAfter) * 30;
            }
          }
        }
      }

      if (action.type === "changeDirection") {
        score -= 30;

        const newState = this.applyAction(state, player, action);
        const newFront = this.getFrontCell(newState, player);

        if (
          newFront.row === opponentPos.row ||
          newFront.col === opponentPos.col
        ) {
          if (this.isValidPosition(newState, newFront.row, newFront.col)) {
            const testExplosion = this.getExplosionCells(
              {
                ...newState,
                bombs: [
                  ...newState.bombs,
                  { row: newFront.row, col: newFront.col, timer: 4 },
                ],
              },
              newFront.row,
              newFront.col
            );
            const wouldThreaten = testExplosion.some(
              (cell) =>
                cell.row === opponentPos.row && cell.col === opponentPos.col
            );
            if (wouldThreaten) {
              score += 40;
            }
          }
        }

        const bombAtNewFront = state.bombs.find(
          (b) => b.row === newFront.row && b.col === newFront.col
        );
        const playerAtNewFront = state.grid[newFront.row]?.[newFront.col];
        if (bombAtNewFront || playerAtNewFront === opponent) {
          score += 25;
        }
      }

      score += Math.random() * 3;

      if (score > bestScore) {
        bestScore = score;
        bestAction = action;
      }
    }

    if (!bestAction || bestScore < -500) {
      return this.getMediumAIAction(state, player);
    }

    return bestAction;
  }

  simulateKick(state, targetRow, targetCol, direction) {
    const offset = this.getDirectionOffset(direction);
    let currentRow = targetRow;
    let currentCol = targetCol;

    while (true) {
      const nextRow = currentRow + offset.dr;
      const nextCol = currentCol + offset.dc;

      if (!this.isValidPosition(state, nextRow, nextCol)) break;

      currentRow = nextRow;
      currentCol = nextCol;
    }

    return { row: currentRow, col: currentCol };
  }

  async getExpertAIActionWithInstance(state, player, expertAI) {
    if (!expertAI) {
      return this.getHardAIAction(state, player);
    }

    const decision = await expertAI.getBestAction(
      state,
      player,
      state.actionsRemaining
    );
    return decision.action;
  }

  // ==================== GAME SIMULATION WITH DATA COLLECTION ====================

  async simulateGame(p1Difficulty, p2Difficulty, maxTurns = 50) {
    let state = this.createInitialState();
    let turnCount = 0;

    const difficulties = { p1: p1Difficulty, p2: p2Difficulty };

    // Create separate Expert AI instances for each player if needed
    const expertAIs = {
      p1: null,
      p2: null,
    };

    if (p1Difficulty === "expert") {
      expertAIs.p1 = new ExpertAI();
      await expertAIs.p1.init();
      expertAIs.p1.resetGameState();
    }

    if (p2Difficulty === "expert") {
      expertAIs.p2 = new ExpertAI();
      await expertAIs.p2.init();
      expertAIs.p2.resetGameState();
    }

    // Track game states for data collection
    const gameStates = [];
    let previousStateKey = null;

    while (!state.gameOver && turnCount < maxTurns) {
      const player = state.currentPlayer;
      const difficulty = difficulties[player];

      // Collect state at the start of each turn
      if (this.collectData && this.gameStateData) {
        const stateKey = this.serializeState(state);
        await this.gameStateData.addState(state, turnCount, []);
        gameStates.push({ key: stateKey, turnNumber: turnCount });

        // Record transition from previous state
        if (previousStateKey) {
          this.gameStateData.addTransition(previousStateKey, stateKey, null);
        }
      }

      // Execute turn
      let actionsThisTurn = 0;
      let directionChanges = 0;
      const maxActions = state.actionsRemaining;

      while (
        state.actionsRemaining > 0 &&
        !state.gameOver &&
        actionsThisTurn < maxActions + 5
      ) {
        actionsThisTurn++;

        let action;
        switch (difficulty) {
          case "easy":
            action = this.getEasyAIAction(state, player);
            break;
          case "medium":
            action = this.getMediumAIAction(state, player);
            break;
          case "hard":
            action = this.getHardAIAction(state, player);
            break;
          case "expert":
            action = await this.getExpertAIActionWithInstance(
              state,
              player,
              expertAIs[player]
            );
            break;
          default:
            action = this.getEasyAIAction(state, player);
        }

        if (!action || action.type === "endTurn") {
          break;
        }

        if (action.type === "changeDirection") {
          directionChanges++;
          if (directionChanges > 2) {
            break;
          }
        } else {
          directionChanges = 0;
        }

        state = this.applyAction(state, player, action);
      }

      // Record end-of-turn state for transitions
      if (this.collectData && this.gameStateData) {
        previousStateKey = this.serializeEndOfTurnState(state, player);
      }

      // End turn
      state = this.processTurnEnd(state);
      turnCount++;
    }

    // Handle timeout
    if (!state.gameOver) {
      state.winner = "tie";
    }

    // Update outcomes for all collected states
    if (this.collectData && this.gameStateData && gameStates.length > 0) {
      for (const { key } of gameStates) {
        this.gameStateData.updateOutcome(key, state.winner, turnCount);
      }
      this.gamesCollected++;
      this.statesCollected += gameStates.length;
    }

    return {
      winner: state.winner,
      turns: turnCount,
      statesCollected: gameStates.length,
    };
  }

  // ==================== TOURNAMENT RUNNER ====================

  async runTournament(gamesPerMatchup, progressCallback, options = {}) {
    this.isRunning = true;
    this.shouldCancel = false;

    // Data collection options
    this.collectData = options.collectData || false;
    this.collectFromDifficulties = options.collectFromDifficulties || [
      "hard",
      "expert",
    ];
    this.gamesCollected = 0;
    this.statesCollected = 0;

    // Initialize data collection if enabled
    if (this.collectData) {
      this.gameStateData = new GameStateData();
      await this.gameStateData.init();
    }

    const difficulties = ["easy", "medium", "hard", "expert"];
    const results = {
      matchups: {},
      byDifficulty: {},
      firstPlayerAdvantage: { p1Wins: 0, p2Wins: 0, ties: 0, total: 0 },
      dataCollection: {
        enabled: this.collectData,
        gamesCollected: 0,
        statesCollected: 0,
      },
    };

    // Initialize result structures
    for (const d1 of difficulties) {
      results.byDifficulty[d1] = { wins: 0, losses: 0, ties: 0, total: 0 };
      for (const d2 of difficulties) {
        const key = `${d1}_vs_${d2}`;
        results.matchups[key] = {
          p1Wins: 0,
          p2Wins: 0,
          ties: 0,
          total: 0,
          p1WinsGoingFirst: 0,
          p2WinsGoingFirst: 0,
        };
      }
    }

    const totalGames =
      difficulties.length * difficulties.length * gamesPerMatchup;
    let gamesCompleted = 0;

    // Run all matchups
    for (const p1Diff of difficulties) {
      for (const p2Diff of difficulties) {
        if (this.shouldCancel) break;

        const key = `${p1Diff}_vs_${p2Diff}`;

        // Determine if we should collect data from this matchup
        const shouldCollectFromThisMatchup =
          this.collectData &&
          (this.collectFromDifficulties.includes(p1Diff) ||
            this.collectFromDifficulties.includes(p2Diff));

        // Temporarily enable/disable collection for this matchup
        const originalCollectData = this.collectData;
        this.collectData = shouldCollectFromThisMatchup;

        for (let i = 0; i < gamesPerMatchup; i++) {
          if (this.shouldCancel) break;

          const result = await this.simulateGame(p1Diff, p2Diff);

          // Update matchup results
          results.matchups[key].total++;
          if (result.winner === "p1") {
            results.matchups[key].p1Wins++;
            results.matchups[key].p1WinsGoingFirst++;
            results.byDifficulty[p1Diff].wins++;
            results.byDifficulty[p2Diff].losses++;
            results.firstPlayerAdvantage.p1Wins++;
          } else if (result.winner === "p2") {
            results.matchups[key].p2Wins++;
            results.matchups[key].p2WinsGoingFirst++;
            results.byDifficulty[p2Diff].wins++;
            results.byDifficulty[p1Diff].losses++;
            results.firstPlayerAdvantage.p2Wins++;
          } else {
            results.matchups[key].ties++;
            results.byDifficulty[p1Diff].ties++;
            results.byDifficulty[p2Diff].ties++;
            results.firstPlayerAdvantage.ties++;
          }

          results.byDifficulty[p1Diff].total++;
          results.byDifficulty[p2Diff].total++;
          results.firstPlayerAdvantage.total++;

          gamesCompleted++;

          if (progressCallback && gamesCompleted % 5 === 0) {
            results.dataCollection.gamesCollected = this.gamesCollected;
            results.dataCollection.statesCollected = this.statesCollected;
            progressCallback(gamesCompleted, totalGames, results);
          }

          // Yield to prevent browser freezing
          if (gamesCompleted % 10 === 0) {
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
        }

        // Restore original collect data setting
        this.collectData = originalCollectData;
      }
    }

    // Save collected data to database
    if (this.collectData && this.gameStateData) {
      await this.gameStateData.saveBatch();
      results.dataCollection.gamesCollected = this.gamesCollected;
      results.dataCollection.statesCollected = this.statesCollected;

      // Get total states in database
      const totalStates = await this.gameStateData.getStateCount();
      results.dataCollection.totalStatesInDatabase = totalStates;
    }

    this.isRunning = false;
    return results;
  }

  cancel() {
    this.shouldCancel = true;
  }
}

// Tournament UI initialization
function initializeTournamentMode() {
  const playerSelection = document.getElementById("player-selection");

  const tournamentSection = document.createElement("div");
  tournamentSection.className = "tournament-section";
  tournamentSection.style.marginTop = "30px";
  tournamentSection.innerHTML = `
    <h3>AI Tournament Mode</h3>
    <div class="tournament-controls">
      <div style="margin-bottom: 10px;">
        <label>Games per matchup:</label>
        <input type="number" id="tournament-games" value="10" min="1" max="100" />
      </div>
      
      <div style="margin-bottom: 10px; padding: 10px; background-color: #2a2a3e; border-radius: 4px;">
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input type="checkbox" id="collect-data-checkbox" />
          <span>Collect training data from games</span>
        </label>
        <div id="collect-data-options" style="display: none; margin-top: 10px; padding-left: 20px;">
          <p style="font-size: 12px; color: #aaa; margin-bottom: 8px;">
            Select which AI difficulties to collect data from:
          </p>
          <label style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
            <input type="checkbox" class="collect-difficulty" value="easy" />
            <span>Easy</span>
          </label>
          <label style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
            <input type="checkbox" class="collect-difficulty" value="medium" />
            <span>Medium</span>
          </label>
          <label style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
            <input type="checkbox" class="collect-difficulty" value="hard" checked />
            <span>Hard</span>
          </label>
          <label style="display: flex; align-items: center; gap: 4px;">
            <input type="checkbox" class="collect-difficulty" value="expert" checked />
            <span>Expert</span>
          </label>
        </div>
      </div>
      
      <div style="margin-bottom: 10px;">
        <button id="start-tournament-btn">Start Tournament</button>
        <button id="cancel-tournament-btn" style="display: none; background-color: #ff6666;">Cancel</button>
      </div>
      
      <div id="tournament-progress" style="display: none; margin-top: 10px;">
        <progress id="tournament-progress-bar" max="100" value="0" style="width: 100%;"></progress>
        <span id="tournament-progress-text">0/0 games</span>
        <div id="data-collection-progress" style="display: none; margin-top: 5px; font-size: 12px; color: #8f8;"></div>
      </div>
      
      <div id="tournament-results" style="display: none; margin-top: 20px;">
        <h4>Results</h4>
        
        <div id="data-collection-results" style="display: none; margin-bottom: 15px; padding: 10px; background-color: #1a3a1a; border-radius: 4px;">
          <h5 style="color: #8f8;">📊 Data Collection Summary</h5>
          <div id="data-collection-stats"></div>
        </div>
        
        <div style="margin-bottom: 15px;">
          <h5>First Player Advantage</h5>
          <div id="first-player-stats"></div>
        </div>
        
        <div style="margin-bottom: 15px;">
          <h5>Overall Win Rates by Difficulty</h5>
          <table id="overall-stats-table" class="tournament-table">
            <thead>
              <tr>
                <th>Difficulty</th>
                <th>Wins</th>
                <th>Losses</th>
                <th>Ties</th>
                <th>Win Rate</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
        
        <div style="margin-bottom: 15px;">
          <h5>Head-to-Head Results (Row = P1, Column = P2)</h5>
          <table id="matchup-table" class="tournament-table">
            <thead>
              <tr>
                <th>P1 \\ P2</th>
                <th>Easy</th>
                <th>Medium</th>
                <th>Hard</th>
                <th>Expert</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
        
        <div>
          <h5>Detailed Matchup Stats</h5>
          <div id="detailed-stats"></div>
        </div>
      </div>
    </div>
  `;

  playerSelection.appendChild(tournamentSection);

  // Add styles for tournament tables
  const style = document.createElement("style");
  style.textContent = `
    .tournament-table {
      border-collapse: collapse;
      width: 100%;
      margin: 10px 0;
      font-size: 14px;
    }
    .tournament-table th, .tournament-table td {
      border: 1px solid #444;
      padding: 8px;
      text-align: center;
    }
    .tournament-table th {
      background-color: #333;
    }
    .tournament-table tr:nth-child(even) {
      background-color: #2a2a2a;
    }
    .win-high { background-color: #2d5a27 !important; }
    .win-medium { background-color: #4a4a27 !important; }
    .win-low { background-color: #5a2727 !important; }
    .tournament-section {
      background-color: #1a1a2e;
      padding: 15px;
      border-radius: 8px;
      margin-top: 20px;
    }
    .detailed-matchup {
      background-color: #2a2a3e;
      padding: 10px;
      margin: 5px 0;
      border-radius: 4px;
    }
  `;
  document.head.appendChild(style);

  let tournamentSimulator = null;

  // Toggle data collection options visibility
  document
    .getElementById("collect-data-checkbox")
    .addEventListener("change", (e) => {
      document.getElementById("collect-data-options").style.display = e.target
        .checked
        ? "block"
        : "none";
    });

  // Start tournament button
  document
    .getElementById("start-tournament-btn")
    .addEventListener("click", async () => {
      const gamesPerMatchup = parseInt(
        document.getElementById("tournament-games").value
      );
      if (isNaN(gamesPerMatchup) || gamesPerMatchup < 1) {
        alert("Please enter a valid number of games (1 or more)");
        return;
      }

      const startBtn = document.getElementById("start-tournament-btn");
      const cancelBtn = document.getElementById("cancel-tournament-btn");
      const progressDiv = document.getElementById("tournament-progress");
      const progressBar = document.getElementById("tournament-progress-bar");
      const progressText = document.getElementById("tournament-progress-text");
      const resultsDiv = document.getElementById("tournament-results");
      const dataCollectionProgress = document.getElementById(
        "data-collection-progress"
      );

      startBtn.style.display = "none";
      cancelBtn.style.display = "inline-block";
      progressDiv.style.display = "block";
      resultsDiv.style.display = "none";

      // Get data collection options
      const collectData = document.getElementById(
        "collect-data-checkbox"
      ).checked;
      const collectFromDifficulties = [];

      if (collectData) {
        document
          .querySelectorAll(".collect-difficulty:checked")
          .forEach((cb) => {
            collectFromDifficulties.push(cb.value);
          });
        dataCollectionProgress.style.display = "block";
      } else {
        dataCollectionProgress.style.display = "none";
      }

      tournamentSimulator = new TournamentSimulator();

      const options = {
        collectData,
        collectFromDifficulties,
      };

      const results = await tournamentSimulator.runTournament(
        gamesPerMatchup,
        (current, total, intermediateResults) => {
          const percent = (current / total) * 100;
          progressBar.value = percent;
          progressText.textContent = `${current}/${total} games completed`;

          // Update data collection progress
          if (collectData && intermediateResults.dataCollection) {
            dataCollectionProgress.innerHTML = `
              📊 Collected: ${intermediateResults.dataCollection.gamesCollected} games, 
              ${intermediateResults.dataCollection.statesCollected} states
            `;
          }

          // Update results in real-time
          updateTournamentResults(intermediateResults);
          resultsDiv.style.display = "block";
        },
        options
      );

      startBtn.style.display = "inline-block";
      cancelBtn.style.display = "none";
      progressDiv.style.display = "none";
      resultsDiv.style.display = "block";

      updateTournamentResults(results);

      // Update the data stats display if data was collected
      if (collectData) {
        updateDataStats();
      }
    });

  // Cancel tournament button
  document
    .getElementById("cancel-tournament-btn")
    .addEventListener("click", () => {
      if (tournamentSimulator) {
        tournamentSimulator.cancel();
      }
    });

  function updateTournamentResults(results) {
    // Data collection results
    const dataCollectionResultsDiv = document.getElementById(
      "data-collection-results"
    );
    const dataCollectionStatsDiv = document.getElementById(
      "data-collection-stats"
    );

    if (results.dataCollection && results.dataCollection.enabled) {
      dataCollectionResultsDiv.style.display = "block";
      dataCollectionStatsDiv.innerHTML = `
        <div>Games with data collected: ${
          results.dataCollection.gamesCollected
        }</div>
        <div>Game states recorded: ${
          results.dataCollection.statesCollected
        }</div>
        ${
          results.dataCollection.totalStatesInDatabase
            ? `<div>Total states in database: ${results.dataCollection.totalStatesInDatabase}</div>`
            : ""
        }
      `;
    } else {
      dataCollectionResultsDiv.style.display = "none";
    }

    // First player advantage
    const fpa = results.firstPlayerAdvantage;
    const p1WinRate =
      fpa.total > 0 ? ((fpa.p1Wins / fpa.total) * 100).toFixed(1) : 0;
    const p2WinRate =
      fpa.total > 0 ? ((fpa.p2Wins / fpa.total) * 100).toFixed(1) : 0;
    const tieRate =
      fpa.total > 0 ? ((fpa.ties / fpa.total) * 100).toFixed(1) : 0;

    document.getElementById("first-player-stats").innerHTML = `
      <div>P1 (goes first) wins: ${fpa.p1Wins} (${p1WinRate}%)</div>
      <div>P2 (goes second) wins: ${fpa.p2Wins} (${p2WinRate}%)</div>
      <div>Ties: ${fpa.ties} (${tieRate}%)</div>
      <div>Total games: ${fpa.total}</div>
    `;

    // Overall stats table
    const overallTbody = document.querySelector("#overall-stats-table tbody");
    overallTbody.innerHTML = "";

    const difficulties = ["easy", "medium", "hard", "expert"];
    for (const diff of difficulties) {
      const stats = results.byDifficulty[diff];
      const winRate =
        stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : 0;

      let winClass = "";
      if (winRate >= 60) winClass = "win-high";
      else if (winRate >= 40) winClass = "win-medium";
      else winClass = "win-low";

      overallTbody.innerHTML += `
        <tr>
          <td><strong>${
            diff.charAt(0).toUpperCase() + diff.slice(1)
          }</strong></td>
          <td>${stats.wins}</td>
          <td>${stats.losses}</td>
          <td>${stats.ties}</td>
          <td class="${winClass}">${winRate}%</td>
        </tr>
      `;
    }

    // Matchup table
    const matchupTbody = document.querySelector("#matchup-table tbody");
    matchupTbody.innerHTML = "";

    for (const p1Diff of difficulties) {
      let row = `<tr><td><strong>${
        p1Diff.charAt(0).toUpperCase() + p1Diff.slice(1)
      }</strong></td>`;

      for (const p2Diff of difficulties) {
        const key = `${p1Diff}_vs_${p2Diff}`;
        const matchup = results.matchups[key];

        if (matchup.total > 0) {
          const p1WinRate = ((matchup.p1Wins / matchup.total) * 100).toFixed(0);

          let winClass = "";
          if (p1WinRate >= 60) winClass = "win-high";
          else if (p1WinRate >= 40) winClass = "win-medium";
          else winClass = "win-low";

          row += `<td class="${winClass}">${p1WinRate}%<br><small>(${matchup.p1Wins}-${matchup.p2Wins}-${matchup.ties})</small></td>`;
        } else {
          row += `<td>-</td>`;
        }
      }

      row += `</tr>`;
      matchupTbody.innerHTML += row;
    }

    // Detailed stats
    const detailedDiv = document.getElementById("detailed-stats");
    detailedDiv.innerHTML = "";

    for (const p1Diff of difficulties) {
      for (const p2Diff of difficulties) {
        const key = `${p1Diff}_vs_${p2Diff}`;
        const matchup = results.matchups[key];

        if (matchup.total > 0) {
          const p1WinRate = ((matchup.p1Wins / matchup.total) * 100).toFixed(1);
          const p2WinRate = ((matchup.p2Wins / matchup.total) * 100).toFixed(1);
          const tieRate = ((matchup.ties / matchup.total) * 100).toFixed(1);

          detailedDiv.innerHTML += `
            <div class="detailed-matchup">
              <strong>${p1Diff.toUpperCase()} vs ${p2Diff.toUpperCase()}</strong>
              <div>Games: ${matchup.total} | P1 wins: ${
            matchup.p1Wins
          } (${p1WinRate}%) | P2 wins: ${
            matchup.p2Wins
          } (${p2WinRate}%) | Ties: ${matchup.ties} (${tieRate}%)</div>
            </div>
          `;
        }
      }
    }
  }

  // Function to update data statistics display (reuse from exploration mode)
  async function updateDataStats() {
    const statsDiv = document.getElementById("data-stats");
    if (!statsDiv) return;

    try {
      const db = new GameStateDatabase();
      await db.init();
      const count = await db.getStateCount();

      statsDiv.innerHTML = `<strong>Current database:</strong> ${count} unique states`;
    } catch (error) {
      statsDiv.innerHTML = "<em>No data available</em>";
    }
  }
}

// Initialize tournament mode when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  initializeTournamentMode();
});

// Export for use in Expert AI
window.ExplorationSimulator = ExplorationSimulator;
window.GameStateDatabase = GameStateDatabase;

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
  isFirstTurn: true, // Flag to track if it's the first turn of the game
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

        // Update difficulty options to include Expert
        const select = difficultyDiv.querySelector(".difficulty-select");
        if (!select.querySelector('option[value="expert"]')) {
          const expertOption = document.createElement("option");
          expertOption.value = "expert";
          expertOption.textContent = "Expert";
          select.appendChild(expertOption);
        }
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
    aiProcessingCancelled = true;
    gameState.isProcessingTurn = false;
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
  // Cancel any ongoing AI processing
  aiProcessingCancelled = true;
  gameState.isProcessingTurn = false;

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
    actionsRemaining: 3, // First player's first turn gets 3 actions
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
      p1: 3, // First player's first turn gets 3 actions
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
    isFirstTurn: true, // Track that this is the first turn
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

// Modify processAITurn to include expert difficulty
async function processAITurn() {
  if (gameState.gameOver || playerTypes[gameState.currentPlayer] !== "ai") {
    return;
  }

  gameState.isProcessingTurn = true;
  aiProcessingCancelled = false; // Reset cancellation flag
  const difficulty = aiDifficulty[gameState.currentPlayer];

  // Determine AI behavior based on difficulty
  if (difficulty === "easy") {
    await processEasyAI();
  } else if (difficulty === "medium") {
    await processMediumAI();
  } else if (difficulty === "hard") {
    await processHardAI();
  } else if (difficulty === "expert") {
    await processExpertAI();
  }

  // Only end turn if not cancelled
  if (!aiProcessingCancelled) {
    gameState.isProcessingTurn = false;

    // End turn if not already ended
    if (!gameState.gameOver && gameState.actionsRemaining >= 0) {
      endTurn();
    }
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

// Add new Expert AI processing function
async function processExpertAI() {
  const player = gameState.currentPlayer;
  const expert = new ExpertAI();
  await expert.init();

  expert.transitionCache.clear();

  let realActions = 0;
  let directionChanges = 0;
  const maxDirectionChanges = 2;
  const maxIterations = 20;
  let iterations = 0;
  let lastActionType = null;

  while (
    gameState.actionsRemaining > 0 &&
    !gameState.gameOver &&
    !aiProcessingCancelled &&
    iterations < maxIterations
  ) {
    iterations++;

    const state = expert.convertToSimulatorState(gameState);
    const decision = await expert.getBestAction(
      state,
      player,
      gameState.actionsRemaining
    );

    if (!decision.action || decision.action.type === "endTurn") {
      console.log("Expert AI: Ending turn (no better action found)");
      break;
    }

    const action = decision.action;

    if (action.type === "changeDirection") {
      directionChanges++;
      if (directionChanges > maxDirectionChanges) {
        console.log(
          "Expert AI: Too many direction changes, forcing different action"
        );

        const nonDirAction = decision.sequence.find(
          (a) => a.type !== "changeDirection"
        );
        if (nonDirAction) {
          const success = executeAIAction(nonDirAction, player);
          if (success && nonDirAction.type !== "changeDirection") {
            realActions++;
            directionChanges = 0;
          }
        } else {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, AI_ACTION_DELAY));
        continue;
      }
    } else {
      directionChanges = 0;
    }

    if (lastActionType === action.type && action.type === "changeDirection") {
      console.log("Expert AI: Detected repeated direction change, breaking");
      break;
    }
    lastActionType = action.type;

    const success = executeAIAction(action, player);

    if (success) {
      if (action.type !== "changeDirection") {
        realActions++;
      }
      console.log(`Expert AI: Executed ${action.type}`, action);
    } else {
      console.log(`Expert AI: Action failed: ${action.type}`, action);

      if (decision.sequence.length > 1) {
        for (let i = 1; i < decision.sequence.length; i++) {
          const altAction = decision.sequence[i];
          if (executeAIAction(altAction, player)) {
            if (altAction.type !== "changeDirection") {
              realActions++;
            }
            console.log(
              `Expert AI: Used alternative action: ${altAction.type}`
            );
            break;
          }
        }
      }

      if (realActions === 0 && iterations > 3) {
        const simulator = new ExplorationSimulator();
        const allActions = simulator
          .getAllPossibleActions(state, player)
          .filter((a) => a.type !== "endTurn" && a.type !== "changeDirection");

        for (const fallback of allActions) {
          if (executeAIAction(fallback, player)) {
            realActions++;
            console.log(`Expert AI: Used fallback action: ${fallback.type}`);
            break;
          }
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, AI_ACTION_DELAY));

    if (iterations > 6 && realActions === 0) {
      console.log(
        "Expert AI: No real actions taken after many iterations, ending turn"
      );
      break;
    }
  }

  console.log(
    `Expert AI turn complete: ${realActions} real actions, ${iterations} iterations`
  );
}

function executeAIAction(action, player) {
  switch (action.type) {
    case "move":
      return movePlayerTo(player, action.row, action.col);
    case "changeDirection":
      return changeDirection(player, action.direction);
    case "placeBomb":
      return placeBombInFront();
    case "kick":
    case "kickBomb":
      // Both "kick" and "kickBomb" are handled by kickBombInFront()
      // which checks for players first, then bombs
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

  // Check if can kick player in front (only if there's empty space to move them to)
  if (frontCellType === "p1" || frontCellType === "p2") {
    const direction = gameState.playerDirections[player];
    const offset = getDirectionOffset(direction);
    const kickToRow = front.row + offset.dr;
    const kickToCol = front.col + offset.dc;
    const targetCellType = getCellType(kickToRow, kickToCol);
    const targetHasBomb = findBombAt(kickToRow, kickToCol) !== -1;

    // Can kick player if target is empty floor with no bomb
    if (targetCellType === "f" && !targetHasBomb) {
      actions.push({ type: "kickBomb" }); // Uses same action type, function handles both
    }
  }

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
        // First player's first turn gets 3 actions, otherwise 5
        gameState.highlightActionsRemaining.p1 = gameState.isFirstTurn
          ? 3
          : ACTIONS_PER_TURN;
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

  // Update actionsRemaining to match the current player's highlightActionsRemaining
  if (gameState.currentPlayer === "p1" && gameState.isFirstTurn) {
    gameState.actionsRemaining = 3;
  } else {
    gameState.actionsRemaining = ACTIONS_PER_TURN;
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

// Helper function to kick a player (move them one space away)
function kickPlayerInFront() {
  if (gameState.actionsRemaining <= 0 || gameState.gameOver) {
    return false;
  }

  const front = getFrontCell(gameState.currentPlayer);
  const cellType = getCellType(front.row, front.col);

  // Check if there's a player in front
  const playerToKick =
    cellType === "p1" ? "p1" : cellType === "p2" ? "p2" : null;
  if (!playerToKick) {
    return false; // No player to kick
  }

  // Can't kick yourself
  if (playerToKick === gameState.currentPlayer) {
    return false;
  }

  const direction = gameState.playerDirections[gameState.currentPlayer];
  const offset = getDirectionOffset(direction);

  // Calculate where the player would be kicked to (one space away)
  const kickToRow = front.row + offset.dr;
  const kickToCol = front.col + offset.dc;

  // Check if the target position is valid (empty floor, no bomb, no wall, no player)
  const targetCellType = getCellType(kickToRow, kickToCol);
  const targetHasBomb = findBombAt(kickToRow, kickToCol) !== -1;

  if (
    targetCellType !== "f" ||
    targetHasBomb ||
    targetCellType === "p1" ||
    targetCellType === "p2"
  ) {
    return false; // Can't kick player - no empty space available
  }

  // Move the player to the new position
  const playerPos = gameState.playerPositions[playerToKick];

  // Clear the old position (check if there's a bomb there)
  const oldBombIndex = findBombAt(playerPos.row, playerPos.col);
  if (oldBombIndex !== -1) {
    gameState.grid[playerPos.row][playerPos.col] = "bomb";
  } else {
    gameState.grid[playerPos.row][playerPos.col] = "f";
  }

  // Set the new position
  gameState.grid[kickToRow][kickToCol] = playerToKick;
  gameState.playerPositions[playerToKick] = { row: kickToRow, col: kickToCol };

  // Use action
  useAction();

  // Update highlight origin to current position and recalculate with new remaining actions
  const pos = gameState.playerPositions[gameState.currentPlayer];
  gameState.highlightOrigin[gameState.currentPlayer] = {
    row: pos.row,
    col: pos.col,
  };
  gameState.highlightActionsRemaining[gameState.currentPlayer] =
    gameState.actionsRemaining;

  // Reset move history - can't undo past a player kick
  gameState.moveHistory[gameState.currentPlayer] = [
    { row: pos.row, col: pos.col },
  ];

  // Reset visited spaces when player is kicked - start fresh from current position
  gameState.visitedSpaces[gameState.currentPlayer].clear();
  // Add current position as the new starting visited space
  gameState.visitedSpaces[gameState.currentPlayer].add(`${pos.row},${pos.col}`);

  // Re-render to update highlighting from current position with new remaining actions
  renderGrid();
  return true;
}

// Update kickBombInFront to not use action if bomb can't move
// Also handles kicking players (which takes priority over bombs)
function kickBombInFront() {
  if (gameState.actionsRemaining <= 0 || gameState.gameOver) {
    return false;
  }

  const front = getFrontCell(gameState.currentPlayer);

  // First check if there's a player in front - kick player takes priority
  const cellType = getCellType(front.row, front.col);
  if (cellType === "p1" || cellType === "p2") {
    return kickPlayerInFront();
  }

  // Check if there's a bomb in front of the player
  const bombIndex = findBombAt(front.row, front.col);
  if (bombIndex === -1) {
    return false; // No bomb to kick
  }

  const direction = gameState.playerDirections[gameState.currentPlayer];
  const offset = getDirectionOffset(direction);

  // First, check if there are bombs beyond the bomb in front, with empty space past them
  // If so, we'll kick the farthest bomb instead
  let checkRow = front.row;
  let checkCol = front.col;
  let lastBombFound = null;
  let lastBombIndex = -1;
  let foundEmptySpaceAfterBombs = false;
  let emptySpaceRow = -1;
  let emptySpaceCol = -1;

  // Start checking from the position after the bomb in front
  checkRow = front.row + offset.dr;
  checkCol = front.col + offset.dc;

  // Scan forward to find chain of bombs with empty space at the end
  while (true) {
    const cellType = getCellType(checkRow, checkCol);
    const hasBomb = findBombAt(checkRow, checkCol) !== -1;

    // Stop if we hit a wall or player
    if (cellType === "w" || cellType === "p1" || cellType === "p2") {
      break;
    }

    // If we find a bomb, track it
    if (hasBomb) {
      lastBombFound = { row: checkRow, col: checkCol };
      lastBombIndex = findBombAt(checkRow, checkCol);
      // Continue scanning to find empty space past this bomb
    } else {
      // Found empty space
      // If we've seen bombs before, this is the empty space we're looking for
      if (lastBombFound !== null) {
        // Found empty space after bombs - now find the farthest empty space
        foundEmptySpaceAfterBombs = true;
        emptySpaceRow = checkRow;
        emptySpaceCol = checkCol;

        // Continue scanning to find the farthest empty space we can reach
        let farthestRow = checkRow;
        let farthestCol = checkCol;
        let nextCheckRow = checkRow + offset.dr;
        let nextCheckCol = checkCol + offset.dc;

        while (true) {
          const nextCellType = getCellType(nextCheckRow, nextCheckCol);
          const nextHasBomb = findBombAt(nextCheckRow, nextCheckCol) !== -1;

          // Stop if we hit a wall, player, or another bomb
          if (
            nextCellType === "w" ||
            nextCellType === "p1" ||
            nextCellType === "p2" ||
            nextHasBomb
          ) {
            break;
          }

          // This is valid empty space, update farthest position
          farthestRow = nextCheckRow;
          farthestCol = nextCheckCol;
          nextCheckRow += offset.dr;
          nextCheckCol += offset.dc;
        }

        emptySpaceRow = farthestRow;
        emptySpaceCol = farthestCol;
        break;
      } else {
        // No bombs found yet, just empty space - this is normal case
        break;
      }
    }

    // Move to next position
    checkRow += offset.dr;
    checkCol += offset.dc;
  }

  // If we found bombs with empty space past them, kick the farthest bomb
  if (foundEmptySpaceAfterBombs && lastBombIndex !== -1) {
    // Move the farthest bomb to the empty space
    const bomb = gameState.bombs[lastBombIndex];
    gameState.bombs[lastBombIndex] = {
      row: emptySpaceRow,
      col: emptySpaceCol,
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
    gameState.visitedSpaces[gameState.currentPlayer].add(
      `${pos.row},${pos.col}`
    );

    // Re-render to update highlighting from current position with new remaining actions
    renderGrid();
    return true;
  }

  // Otherwise, use normal bomb kicking logic for the bomb directly in front
  // Check if bomb can actually be kicked
  if (!canBombBeKicked(front.row, front.col, direction)) {
    return false; // Don't use action if bomb can't move
  }

  // Move bomb as far as possible in the direction
  let currentRow = front.row;
  let currentCol = front.col;

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

  // After the first turn ends, all subsequent turns get the normal number of actions
  if (gameState.isFirstTurn) {
    gameState.isFirstTurn = false;
  }
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

  // Check if clicking on bomb or player in front - kick it/them
  const front = getFrontCell(player);
  if (row === front.row && col === front.col) {
    const frontCellType = getCellType(row, col);
    if (frontCellType === "p1" || frontCellType === "p2") {
      // Try to kick the player
      kickBombInFront(); // This function now handles both players and bombs
    } else if (findBombAt(row, col) !== -1) {
      kickBombInFront();
    } else if (frontCellType === "f") {
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
