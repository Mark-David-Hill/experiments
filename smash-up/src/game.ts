class Game {
  players: Player[] = [];
  bases: Base[] = [];
  currentPlayerIndex: number = 0;
  minionsPlayedThisTurn: number = 0;
  actionsPlayedThisTurn: number = 0;
  maxMinionsPerTurn: number = 1;
  maxActionsPerTurn: number = 1;
  draggedCard: Card | null = null;
  draggedFromPlayer: number | null = null;
  gameOver: boolean = false;
  effectsManager: EffectsManager;
  ui: UIManager;
  minionsPlayedThisPhase: boolean = false; // Track for Ninja Acolyte

  constructor() {
      this.effectsManager = new EffectsManager();
      this.ui = new UIManager(this);
  }

  setupGame(player1Factions: Faction[], player2Factions: Faction[]) {
      this.players = [
          this.createPlayer(1, 'Player 1', player1Factions),
          this.createPlayer(2, 'Player 2', player2Factions)
      ];

      const shuffledBases = this.shuffle([...basesData]);
      this.bases = shuffledBases.slice(0, 3).map((baseData, index) => ({
          ...baseData,
          id: `base-${index}`,
          originalBreakpoint: baseData.breakpoint,
          minions: [],
          attachedActions: []
      }));

      this.players.forEach(player => {
          for (let i = 0; i < 5; i++) {
              this.drawCard(player);
          }
      });

      this.effectsManager.startNewTurn();
      this.ui.render();
  }

  createPlayer(id: number, name: string, factions: Faction[]): Player {
      const deck: Card[] = [];
      
      factions.forEach(faction => {
          const factionCards = cardDatabase[faction];
          factionCards.forEach(card => {
              const cardCopy = { ...card, id: `${card.id}-p${id}` };
              if (card.type === 'minion') {
                  (cardCopy as MinionCard).basePower = card.power!;
                  (cardCopy as MinionCard).attachedActions = [];
              }
              deck.push(cardCopy);
          });
      });

      return {
          id,
          name,
          factions,
          deck: this.shuffle(deck),
          hand: [],
          discard: [],
          victoryPoints: 0
      };
  }

  shuffle<T>(array: T[]): T[] {
      const newArray = [...array];
      for (let i = newArray.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
      }
      return newArray;
  }

  drawCard(player: Player) {
      if (player.deck.length === 0) {
          if (player.discard.length === 0) return;
          player.deck = this.shuffle([...player.discard]);
          player.discard = [];
      }
      const card = player.deck.pop();
      if (card) {
          player.hand.push(card);
      }
  }

  getCurrentPlayer(): Player {
      return this.players[this.currentPlayerIndex];
  }

  canPlayCard(card: Card): boolean {
      if (card.type === 'minion') {
          return this.minionsPlayedThisTurn < this.maxMinionsPerTurn;
      } else {
          return this.actionsPlayedThisTurn < this.maxActionsPerTurn;
      }
  }

  playCard(card: Card, targetId: string, playerId: number) {
      const player = this.players.find(p => p.id === playerId);
      if (!player) return;

      const cardIndex = player.hand.findIndex(c => c.id === card.id);
      if (cardIndex === -1) return;

      player.hand.splice(cardIndex, 1);

      if (card.type === 'minion') {
          this.playMinion(card as MinionCard, targetId, playerId);
          this.minionsPlayedThisTurn++;
          this.minionsPlayedThisPhase = true;
      } else {
          this.playAction(card as ActionCard, targetId, playerId);
          this.actionsPlayedThisTurn++;
      }

      this.checkBases();
      this.ui.render();
  }

  playMinion(minion: MinionCard, baseId: string, playerId: number) {
      const base = this.bases.find(b => b.id === baseId);
      if (!base) return;

      base.minions.push(minion);
      this.triggerMinionEffect(minion, base, playerId);
  }

  triggerMinionEffect(minion: MinionCard, base: Base, playerId: number) {
      const player = this.players.find(p => p.id === playerId);
      if (!player) return;

      switch (minion.name) {
          // Aliens
          case 'Supreme Overlord':
              this.ui.promptReturnMinion(playerId, base.id, 999);
              break;
          case 'Invader':
              player.victoryPoints += 1;
              this.ui.showMessage(`${player.name} gains 1 VP from Invader!`);
              break;
          case 'Collector':
              this.ui.promptReturnMinion(playerId, base.id, 3, true);
              break;
          // Dinosaurs
          case 'Laseratops':
              this.ui.promptDestroyMinion(playerId, base.id, 2, true);
              break;
          // Ninjas
          case 'Ninja Master':
              this.ui.promptDestroyMinion(playerId, base.id, 999);
              break;
          case 'Tiger Assassin':
              this.ui.promptDestroyMinion(playerId, base.id, 3);
              break;
          // Pirates
          case 'Cut Lass':
              this.ui.promptDestroyMinion(playerId, base.id, 2);
              break;
      }
  }

  playAction(action: ActionCard, targetId: string, playerId: number) {
      const player = this.players.find(p => p.id === playerId);
      if (!player) return;

      if (action.ongoing) {
          this.attachOngoingAction(action, targetId, playerId);
      } else {
          this.executeActionEffect(action, targetId, playerId);
          player.discard.push(action);
      }
  }

  attachOngoingAction(action: ActionCard, targetId: string, playerId: number) {
      if (targetId.startsWith('base-')) {
          const base = this.bases.find(b => b.id === targetId);
          if (base) {
              base.attachedActions.push(action);
              
              // Handle specific ongoing base effects
              if (action.name === 'Jammed Signal') {
                  // Base abilities are cancelled - would need base ability system
              }
          }
      } else {
          // Attach to minion
          for (const base of this.bases) {
              const minion = base.minions.find(m => m.id === targetId);
              if (minion) {
                  minion.attachedActions.push(action);
                  
                  // Handle specific ongoing minion effects
                  if (action.name === 'Upgrade') {
                      // Power bonus is handled in getMinionPower
                  } else if (action.name === 'Poison') {
                      // Power penalty is handled in getMinionPower
                  } else if (action.name === 'Assassination') {
                      this.effectsManager.addEffect({
                          source: action.id,
                          target: targetId,
                          type: 'destroy-at-end-of-turn',
                          value: 0,
                          timing: 'end-of-turn' as GameEffectTiming,
                          playerId,
                          expiresAt: 'end-of-turn',
                          description: `${minion.name} will be destroyed at end of turn`
                      });
                  }
                  break;
              }
          }
      }
  }

  executeActionEffect(action: ActionCard, targetId: string, playerId: number) {
      const player = this.players.find(p => p.id === playerId);
      if (!player) return;

      switch (action.name) {
          case 'Beam Up':
          case 'Abduction':
              this.ui.promptReturnMinion(playerId, targetId, 999);
              if (action.name === 'Abduction') {
                  this.maxMinionsPerTurn++;
              }
              break;
          
          case 'Augmentation':
              this.ui.promptSelectMinion(playerId, 'Choose a minion to gain +4 power', (minionId) => {
                  this.effectsManager.addEffect({
                      source: action.id,
                      target: minionId,
                      type: 'power-bonus',
                      value: 4,
                      timing: 'end-of-your-turn' as GameEffectTiming,
                      playerId,
                      expiresAt: 'end-of-your-turn',
                      description: 'Augmentation: +4 power until end of turn'
                  });
                  this.ui.render();
              });
              break;
          
          case 'Howl':
              this.bases.forEach(base => {
                  base.minions.forEach(minion => {
                      if (minion.id.includes(`-p${playerId}`)) {
                          this.effectsManager.addEffect({
                              source: action.id,
                              target: minion.id,
                              type: 'power-bonus',
                              value: 1,
                              timing: 'end-of-your-turn' as GameEffectTiming,
                              playerId,
                              expiresAt: 'end-of-your-turn',
                              description: 'Howl: +1 power until end of turn'
                          });
                      }
                  });
              });
              this.ui.showMessage('All your minions gain +1 power until end of turn!');
              break;
          
          case 'Swashbuckling':
              this.bases.forEach(base => {
                  base.minions.forEach(minion => {
                      if (minion.id.includes(`-p${playerId}`)) {
                          this.effectsManager.addEffect({
                              source: action.id,
                              target: minion.id,
                              type: 'power-bonus',
                              value: 1,
                              timing: 'end-of-turn' as GameEffectTiming,
                              playerId,
                              expiresAt: 'end-of-turn',
                              description: 'Swashbuckling: +1 power until end of turn'
                          });
                      }
                  });
              });
              this.ui.showMessage('All your minions gain +1 power until end of turn!');
              break;
          
          case 'Rampage':
              this.ui.promptSelectBase(playerId, 'Choose a base to reduce breakpoint', (baseId) => {
                  const base = this.bases.find(b => b.id === baseId);
                  if (!base) return;
                  
                  const yourMinions = base.minions.filter(m => m.id.includes(`-p${playerId}`));
                  if (yourMinions.length === 0) {
                      this.ui.showMessage('You have no minions on that base!');
                      return;
                  }
                  
                  this.ui.promptSelectFromList(
                      'Choose your minion',
                      yourMinions.map(m => ({
                          label: `${m.name} (Power: ${this.getMinionPower(m, base)})`,
                          value: m.id
                      })),
                      (minionId) => {
                          const minion = yourMinions.find(m => m.id === minionId);
                          if (minion) {
                              const power = this.getMinionPower(minion, base);
                              this.effectsManager.addEffect({
                                  source: action.id,
                                  target: baseId,
                                  type: 'breakpoint-modifier',
                                  value: -power,
                                  timing: 'end-of-turn' as GameEffectTiming,
                                  playerId,
                                  expiresAt: 'end-of-turn',
                                  description: `Rampage: Breakpoint -${power} until end of turn`
                              });
                              this.ui.render();
                          }
                      }
                  );
              });
              break;
          
          case 'Seeing Stars':
              this.ui.promptDestroyMinion(playerId, targetId, 3);
              break;
          
          case 'Way of Deception':
              this.ui.promptMoveMinion(playerId, true);
              break;
          
          case 'Dinghy':
              this.ui.promptMoveMinion(playerId, true, 2);
              break;
          
          case 'Shanghai':
              this.ui.promptMoveMinion(playerId, false);
              break;
          
          default:
              this.ui.showMessage(`${action.name} effect triggered (simplified implementation)`);
      }
  }

  useTalent(minionId: string, baseId: string) {
      if (!this.effectsManager.canUseTalent(minionId)) {
          this.ui.showMessage('Talent already used this turn!');
          return;
      }

      const base = this.bases.find(b => b.id === baseId);
      if (!base) return;
      
      const minion = base.minions.find(m => m.id === minionId);
      if (!minion) return;

      const playerId = parseInt(minionId.split('-p')[1]);
      this.effectsManager.useTalent(minionId);

      switch (minion.name) {
          case 'Armor Stego':
              this.effectsManager.addEffect({
                  source: minionId,
                  target: minionId,
                  type: 'power-bonus',
                  value: 2,
                  timing: 'talent' as GameEffectTiming,
                  playerId,
                  expiresAt: 'start-of-turn',
                  description: 'Armor Stego: +2 power until your next turn'
              });
              this.ui.showMessage('Armor Stego gains +2 power until your next turn!');
              break;
          
          case 'Ninja Acolyte':
              if (this.minionsPlayedThisPhase) {
                  this.ui.showMessage('Cannot use Ninja Acolyte talent - you already played a minion this turn!');
                  return;
              }
              
              // Return to hand
              const acolyteIndex = base.minions.findIndex(m => m.id === minionId);
              if (acolyteIndex !== -1) {
                  const [acolyte] = base.minions.splice(acolyteIndex, 1);
                  const player = this.players.find(p => p.id === playerId);
                  if (player) {
                      player.hand.push(acolyte);
                      this.maxMinionsPerTurn++;
                      this.ui.showMessage('Ninja Acolyte returned to hand - you may play an extra minion!');
                  }
              }
              break;
      }

      this.ui.render();
  }

  returnMinion(minionId: string, baseId: string) {
      const base = this.bases.find(b => b.id === baseId);
      if (!base) return;

      const minionIndex = base.minions.findIndex(m => m.id === minionId);
      if (minionIndex !== -1) {
          const [minion] = base.minions.splice(minionIndex, 1);
          const owner = this.players.find(p => minion.id.includes(`-p${p.id}`));
          if (owner) {
              owner.hand.push(minion);
              this.ui.showMessage(`${minion.name} returned to ${owner.name}'s hand`);
          }
      }
  }

  destroyMinion(minionId: string, baseId: string) {
      const base = this.bases.find(b => b.id === baseId);
      if (!base) return;

      const minionIndex = base.minions.findIndex(m => m.id === minionId);
      if (minionIndex !== -1) {
          const [minion] = base.minions.splice(minionIndex, 1);
          const owner = this.players.find(p => minion.id.includes(`-p${p.id}`));
          if (owner) {
              owner.discard.push(minion);
              minion.attachedActions.forEach(action => {
                  owner.discard.push(action);
              });
              this.ui.showMessage(`${minion.name} destroyed`);
          }
      }
  }

  moveMinion(minionId: string, fromBaseId: string, toBaseId: string) {
      const fromBase = this.bases.find(b => b.id === fromBaseId);
      const toBase = this.bases.find(b => b.id === toBaseId);
      
      if (!fromBase || !toBase) return;

      const minionIndex = fromBase.minions.findIndex(m => m.id === minionId);
      if (minionIndex !== -1) {
          const [minion] = fromBase.minions.splice(minionIndex, 1);
          toBase.minions.push(minion);
          this.ui.showMessage(`${minion.name} moved to ${toBase.name}`);
      }
  }

  getMinionPower(minion: MinionCard, base: Base): number {
      let power = minion.basePower || minion.power || 0;

      // Attached actions
      minion.attachedActions?.forEach(action => {
          if (action.name === 'Upgrade') {
              power += 2;
          } else if (action.name === 'Poison') {
              power = Math.max(0, power - 4);
          }
      });

      // War Raptor special ability
      if (minion.name === 'War Raptor') {
          const raptorCount = base.minions.filter(m => m.name === 'War Raptor').length;
          power += raptorCount - 1;
      }

      // Apply temporary effects
      power += this.effectsManager.getMinionPowerModifiers(minion.id, base.id);

      return Math.max(0, power);
  }

  getBasePower(base: Base, playerId?: number): number {
      return base.minions
          .filter(m => playerId === undefined || m.id.includes(`-p${playerId}`))
          .reduce((sum, m) => sum + this.getMinionPower(m, base), 0);
  }

  getBaseBreakpoint(base: Base): number {
      return base.originalBreakpoint + this.effectsManager.getBaseBreakpointModifier(base.id);
  }

  checkBases() {
      this.bases.forEach(base => {
          const totalPower = this.getBasePower(base);
          const breakpoint = this.getBaseBreakpoint(base);
          if (totalPower >= breakpoint) {
              this.scoreBase(base);
          }
      });
  }

  scoreBase(base: Base) {
      // Check for special abilities that trigger before scoring
      // (Shinobi, Pirate King, etc. - simplified for now)

      const playerPowers: { playerId: number, power: number }[] = this.players.map(player => ({
          playerId: player.id,
          power: this.getBasePower(base, player.id)
      }));

      playerPowers.sort((a, b) => b.power - a.power);

      // Award victory points
      playerPowers.forEach((pp, index) => {
          if (pp.power > 0 && index < base.rewards.length) {
              const player = this.players.find(p => p.id === pp.playerId);
              if (player) {
                  player.victoryPoints += base.rewards[index];
                  this.ui.showMessage(`${player.name} scores ${base.rewards[index]} VP from ${base.name}!`);
              }
          }
      });

      // Handle First Mate and Scout special abilities
      const specialMinions: MinionCard[] = [];
      base.minions.forEach(minion => {
          if (minion.name === 'First Mate' || minion.name === 'Scout') {
              specialMinions.push(minion);
          }
      });

      // Discard regular minions
      base.minions.forEach(minion => {
          if (!specialMinions.includes(minion)) {
              const owner = this.players.find(p => minion.id.includes(`-p${p.id}`));
              if (owner) {
                  owner.discard.push(minion);
                  minion.attachedActions.forEach(action => {
                      owner.discard.push(action);
                  });
              }
          }
      });

      // Discard base actions
      base.attachedActions.forEach(action => {
          const owner = this.players.find(p => action.id.includes(`-p${p.id}`));
          if (owner) {
              owner.discard.push(action);
          }
      });

      // Replace base
      const baseIndex = this.bases.findIndex(b => b.id === base.id);
      const unusedBases = basesData.filter(bd => 
          !this.bases.some(b => b.name === bd.name)
      );
      
      if (unusedBases.length > 0) {
          const newBaseData = unusedBases[Math.floor(Math.random() * unusedBases.length)];
          this.bases[baseIndex] = {
              ...newBaseData,
              id: `base-${Date.now()}`,
              originalBreakpoint: newBaseData.breakpoint,
              minions: specialMinions, // Add special minions to new base
              attachedActions: []
          };
      } else {
          // No more bases - remove this one
          this.bases.splice(baseIndex, 1);
      }

      this.checkGameOver();
  }

  checkGameOver() {
      const winner = this.players.find(p => p.victoryPoints >= 15);
      if (winner) {
          this.gameOver = true;
          this.ui.showGameOver(winner);
      }
  }

  endTurn() {
      // Process end-of-turn effects
      const effects = this.effectsManager.getActiveEffects();
      effects.forEach(effect => {
          if (effect.type === 'destroy-at-end-of-turn') {
              // Find and destroy the minion
              for (const base of this.bases) {
                  const minion = base.minions.find(m => m.id === effect.target);
                  if (minion) {
                      this.destroyMinion(minion.id, base.id);
                      break;
                  }
              }
          }
      });

      // Clean up effects
      this.effectsManager.cleanupEndOfTurn(this.currentPlayerIndex + 1);

      // Draw 2 cards
      const currentPlayer = this.getCurrentPlayer();
      this.drawCard(currentPlayer);
      this.drawCard(currentPlayer);

      // Reset counters
      this.minionsPlayedThisTurn = 0;
      this.actionsPlayedThisTurn = 0;
      this.maxMinionsPerTurn = 1;
      this.maxActionsPerTurn = 1;
      this.minionsPlayedThisPhase = false;

      // Next player
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
      
      // Start new turn
      this.effectsManager.startNewTurn();
      this.effectsManager.cleanupStartOfTurn(this.currentPlayerIndex + 1);

      this.ui.render();
  }
}