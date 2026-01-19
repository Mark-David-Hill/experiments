type CardType = 'minion' | 'action';
type Faction = 'aliens' | 'dinosaurs' | 'ninjas' | 'pirates';
type GameEffectTiming = 'ongoing' | 'end-of-turn' | 'start-of-turn' | 'end-of-your-turn' | 'talent';

interface Card {
    id: string;
    name: string;
    type: CardType;
    faction: Faction;
    power?: number;
    text: string;
    ongoing?: boolean;
    talent?: boolean;
    special?: boolean;
}

interface MinionCard extends Card {
    type: 'minion';
    power: number;
    attachedActions: ActionCard[];
    basePower: number; // Store original power
}

interface ActionCard extends Card {
    type: 'action';
    attachedTo?: string;
}

interface Base {
    id: string;
    name: string;
    breakpoint: number;
    originalBreakpoint: number;
    rewards: number[];
    minions: MinionCard[];
    attachedActions: ActionCard[];
}

interface Player {
    id: number;
    name: string;
    factions: Faction[];
    deck: Card[];
    hand: Card[];
    discard: Card[];
    victoryPoints: number;
}

interface Effect {
    id: string;
    source: string;
    target?: string;
    type: string;
    value: number;
    timing: GameEffectTiming;
    playerId: number;
    expiresAt?: 'end-of-turn' | 'start-of-turn' | 'end-of-your-turn';
    description: string;
}

interface TalentUsage {
    minionId: string;
    turnUsed: number;
}