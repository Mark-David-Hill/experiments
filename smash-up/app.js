// Smash Up Game Logic

let gameState = {
    players: {
        p1: {
            name: "Player 1",
            factions: [],
            deck: [],
            hand: [],
            discard: [],
            score: 0
        },
        p2: {
            name: "Player 2",
            factions: [],
            deck: [],
            hand: [],
            discard: [],
            score: 0
        }
    },
    currentPlayer: "p1",
    turnPhase: "play", // "play" or "draw"
    bases: [],
    gameOver: false,
    winner: null
};

const HAND_LIMIT = 10;
const CARDS_PER_TURN = 2;

// Initialize the game
function init() {
    setupFactionSelection();
    setupEventListeners();
}

function setupFactionSelection() {
    const factionKeys = Object.keys(FACTIONS);
    
    // Create faction buttons for both players
    [1, 2].forEach(playerNum => {
        const container = document.getElementById(`player${playerNum}-factions`);
        const selectedContainer = document.getElementById(`player${playerNum}-selected`);
        
        factionKeys.forEach(factionKey => {
            const faction = FACTIONS[factionKey];
            const btn = document.createElement('button');
            btn.className = 'faction-btn';
            btn.textContent = faction.name;
            btn.style.backgroundColor = faction.color;
            btn.dataset.faction = factionKey;
            btn.dataset.player = playerNum;
            
            btn.addEventListener('click', () => selectFaction(playerNum, factionKey, btn));
            container.appendChild(btn);
        });
    });
    
    updateStartButton();
}

function selectFaction(playerNum, factionKey, button) {
    const player = gameState.players[`p${playerNum}`];
    
    if (player.factions.length >= 2) {
        // Remove first faction and add new one
        const removed = player.factions.shift();
        const oldBtn = document.querySelector(`[data-faction="${removed}"][data-player="${playerNum}"]`);
        if (oldBtn) oldBtn.classList.remove('selected');
    }
    
    if (!player.factions.includes(factionKey)) {
        player.factions.push(factionKey);
        button.classList.add('selected');
    } else {
        // Deselect
        player.factions = player.factions.filter(f => f !== factionKey);
        button.classList.remove('selected');
    }
    
    updateSelectedFactions(playerNum);
    updateStartButton();
}

function updateSelectedFactions(playerNum) {
    const container = document.getElementById(`player${playerNum}-selected`);
    const player = gameState.players[`p${playerNum}`];
    container.innerHTML = '';
    
    player.factions.forEach(factionKey => {
        const faction = FACTIONS[factionKey];
        const badge = document.createElement('div');
        badge.className = 'selected-faction-badge';
        badge.textContent = faction.name;
        badge.style.backgroundColor = faction.color;
        container.appendChild(badge);
    });
}

function updateStartButton() {
    const btn = document.getElementById('start-game-btn');
    const p1Ready = gameState.players.p1.factions.length === 2;
    const p2Ready = gameState.players.p2.factions.length === 2;
    btn.disabled = !(p1Ready && p2Ready);
}

function setupEventListeners() {
    document.getElementById('start-game-btn').addEventListener('click', startGame);
    document.getElementById('end-turn-btn').addEventListener('click', endTurn);
    document.getElementById('new-game-btn').addEventListener('click', resetGame);
    document.querySelector('.close-modal').addEventListener('click', () => {
        document.getElementById('card-modal').classList.add('hidden');
    });
}

