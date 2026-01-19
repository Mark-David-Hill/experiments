// Global game instance
let game: Game;

// Faction selection logic
const player1Factions: Faction[] = [];
const player2Factions: Faction[] = [];

document.addEventListener('DOMContentLoaded', () => {
    // Setup faction selection
    document.querySelectorAll('.faction-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const button = e.target as HTMLElement;
            const player = button.dataset.player!;
            const faction = button.dataset.faction as Faction;

            const playerFactions = player === '1' ? player1Factions : player2Factions;

            if (button.classList.contains('selected')) {
                // Deselect
                button.classList.remove('selected');
                const index = playerFactions.indexOf(faction);
                if (index > -1) {
                    playerFactions.splice(index, 1);
                }
            } else {
                // Select (max 2)
                if (playerFactions.length < 2) {
                    button.classList.add('selected');
                    playerFactions.push(faction);
                }
            }

            // Update start button
            const startBtn = document.getElementById('start-game-btn') as HTMLButtonElement;
            startBtn.disabled = !(player1Factions.length === 2 && player2Factions.length === 2);
        });
    });

    // Setup start game button
    document.getElementById('start-game-btn')!.addEventListener('click', () => {
        document.getElementById('faction-selection')!.style.display = 'none';
        document.getElementById('game-board')!.style.display = 'block';

        game = new Game();
        game.setupGame(player1Factions, player2Factions);
    });

    // Setup end turn button
    document.getElementById('end-turn-btn')!.addEventListener('click', () => {
        if (game && !game.gameOver) {
            game.endTurn();
        }
    });
});