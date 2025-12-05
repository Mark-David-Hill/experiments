# Grid Game Prototype

A turn-based tactical game where two players compete on a grid-based arena using different character abilities. Players can be human-controlled or AI-controlled with three difficulty levels.

## Game Overview

Two players take turns moving around a 7x7 grid arena, using their character's unique abilities to defeat their opponent. The game combines strategic positioning, resource management (actions per turn), and tactical use of bombs or ice blocks.

## Characters

### 💣 Bomber

- **Ability**: Places bombs that explode after 4 turns
- **Bomb Behavior**:
  - Explosions travel in all 4 cardinal directions until hitting a wall
  - Explosions trigger chain reactions with other bombs
  - Explosions instantly kill any player caught in the blast
  - Explosions destroy ice blocks (but don't stop at them)
- **Strategy**: Control space with bomb placement, trap opponents, use chain reactions

### 🧊 Freezer

- **Ability**: Places ice blocks with 6 health
- **Ice Block Behavior**:
  - Loses 1 health per turn (melting)
  - Can be kicked by any player
  - When kicked, travels until hitting an obstacle
  - Loses 1 health when colliding with walls, bombs, players, or other ice
  - Deals 1 damage to players on collision
  - Deals 1 damage to other ice blocks on collision (both ice blocks take damage)
  - Destroyed by bomb explosions
- **Strategy**: Aggressive positioning, kick ice at opponents, block paths

## Game Mechanics

### Turn Structure

- First player's first turn: 3 actions
- All subsequent turns: 5 actions
- Actions are consumed by:
  - Moving one space (1 action)
  - Placing a bomb/ice block (1 action)
  - Kicking an object (1 action)
- Free actions (no cost):
  - Changing direction
  - Ending turn early

### Movement

- Players can move to adjacent empty floor tiles
- Cannot move through walls, other players, bombs, or ice blocks
- Movement can be undone by clicking the previous position (restores the action)
- Highlighted spaces show reachable positions based on remaining actions

### Kicking Mechanics

- Players can kick bombs, ice blocks, or other players
- Objects are kicked in the direction the player is facing
- **Chain Kicking**: If multiple bombs/ice blocks are in a line with empty space at the end, kicking moves the furthest object in the chain
- Kicked players move one space (if space is empty)
- Kicked ice blocks travel until hitting an obstacle, then take damage

### Health System

- Players have 5 health points
- Ice block collision: -1 HP
- Bomb explosion: Instant death
- Game ends when a player reaches 0 HP or is caught in an explosion

### Win Conditions

- Opponent dies from bomb explosion
- Opponent's health reaches 0
- Tie if both players die simultaneously

## Controls

### Keyboard

- **Arrow Keys**: Change direction (first press) / Move forward (second press in same direction)
- **Spacebar**: Place object in front OR kick object/player in front
- **Enter**: End turn early

### Mouse

- **Click highlighted space**: Move to that position
- **Click previous position**: Undo move (restores action)
- **Click space in front**: Place or kick object

## AI Difficulty Levels

### Easy

- Random action selection
- No strategic planning
- Will kick objects when stuck

### Medium

- Prioritizes safety from bomb explosions
- Seeks safe positions when threatened
- Filters actions to maintain safety
- Basic defensive play

### Hard

- Considers chain reactions when evaluating safety
- Offensive play: actively tries to threaten opponent
- **Bomber**: Places bombs to limit opponent's escape routes, uses chain reactions
- **Freezer**:
  - Actively seeks ice kick opportunities
  - Positions for direct hits on opponent
  - Evaluates multi-action attack sequences (move → place → kick)
  - Prioritizes closing distance to opponent
  - Considers opponent's health when evaluating attacks

## Technical Architecture

### File Structure

├── index.html # Game structure and UI elements
├── styles.css # All styling including animations
├── app.js # Game logic, AI, and rendering
└── README.md # This file

### Key State Objects

#### `gameState`

```javascript
{
  currentPlayer: "p1" | "p2",
  actionsRemaining: number,
  playerPositions: { p1: {row, col}, p2: {row, col} },
  playerHealth: { p1: number, p2: number },
  playerDirections: { p1: direction, p2: direction },
  moveHistory: { p1: [{row, col}], p2: [{row, col}] },
  highlightOrigin: { p1: {row, col}, p2: {row, col} },
  highlightActionsRemaining: { p1: number, p2: number },
  visitedSpaces: { p1: Set, p2: Set },
  bombs: [{row, col, timer}],
  iceBlocks: [{row, col, health}],
  grid: 2D array,
  gameOver: boolean,
  winner: "p1" | "p2" | "tie" | null,
  isProcessingTurn: boolean,
  isFirstTurn: boolean
}
characterTypes
javascript
{
  p1: "bomber" | "freezer",
  p2: "bomber" | "freezer"
}
playerTypes
javascript
{
  p1: "human" | "ai",
  p2: "human" | "ai"
}
aiDifficulty
javascript
{
  p1: "easy" | "medium" | "hard",
  p2: "easy" | "medium" | "hard"
}
Key Functions
Game Flow
initializePlayerSelection(): Sets up the player/character selection screen
startGame(): Initializes game state and begins play
endTurn(): Handles turn transition, bomb timers, ice melting
useAction(): Decrements action counter, triggers turn end if needed
Movement & Actions
movePlayerTo(player, row, col): Handles player movement with undo support
placeObjectInFront(): Places bomb or ice based on character type
kickObjectInFront(): Kicks bombs, ice, or players; handles chain kicking
getValidMoves(player): Returns adjacent valid move positions
getReachableWithinMoves(player, maxMoves, origin): BFS for all reachable positions
Chain Kicking System
canChainBeKicked(startRow, startCol, direction): Checks if chain has empty space at end
findChainEnd(startRow, startCol, direction): Finds last object and target position
hasKickableObjectAt(row, col): Checks for bomb or ice at position
Bomb System
getExplosionRange(bombRow, bombCol): Calculates all cells affected by explosion
getAllThreatenedCells(turnsInFuture): Gets all cells threatened by bombs
calculateExplosionCells(row, col): Builds explosion cell list with chain reactions
animateExplosions(initialBombs): Handles explosion animation and chain reactions
checkPlayerHits(explosionCells): Determines if players were hit
AI System
processAITurn(): Main AI entry point, delegates to difficulty-specific functions
processEasyAI(): Random action selection
processMediumAI(): Safety-focused play
processHardAI(): Offensive + defensive play
getAvailableAIActions(player): Returns all valid actions for AI
evaluateOffensiveMove(action, player): Scores actions for offensive potential
findImmediateIceAttack(player): Finds ice attack sequences (Hard AI Freezer)
isSafePosition(row, col, turnsInFuture): Checks if position is safe from bombs
willBeSafeAfterAction(player, actionType, pos, remaining): Simulates action safety
findSafePositions(fromRow, fromCol, maxMoves): Finds reachable safe positions
Rendering
renderGrid(): Main grid rendering function
renderGridWithExplosions(activeExplosions): Renders during explosion animation
renderCellContent(cell, row, col, cellType, hasBomb, hasIce): Helper for cell content
updateUI(): Updates turn info, actions, health display
Grid Layout
javascript
const gridLayout = [
  ["w", "w", "w", "w", "w", "w", "w"],
  ["w", "p1", "f", "f", "f", "f", "w"],
  ["w", "f", "w", "f", "w", "f", "w"],
  ["w", "f", "f", "f", "f", "f", "w"],
  ["w", "f", "w", "f", "w", "f", "w"],
  ["w", "f", "f", "f", "f", "p2", "w"],
  ["w", "w", "w", "w", "w", "w", "w"],
];
// w = wall, f = floor, p1 = player 1 start, p2 = player 2 start
Constants
javascript
const GRID_SIZE = 7;
const ACTIONS_PER_TURN = 5;
const AI_ACTION_DELAY = 500;        // ms between AI actions
const PLAYER_MAX_HEALTH = 5;
const ICE_BLOCK_MAX_HEALTH = 6;
const ICE_BLOCK_DAMAGE = 1;
Known Issues & Future Improvements
Potential Enhancements
Additional Characters: Framework supports adding more character types
Larger Maps: Grid size is configurable via GRID_SIZE constant
Power-ups: Could add collectible items on the grid
Spectator Mode: Watch AI vs AI matches
Move Preview: Show where kicked objects would land
Sound Effects: Audio feedback for actions
Mobile Support: Touch controls for mobile devices
Balance Considerations
Freezer may need tuning against Bomber (ice melts, bombs are permanent threat)
Hard AI Freezer aggression could be further improved
Chain kicking mechanics add interesting depth but may need refinement
Code Architecture Notes
Bombs and ice blocks are tracked separately from the grid array
The grid array only stores: walls ("w"), floors ("f"), and players ("p1"/"p2")
Movement undo system uses moveHistory to track positions
highlightOrigin and highlightActionsRemaining are used to show reachable spaces from turn start (resets on bomb/ice placement)
visitedSpaces tracks where player has been this turn for visual feedback
Development Notes
Adding a New Character Type
Add character option to characterTypes object
Add UI buttons in HTML with data-character attribute
Update placeObjectInFront() to handle new object type
Create object tracking array in gameState (like bombs or iceBlocks)
Update isObstacle() and hasKickableObjectAt() if applicable
Add rendering logic in renderCellContent()
Update AI evaluation functions for new character
Adding AI Behaviors
Difficulty-specific logic goes in processEasyAI(), processMediumAI(), or processHardAI()
Use getAvailableAIActions() to get valid actions
Use evaluateOffensiveMove() for scoring offensive potential
Use isSafePosition() and willBeSafeAfterAction() for safety checks
Character-specific AI logic can check characterTypes[player]
Styling Notes
Player 1: Blue theme (#4a90e2)
Player 2: Orange theme (#e2a44a) - chosen for visibility over red
Current player has white glow animation
Bombs pulse when timer ≤ 2
Ice blocks have inner glow effect
Explosions animate from yellow → orange → red
```
