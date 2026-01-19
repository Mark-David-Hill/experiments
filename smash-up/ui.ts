class UIManager {
  game: Game;

  constructor(game: Game) {
      this.game = game;
  }

  render() {
      this.renderGameInfo();
      this.renderActiveEffects();
      this.renderBases();
      this.renderPlayers();
  }

  renderGameInfo() {
      document.getElementById('p1-vp')!.textContent = this.game.players[0].victoryPoints.toString();
      document.getElementById('p2-vp')!.textContent = this.game.players[1].victoryPoints.toString();
      document.getElementById('p1-vp-detail')!.textContent = this.game.players[0].victoryPoints.toString();
      document.getElementById('p2-vp-detail')!.textContent = this.game.players[1].victoryPoints.toString();
      
      document.getElementById('current-player-name')!.textContent = this.game.getCurrentPlayer().name;
      document.getElementById('minions-played')!.textContent = this.game.minionsPlayedThisTurn.toString();
      document.getElementById('max-minions')!.textContent = this.game.maxMinionsPerTurn.toString();
      document.getElementById('actions-played')!.textContent = this.game.actionsPlayedThisTurn.toString();
      document.getElementById('max-actions')!.textContent = this.game.maxActionsPerTurn.toString();
  }

  renderActiveEffects() {
      const container = document.getElementById('active-effects')!;
      const effects = this.game.effectsManager.getEffectsDescription();
      
      if (effects.length > 0) {
          container.innerHTML = '<strong>Active Effects:</strong> ' + 
              effects.map(desc => `<span class="effect-badge">${desc}</span>`).join('');
      } else {
          container.innerHTML = '';
      }
  }

  renderBases() {
      const basesContainer = document.getElementById('bases')!;
      basesContainer.innerHTML = '';

      this.game.bases.forEach(base => {
          const baseEl = document.createElement('div');
          baseEl.className = 'base';
          baseEl.dataset.baseId = base.id;

          const totalPower = this.game.getBasePower(base);
          const breakpoint = this.game.getBaseBreakpoint(base);
          const breakProgress = Math.min(100, (totalPower / breakpoint) * 100);

          baseEl.innerHTML = `
              <div class="base-header">
                  <div class="base-name">${base.name}</div>
                  <div class="base-stats">
                      <span class="base-power">Power: ${totalPower}/${breakpoint}</span>
                      <span>VP: ${base.rewards.join('/')}</span>
                  </div>
                  <div style="background: #ddd; height: 8px; border-radius: 4px; margin-top: 5px;">
                      <div style="background: ${breakProgress >= 100 ? '#e74c3c' : '#667eea'}; height: 100%; width: ${breakProgress}%; border-radius: 4px; transition: width 0.3s;"></div>
                  </div>
              </div>
              <div class="base-minions" id="base-minions-${base.id}"></div>
          `;

          // Show attached base actions
          if (base.attachedActions.length > 0) {
              const actionsDiv = document.createElement('div');
              actionsDiv.className = 'attached-actions';
              actionsDiv.innerHTML = '<strong>Base Actions:</strong> ' + 
                  base.attachedActions.map(a => a.name).join(', ');
              baseEl.appendChild(actionsDiv);
          }

          basesContainer.appendChild(baseEl);

          // Render minions grouped by player
          const minionsContainer = baseEl.querySelector(`#base-minions-${base.id}`)!;
          
          this.game.players.forEach(player => {
              const playerMinions = base.minions.filter(m => m.id.includes(`-p${player.id}`));
              if (playerMinions.length > 0) {
                  const groupEl = document.createElement('div');
                  groupEl.className = 'minion-group';
                  groupEl.innerHTML = `<div class="minion-group-header">${player.name} (${this.game.getBasePower(base, player.id)})</div>`;
                  
                  playerMinions.forEach(minion => {
                      const minionEl = this.createCardElement(minion, player.id, base);
                      groupEl.appendChild(minionEl);
                  });
                  
                  minionsContainer.appendChild(groupEl);
              }
          });

          this.setupDropZone(baseEl, base.id);
      });
  }

  renderPlayers() {
      this.game.players.forEach(player => {
          const handContainer = document.getElementById(`player${player.id}-hand`)!;
          handContainer.innerHTML = '';

          const isCurrentPlayer = player.id === this.game.getCurrentPlayer().id;
          const isOpponent = !isCurrentPlayer;

          if (isOpponent) {
              player.hand.forEach(card => {
                  const cardEl = document.createElement('div');
                  cardEl.className = 'card opponent-hand';
                  cardEl.innerHTML = `
                      <div class="card-header">
                          <div class="card-name">Hidden Card</div>
                          <div class="card-power">?</div>
                      </div>
                  `;
                  handContainer.appendChild(cardEl);
              });
          } else {
              player.hand.forEach(card => {
                  const cardEl = this.createCardElement(card, player.id);
                  handContainer.appendChild(cardEl);

                  if (this.game.canPlayCard(card)) {
                      this.setupDraggable(cardEl, card, player.id);
                  } else {
                      cardEl.style.opacity = '0.5';
                      cardEl.style.cursor = 'not-allowed';
                  }
              });
          }

          document.getElementById(`p${player.id}-hand-count`)!.textContent = player.hand.length.toString();
          document.getElementById(`p${player.id}-deck-count`)!.textContent = player.deck.length.toString();

          const playerArea = document.getElementById(`player${player.id}-area`)!;
          if (isCurrentPlayer) {
              playerArea.classList.add('active');
          } else {
              playerArea.classList.remove('active');
          }
      });
  }

  createCardElement(card: Card, playerId: number, base?: Base): HTMLElement {
      const cardEl = document.createElement('div');
      cardEl.className = `card ${card.type}-card`;
      cardEl.dataset.cardId = card.id;

      const isCurrentPlayerCard = playerId === this.game.getCurrentPlayer().id;

      // Check if talent is available
      if (card.talent && base && isCurrentPlayerCard) {
          if (this.game.effectsManager.canUseTalent(card.id)) {
              cardEl.classList.add('talent-available');
          }
      }

      let powerDisplay = '';
      if (card.type === 'minion') {
          const minion = card as MinionCard;
          const displayPower = base ? this.game.getMinionPower(minion, base) : minion.power;
          const isModified = base && displayPower !== minion.basePower;
          powerDisplay = `<div class="card-power ${isModified ? 'modified' : ''}">${displayPower}</div>`;
      }

      cardEl.innerHTML = `
          <div class="card-header">
              <div class="card-name">${card.name}</div>
              ${powerDisplay}
          </div>
          <div class="card-text">${card.text}</div>
          <div class="card-faction">${card.faction}</div>
      `;

      // Show attached actions
      if (card.type === 'minion') {
          const minion = card as MinionCard;
          if (minion.attachedActions && minion.attachedActions.length > 0) {
              const attachedDiv = document.createElement('div');
              attachedDiv.className = 'attached-actions';
              minion.attachedActions.forEach(action => {
                  const actionDiv = document.createElement('div');
                  actionDiv.className = 'attached-action';
                  actionDiv.textContent = action.name;
                  attachedDiv.appendChild(actionDiv);
              });
              cardEl.appendChild(attachedDiv);
          }

          // Add talent button if applicable
          if (card.talent && base && isCurrentPlayerCard && this.game.effectsManager.canUseTalent(card.id)) {
              const talentBtn = document.createElement('button');
              talentBtn.className = 'talent-button';
              talentBtn.textContent = 'Use Talent';
              talentBtn.onclick = () => {
                  this.game.useTalent(card.id, base.id);
              };
              cardEl.appendChild(talentBtn);
          }
      }

      return cardEl;
  }

  setupDraggable(element: HTMLElement, card: Card, playerId: number) {
      element.draggable = true;
      
      element.addEventListener('dragstart', (e) => {
          this.game.draggedCard = card;
          this.game.draggedFromPlayer = playerId;
          element.classList.add('dragging');
          e.dataTransfer!.effectAllowed = 'move';
      });

      element.addEventListener('dragend', () => {
          element.classList.remove('dragging');
      });
  }

  setupDropZone(element: HTMLElement, baseId: string) {
      element.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer!.dropEffect = 'move';
          element.classList.add('drop-target');
      });

      element.addEventListener('dragleave', () => {
          element.classList.remove('drop-target');
      });

      element.addEventListener('drop', (e) => {
          e.preventDefault();
          element.classList.remove('drop-target');

          if (this.game.draggedCard && this.game.draggedFromPlayer) {
              if (this.game.draggedFromPlayer === this.game.getCurrentPlayer().id) {
                  this.game.playCard(this.game.draggedCard, baseId, this.game.draggedFromPlayer);
              }
          }

          this.game.draggedCard = null;
          this.game.draggedFromPlayer = null;
      });
  }

  showMessage(message: string, autoClose: boolean = true) {
      const modal = document.getElementById('modal')!;
      const title = document.getElementById('modal-title')!;
      const body = document.getElementById('modal-body')!;
      const buttons = document.getElementById('modal-buttons')!;

      title.textContent = 'Game Event';
      body.textContent = message;
      buttons.innerHTML = '<button class="modal-btn" onclick="game.ui.closeModal()">OK</button>';
      modal.classList.add('show');

      if (autoClose) {
          setTimeout(() => {
              if (modal.classList.contains('show')) {
                  this.closeModal();
              }
          }, 2000);
      }
  }

  promptReturnMinion(playerId: number, baseId: string, maxPower: number, excludeCollector: boolean = false) {
      const base = this.game.bases.find(b => b.id === baseId);
      if (!base || base.minions.length === 0) return;

      const validTargets = base.minions.filter(m => {
          const power = this.game.getMinionPower(m, base);
          if (excludeCollector && m.name === 'Collector') return false;
          return power <= maxPower;
      });

      if (validTargets.length === 0) {
          this.showMessage('No valid targets to return');
          return;
      }

      this.promptSelectFromList(
          'Choose a minion to return to hand',
          validTargets.map(m => ({
              label: `${m.name} (Power: ${this.game.getMinionPower(m, base)})`,
              value: m.id
          })),
          (minionId) => {
              this.game.returnMinion(minionId, base.id);
              this.render();
          },
          true
      );
  }

  promptDestroyMinion(playerId: number, baseId: string, maxPower: number, useBasePower: boolean = false) {
      const base = this.game.bases.find(b => b.id === baseId);
      if (!base || base.minions.length === 0) return;

      const validTargets = base.minions.filter(m => {
          const power = useBasePower ? m.basePower : this.game.getMinionPower(m, base);
          return power <= maxPower;
      });

      if (validTargets.length === 0) {
          this.showMessage('No valid targets to destroy');
          return;
      }

      this.promptSelectFromList(
          'Choose a minion to destroy',
          validTargets.map(m => ({
              label: `${m.name} (Power: ${this.game.getMinionPower(m, base)})`,
              value: m.id
          })),
          (minionId) => {
              this.game.destroyMinion(minionId, base.id);
              this.render();
          },
          true
      );
  }

  promptSelectMinion(playerId: number, title: string, onSelect: (minionId: string) => void) {
      const allMinions: { minion: MinionCard, base: Base }[] = [];
      this.game.bases.forEach(base => {
          base.minions.forEach(minion => {
              allMinions.push({ minion, base });
          });
      });

      if (allMinions.length === 0) {
          this.showMessage('No minions in play');
          return;
      }

      this.promptSelectFromList(
          title,
          allMinions.map(({ minion, base }) => ({
              label: `${minion.name} at ${base.name} (Power: ${this.game.getMinionPower(minion, base)})`,
              value: minion.id
          })),
          onSelect
      );
  }

  promptSelectBase(playerId: number, title: string, onSelect: (baseId: string) => void) {
      this.promptSelectFromList(
          title,
          this.game.bases.map(base => ({
              label: `${base.name} (${this.game.getBasePower(base)}/${this.game.getBaseBreakpoint(base)})`,
              value: base.id
          })),
          onSelect
      );
  }

  promptMoveMinion(playerId: number, ownMinionsOnly: boolean, count: number = 1) {
      const validMinions: { minion: MinionCard, base: Base }[] = [];
      
      this.game.bases.forEach(base => {
          base.minions.forEach(minion => {
              if (!ownMinionsOnly || minion.id.includes(`-p${playerId}`)) {
                  validMinions.push({ minion, base });
              }
          });
      });

      if (validMinions.length === 0) {
          this.showMessage('No valid minions to move');
          return;
      }

      const moveCount = Math.min(count, validMinions.length);
      let movesMade = 0;

      const selectMinion = () => {
          if (movesMade >= moveCount) {
              this.render();
              return;
          }

          this.promptSelectFromList(
              `Choose minion to move (${movesMade + 1}/${moveCount})`,
              validMinions.map(({ minion, base }) => ({
                  label: `${minion.name} at ${base.name}`,
                  value: `${minion.id}|${base.id}`
              })),
              (value) => {
                  const [minionId, fromBaseId] = value.split('|');
                  
                  const otherBases = this.game.bases.filter(b => b.id !== fromBaseId);
                  this.promptSelectFromList(
                      'Choose destination base',
                      otherBases.map(base => ({
                          label: base.name,
                          value: base.id
                      })),
                      (toBaseId) => {
                          this.game.moveMinion(minionId, fromBaseId, toBaseId);
                          movesMade++;
                          
                          // Remove moved minion from valid list
                          const index = validMinions.findIndex(vm => vm.minion.id === minionId);
                          if (index > -1) {
                              validMinions.splice(index, 1);
                          }
                          
                          selectMinion();
                      }
                  );
              },
              movesMade > 0 // Allow skipping after first move
          );
      };

      selectMinion();
  }

  promptSelectFromList(
      title: string,
      options: { label: string, value: string }[],
      onSelect: (value: string) => void,
      allowSkip: boolean = false
  ) {
      const modal = document.getElementById('modal')!;
      const titleEl = document.getElementById('modal-title')!;
      const body = document.getElementById('modal-body')!;
      const buttons = document.getElementById('modal-buttons')!;

      titleEl.textContent = title;
      
      const targetList = document.createElement('div');
      targetList.className = 'target-list';
      options.forEach(option => {
          const targetEl = document.createElement('div');
          targetEl.className = 'target-item';
          targetEl.textContent = option.label;
          targetEl.onclick = () => {
              onSelect(option.value);
              this.closeModal();
          };
          targetList.appendChild(targetEl);
      });
      body.innerHTML = '';
      body.appendChild(targetList);

      buttons.innerHTML = '';
      if (allowSkip) {
          const skipBtn = document.createElement('button');
          skipBtn.className = 'modal-btn cancel';
          skipBtn.textContent = 'Skip';
          skipBtn.onclick = () => this.closeModal();
          buttons.appendChild(skipBtn);
      }

      modal.classList.add('show');
  }

  closeModal() {
      const modal = document.getElementById('modal')!;
      modal.classList.remove('show');
  }

  showGameOver(winner: Player) {
      const modal = document.getElementById('modal')!;
      const title = document.getElementById('modal-title')!;
      const body = document.getElementById('modal-body')!;
      const buttons = document.getElementById('modal-buttons')!;

      title.textContent = '🎉 Game Over! 🎉';
      body.innerHTML = `
          <div class="game-over">
              <div class="winner-announcement">${winner.name} Wins!</div>
              <div style="font-size: 18px;">
                  Final Score:<br>
                  Player 1: ${this.game.players[0].victoryPoints} VP<br>
                  Player 2: ${this.game.players[1].victoryPoints} VP
              </div>
          </div>
      `;
      buttons.innerHTML = '<button class="modal-btn" onclick="location.reload()">Play Again</button>';
      modal.classList.add('show');
  }
}