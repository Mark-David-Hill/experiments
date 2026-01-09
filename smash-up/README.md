# Smash Up Card Game

A digital implementation of the popular card game Smash Up, where players combine two factions to create a unique deck and compete to break bases and score victory points.

## How to Play

### Setup

1. **Choose Factions**: Each player selects two factions from the available options:
   - **Aliens**: Specialize in returning minions to hand and movement
   - **Zombies**: Excel at playing minions from the discard pile
   - **Pirates**: Focus on movement and destroying minions
   - **Ninjas**: Masters of stealth, destruction, and surprise attacks

2. **Start Game**: Once both players have selected two factions, click "Start Game"

### Gameplay

- **Deck Building**: Each player's deck consists of all minions and actions from their two chosen factions (20 cards total)
- **Victory Condition**: First player to reach **15 victory points** wins

### Turn Structure

Each turn consists of two phases:

1. **Draw Phase** (Automatic): Draw 2 cards
2. **Play Phase**: Play cards from your hand

### Playing Cards

#### Minions
- **Power**: Adds power to a base
- **Play**: Select a minion and choose which base to play it on
- **Abilities**: Many minions have special abilities that activate when played

#### Actions
- **One-Time Effects**: Actions are played directly from your hand
- **Abilities**: Actions provide various effects like drawing cards, moving minions, or destroying opponents' minions

### Bases

- **Breakpoints**: Each base has a breakpoint (total power needed to break it)
- **Victory Points**: When a base breaks, players with the most power receive:
  - **1st Place**: 4-5 VP (varies by base)
  - **2nd Place**: 2-3 VP
  - **3rd Place**: 1 VP
- **Ties**: If players tie for a position, they split the VP for those positions
- **Replacement**: When a base breaks, it's immediately replaced with a new base from the available pool

### Rules

- **Hand Limit**: Maximum 10 cards in hand (excess cards are discarded)
- **Deck Depletion**: If your deck runs out, shuffle your discard pile to form a new deck
- **Base Abilities**: Some bases have ongoing abilities that affect gameplay

### Strategy Tips

1. **Balance Power**: Don't just focus on one base - spread your minions strategically
2. **Timing**: Know when to commit to breaking a base vs. holding back
3. **Faction Synergy**: Learn how your two factions work together
4. **Card Advantage**: Use actions that draw cards to maintain card advantage
5. **Disruption**: Use abilities that destroy, move, or return opponent minions to slow them down

## Technical Notes

This is a simplified implementation of Smash Up. Some complex card abilities are simplified for playability. The core mechanics (deck building, base breaking, scoring) are fully functional.

## Files

- `index.html` - Main game interface
- `app.js` - Game logic and state management
- `game-data.js` - Faction, minion, action, and base data
- `styles.css` - Game styling and layout

## Future Enhancements

Potential improvements for a more complete implementation:
- Full implementation of all card abilities
- More factions
- Base ability interactions
- Card targeting UI for complex abilities
- Animation and visual feedback
- Save/load game state
- AI opponent

Enjoy playing Smash Up!