function startGame() {
    // Hide faction selection, show game screen
    document.getElementById('faction-selection').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    
    // Build decks for each player
    Object.keys(gameState.players).forEach(playerKey => {
        const player = gameState.players[playerKey];
        player.deck = [];
        
        // Add all minions and actions from both factions
        player.factions.forEach(factionKey => {
            const faction = FACTIONS[factionKey];
            
            // Add minions
            faction.minions.forEach(minion => {
                player.deck.push({
                    type: 'minion',
                    faction: factionKey,
                    ...minion
                });
            });
            
            // Add actions
            faction.actions.forEach(action => {
                player.deck.push({
                    type: 'action',
                    faction: factionKey,
                    ...action
                });
            });
        });
        
        // Shuffle deck
        shuffleArray(player.deck);
        
        // Draw starting hand (5 cards)
        for (let i = 0; i < 5; i++) {
            drawCard(playerKey);
        }
    });
    
    // Set up bases (3 random bases)
    setupBases();
    
    // Start with player 1
    gameState.currentPlayer = "p1";
    gameState.turnPhase = "draw";
    
    updateUI();
    processDrawPhase();
}

function setupBases() {
    gameState.bases = [];
    const shuffledBases = [...BASES];
    shuffleArray(shuffledBases);
    
    // Select 3 bases
    for (let i = 0; i < 3; i++) {
        gameState.bases.push({
            ...shuffledBases[i],
            minions: {
                p1: [],
                p2: []
            },
            totalPower: 0,
            broken: false
        });
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function drawCard(playerKey) {
    const player = gameState.players[playerKey];
    
    if (player.deck.length === 0) {
        // Reshuffle discard into deck
        if (player.discard.length > 0) {
            player.deck = [...player.discard];
            shuffleArray(player.deck);
            player.discard = [];
        } else {
            return null; // No cards to draw
        }
    }
    
    const card = player.deck.shift();
    player.hand.push(card);
    
    // Enforce hand limit
    if (player.hand.length > HAND_LIMIT) {
        const discarded = player.hand.pop();
        player.discard.push(discarded);
    }
    
    return card;
}

function processDrawPhase() {
    const player = gameState.players[gameState.currentPlayer];
    
    // Draw 2 cards
    for (let i = 0; i < CARDS_PER_TURN; i++) {
        drawCard(gameState.currentPlayer);
    }
    
    gameState.turnPhase = "play";
    updateUI();
}

function endTurn() {
    if (gameState.turnPhase !== "play") return;
    
    // Check for game over
    if (gameState.players.p1.score >= WINNING_SCORE || gameState.players.p2.score >= WINNING_SCORE) {
        endGame();
        return;
    }
    
    // Switch to next player
    gameState.currentPlayer = gameState.currentPlayer === "p1" ? "p2" : "p1";
    gameState.turnPhase = "draw";
    
    updateUI();
    processDrawPhase();
}

function playCard(cardIndex, baseIndex = null) {
    const player = gameState.players[gameState.currentPlayer];
    
    if (gameState.turnPhase !== "play") return;
    if (cardIndex >= player.hand.length) return;
    
    const card = player.hand[cardIndex];
    
    if (card.type === 'minion') {
        if (baseIndex === null || baseIndex >= gameState.bases.length) return;
        
        playMinion(card, baseIndex, cardIndex);
    } else if (card.type === 'action') {
        playAction(card, cardIndex, baseIndex);
    }
}

function playMinion(card, baseIndex, handIndex) {
    const player = gameState.players[gameState.currentPlayer];
    const base = gameState.bases[baseIndex];
    
    if (base.broken) return;
    
    // Remove from hand and add to base
    player.hand.splice(handIndex, 1);
    base.minions[gameState.currentPlayer].push(card);
    
    // Update base power
    updateBasePower(base);
    
    // Process minion ability (simplified - many abilities need special handling)
    processMinionAbility(card, baseIndex);
    
    // Check if base breaks
    checkBaseBreak(baseIndex);
    
    // Discard if hand is empty (for some abilities that draw cards)
    updateUI();
}

function playAction(card, handIndex, targetBaseIndex = null) {
    const player = gameState.players[gameState.currentPlayer];
    
    // Remove from hand
    player.hand.splice(handIndex, 1);
    
    // Process action ability (simplified - many abilities need UI prompts)
    processActionAbility(card, targetBaseIndex);
    
    // Add to discard
    player.discard.push(card);
    
    updateUI();
}

function processMinionAbility(card, baseIndex) {
    // Simplified ability processing - in a full implementation, 
    // this would handle all special abilities with UI prompts
    if (!card.ability) return;
    
    const base = gameState.bases[baseIndex];
    const player = gameState.players[gameState.currentPlayer];
    
    // Handle some basic abilities automatically
    if (card.ability.includes("Draw a card")) {
        drawCard(gameState.currentPlayer);
    }
    
    if (card.ability.includes("Play an extra minion")) {
        // Flag for extra minion play (simplified)
    }
    
    // Many abilities would require user input in a full implementation
}

function processActionAbility(card, targetBaseIndex) {
    // Simplified action processing
    const player = gameState.players[gameState.currentPlayer];
    
    if (card.ability.includes("Draw")) {
        const drawCount = card.ability.match(/Draw (\d+)/);
        if (drawCount) {
            for (let i = 0; i < parseInt(drawCount[1]); i++) {
                drawCard(gameState.currentPlayer);
            }
        } else if (card.ability.includes("Draw a card")) {
            drawCard(gameState.currentPlayer);
        }
    }
    
    if (card.ability.includes("Play an extra")) {
        // Flag for extra plays (simplified)
    }
    
    // Many action abilities would require UI prompts in a full implementation
}

function updateBasePower(base) {
    let totalPower = 0;
    
    Object.keys(base.minions).forEach(playerKey => {
        base.minions[playerKey].forEach(minion => {
            totalPower += minion.power;
        });
    });
    
    // Apply base ability modifiers
    if (base.ability && base.ability.includes("+1 power")) {
        totalPower += Object.keys(base.minions).reduce((sum, key) => 
            sum + base.minions[key].length, 0);
    }
    
    base.totalPower = totalPower;
}

function checkBaseBreak(baseIndex) {
    const base = gameState.bases[baseIndex];
    
    if (base.broken) return;
    if (base.totalPower >= base.breakpoint) {
        scoreBase(baseIndex);
    }
}

function scoreBase(baseIndex) {
    const base = gameState.bases[baseIndex];
    base.broken = true;
    
    // Calculate power for each player
    const powerScores = {
        p1: 0,
        p2: 0
    };
    
    Object.keys(base.minions).forEach(playerKey => {
        base.minions[playerKey].forEach(minion => {
            powerScores[playerKey] += minion.power;
        });
    });
    
    // Sort players by power (descending), filter out players with 0 power
    const sorted = Object.entries(powerScores)
        .filter(([playerKey, power]) => power > 0)
        .sort((a, b) => b[1] - a[1]);
    
    // Award VP based on rankings
    if (sorted.length === 0) {
        // No one has power - no points awarded
        return;
    } else if (sorted.length === 1) {
        // Only one player has power
        gameState.players[sorted[0][0]].score += base.vp1;
    } else {
        // Two players - check for tie
        if (sorted[0][1] === sorted[1][1]) {
            // Tie for first - split vp1 and vp2
            const totalVP = base.vp1 + base.vp2;
            gameState.players[sorted[0][0]].score += Math.floor(totalVP / 2);
            gameState.players[sorted[1][0]].score += Math.ceil(totalVP / 2);
        } else {
            // First place gets vp1, second place gets vp2
            gameState.players[sorted[0][0]].score += base.vp1;
            gameState.players[sorted[1][0]].score += base.vp2;
        }
    }
    
    // Move minions to discard
    Object.keys(base.minions).forEach(playerKey => {
        const player = gameState.players[playerKey];
        base.minions[playerKey].forEach(minion => {
            player.discard.push(minion);
        });
        base.minions[playerKey] = [];
    });
    
    // Replace base with new one
    let availableBases = BASES.filter(b => 
        !gameState.bases.some(existing => existing.name === b.name && !existing.broken)
    );
    
    // If all bases have been used, reset the pool (excluding current broken base)
    if (availableBases.length === 0) {
        availableBases = BASES.filter(b => b.name !== base.name);
    }
    
    if (availableBases.length > 0) {
        shuffleArray(availableBases);
        const newBase = {
            ...availableBases[0],
            minions: { p1: [], p2: [] },
            totalPower: 0,
            broken: false
        };
        gameState.bases[baseIndex] = newBase;
    }
    
    // Check for game over
    if (gameState.players.p1.score >= WINNING_SCORE || gameState.players.p2.score >= WINNING_SCORE) {
        endGame();
    }
    
    updateUI();
}

function updateUI() {
    // Update scores
    document.getElementById('player1-score').textContent = gameState.players.p1.score;
    document.getElementById('player2-score').textContent = gameState.players.p2.score;
    
    // Update current player and phase
    document.getElementById('current-player-name').textContent = 
        gameState.players[gameState.currentPlayer].name;
    document.getElementById('turn-phase').textContent = 
        gameState.turnPhase === "draw" ? "Draw Cards" : "Play Cards";
    
    // Update deck counts
    document.getElementById('player1-deck-count').textContent = gameState.players.p1.deck.length;
    document.getElementById('player2-deck-count').textContent = gameState.players.p2.deck.length;
    document.getElementById('player1-discard-count').textContent = gameState.players.p1.discard.length;
    document.getElementById('player2-discard-count').textContent = gameState.players.p2.discard.length;
    
    // Render bases
    renderBases();
    
    // Render hands
    renderHands();
}

function renderBases() {
    const container = document.getElementById('bases');
    container.innerHTML = '';
    
    gameState.bases.forEach((base, index) => {
        const baseCard = document.createElement('div');
        baseCard.className = `base-card ${base.broken ? 'broken' : ''}`;
        
        let minionsHTML = '';
        ['p1', 'p2'].forEach(playerKey => {
            base.minions[playerKey].forEach((minion, minionIndex) => {
                const faction = FACTIONS[minion.faction];
                minionsHTML += `
                    <div class="base-minion" style="border-left: 4px solid ${faction.color}">
                        <div class="minion-name">${minion.name}</div>
                        <div class="minion-power">Power: ${minion.power}</div>
                        ${minion.ability ? `<div class="minion-ability">${minion.ability}</div>` : ''}
                    </div>
                `;
            });
        });
        
        baseCard.innerHTML = `
            <div class="base-header">
                <h4>${base.name}</h4>
                <div class="base-breakpoint">
                    Power: ${base.totalPower} / ${base.breakpoint}
                </div>
            </div>
            ${base.ability ? `<div class="base-ability">${base.ability}</div>` : ''}
            <div class="base-minions">
                ${minionsHTML || '<div class="no-minions">No minions here</div>'}
            </div>
            ${!base.broken ? `<div class="base-vp">
                1st: ${base.vp1} VP | 2nd: ${base.vp2} VP | 3rd: ${base.vp3} VP
            </div>` : '<div class="base-vp broken-label">BROKEN</div>'}
        `;
        
        container.appendChild(baseCard);
    });
}

function renderHands() {
    ['p1', 'p2'].forEach(playerKey => {
        const playerNum = playerKey === 'p1' ? '1' : '2';
        const container = document.getElementById(`player${playerNum}-hand`);
        if (!container) {
            console.error(`Container not found: player${playerNum}-hand`);
            return;
        }
        const player = gameState.players[playerKey];
        const isCurrentPlayer = playerKey === gameState.currentPlayer;
        
        container.innerHTML = '';
        container.className = `hand-container ${isCurrentPlayer ? 'current-player' : ''}`;
        
        player.hand.forEach((card, index) => {
            const cardElement = document.createElement('div');
            const faction = FACTIONS[card.faction];
            
            cardElement.className = `hand-card ${card.type} ${isCurrentPlayer ? 'playable' : ''}`;
            cardElement.style.borderLeft = `4px solid ${faction.color}`;
            
            cardElement.innerHTML = `
                <div class="card-header">
                    <span class="card-faction">${faction.name}</span>
                    ${card.type === 'minion' ? `<span class="card-power">Power: ${card.power}</span>` : ''}
                </div>
                <div class="card-name">${card.name}</div>
                ${card.ability ? `<div class="card-ability">${card.ability}</div>` : ''}
            `;
            
            if (isCurrentPlayer && gameState.turnPhase === "play") {
                cardElement.classList.add('clickable');
                
                if (card.type === 'minion') {
                    // Add base selection buttons
                    const baseButtons = document.createElement('div');
                    baseButtons.className = 'base-buttons';
                    gameState.bases.forEach((base, baseIndex) => {
                        if (!base.broken) {
                            const btn = document.createElement('button');
                            btn.className = 'btn-base-select';
                            btn.textContent = `Play on ${base.name}`;
                            btn.onclick = (e) => {
                                e.stopPropagation();
                                playCard(index, baseIndex);
                            };
                            baseButtons.appendChild(btn);
                        }
                    });
                    cardElement.appendChild(baseButtons);
                } else {
                    // Action card - play directly
                    cardElement.onclick = () => playCard(index);
                }
            }
            
            container.appendChild(cardElement);
        });
        
        if (player.hand.length === 0) {
            container.innerHTML = '<div class="empty-hand">No cards in hand</div>';
        }
    });
}

function showCardDetail(card) {
    const modal = document.getElementById('card-modal');
    const detail = document.getElementById('card-detail');
    const faction = FACTIONS[card.faction];
    
    detail.innerHTML = `
        <div class="card-detail-view" style="border-left: 4px solid ${faction.color}">
            <div class="card-header">
                <span class="card-faction">${faction.name}</span>
                ${card.type === 'minion' ? `<span class="card-power">Power: ${card.power}</span>` : ''}
            </div>
            <div class="card-name">${card.name}</div>
            <div class="card-type">${card.type.toUpperCase()}</div>
            ${card.ability ? `<div class="card-ability">${card.ability}</div>` : ''}
        </div>
    `;
    
    modal.classList.remove('hidden');
}

function endGame() {
    gameState.gameOver = true;
    
    const p1Score = gameState.players.p1.score;
    const p2Score = gameState.players.p2.score;
    
    let winnerText = '';
    if (p1Score > p2Score) {
        winnerText = `${gameState.players.p1.name} wins with ${p1Score} points!`;
        gameState.winner = 'p1';
    } else if (p2Score > p1Score) {
        winnerText = `${gameState.players.p2.name} wins with ${p2Score} points!`;
        gameState.winner = 'p2';
    } else {
        winnerText = `Tie game! Both players scored ${p1Score} points!`;
        gameState.winner = 'tie';
    }
    
    document.getElementById('winner-announcement').textContent = winnerText;
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.remove('hidden');
}

function resetGame() {
    // Reset game state
    gameState = {
        players: {
            p1: {
                name: "Player 1",
                factions: [],
                deck: [],
                hand: [],
                discard: [],
                score: 0
            },
            p2: {
                name: "Player 2",
                factions: [],
                deck: [],
                hand: [],
                discard: [],
                score: 0
            }
        },
        currentPlayer: "p1",
        turnPhase: "play",
        bases: [],
        gameOver: false,
        winner: null
    };
    
    // Reset UI
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('faction-selection').classList.remove('hidden');
    
    // Clear selected factions
    document.querySelectorAll('.faction-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    document.getElementById('player1-selected').innerHTML = '';
    document.getElementById('player2-selected').innerHTML = '';
    updateStartButton();
}

// Initialize when page loads
window.addEventListener('DOMContentLoaded', init);
