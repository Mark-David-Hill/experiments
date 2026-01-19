class EffectsManager {
  private effects: Effect[] = [];
  private talentUsages: TalentUsage[] = [];
  private effectIdCounter = 0;
  private currentTurn = 0;

  addEffect(effect: Omit<Effect, 'id'>): string {
      const id = `effect-${this.effectIdCounter++}`;
      this.effects.push({ ...effect, id });
      return id;
  }

  removeEffect(id: string) {
      this.effects = this.effects.filter(e => e.id !== id);
  }

  getActiveEffects(): Effect[] {
      return this.effects;
  }

  getMinionPowerModifiers(minionId: string, baseId: string): number {
      let modifier = 0;
      
      this.effects.forEach(effect => {
          // Direct power modifications to this minion
          if (effect.target === minionId && effect.type === 'power-bonus') {
              modifier += effect.value;
          }
          
          // Global effects (like Howl affecting all player's minions)
          if (effect.type === 'all-minions-power' && effect.target === baseId) {
              modifier += effect.value;
          }
      });

      return modifier;
  }

  getBaseBreakpointModifier(baseId: string): number {
      let modifier = 0;
      
      this.effects.forEach(effect => {
          if (effect.target === baseId && effect.type === 'breakpoint-modifier') {
              modifier += effect.value;
          }
      });

      return modifier;
  }

  cleanupEndOfTurn(currentPlayerId: number) {
      // Remove "end-of-turn" effects
      this.effects = this.effects.filter(effect => {
          if (effect.expiresAt === 'end-of-turn') {
              return false;
          }
          if (effect.expiresAt === 'end-of-your-turn' && effect.playerId === currentPlayerId) {
              return false;
          }
          return true;
      });
  }

  cleanupStartOfTurn(currentPlayerId: number) {
      // Remove "start-of-turn" effects
      this.effects = this.effects.filter(effect => {
          return effect.expiresAt !== 'start-of-turn';
      });
  }

  startNewTurn() {
      this.currentTurn++;
  }

  canUseTalent(minionId: string): boolean {
      const usage = this.talentUsages.find(u => u.minionId === minionId);
      return !usage || usage.turnUsed < this.currentTurn;
  }

  useTalent(minionId: string) {
      const existingUsage = this.talentUsages.find(u => u.minionId === minionId);
      if (existingUsage) {
          existingUsage.turnUsed = this.currentTurn;
      } else {
          this.talentUsages.push({ minionId, turnUsed: this.currentTurn });
      }
  }

  getEffectsDescription(): string[] {
      return this.effects.map(e => e.description);
  }
}