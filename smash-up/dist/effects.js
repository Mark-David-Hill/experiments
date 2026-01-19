"use strict";
class EffectsManager {
    constructor() {
        this.effects = [];
        this.talentUsages = [];
        this.effectIdCounter = 0;
        this.currentTurn = 0;
    }
    addEffect(effect) {
        const id = `effect-${this.effectIdCounter++}`;
        this.effects.push(Object.assign(Object.assign({}, effect), { id }));
        return id;
    }
    removeEffect(id) {
        this.effects = this.effects.filter(e => e.id !== id);
    }
    getActiveEffects() {
        return this.effects;
    }
    getMinionPowerModifiers(minionId, baseId) {
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
    getBaseBreakpointModifier(baseId) {
        let modifier = 0;
        this.effects.forEach(effect => {
            if (effect.target === baseId && effect.type === 'breakpoint-modifier') {
                modifier += effect.value;
            }
        });
        return modifier;
    }
    cleanupEndOfTurn(currentPlayerId) {
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
    cleanupStartOfTurn(currentPlayerId) {
        // Remove "start-of-turn" effects
        this.effects = this.effects.filter(effect => {
            return effect.expiresAt !== 'start-of-turn';
        });
    }
    startNewTurn() {
        this.currentTurn++;
    }
    canUseTalent(minionId) {
        const usage = this.talentUsages.find(u => u.minionId === minionId);
        return !usage || usage.turnUsed < this.currentTurn;
    }
    useTalent(minionId) {
        const existingUsage = this.talentUsages.find(u => u.minionId === minionId);
        if (existingUsage) {
            existingUsage.turnUsed = this.currentTurn;
        }
        else {
            this.talentUsages.push({ minionId, turnUsed: this.currentTurn });
        }
    }
    getEffectsDescription() {
        return this.effects.map(e => e.description);
    }
}
//# sourceMappingURL=effects.js.map