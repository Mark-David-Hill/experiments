// Smash Up Game Data

const FACTIONS = {
    aliens: {
        name: "Aliens",
        color: "#4a90e2",
        minions: [
            { name: "Alien Scout", power: 2, ability: "You may return another minion to its owner's hand." },
            { name: "Alien Invader", power: 3, ability: null },
            { name: "Alien Overlord", power: 5, ability: "Ongoing: Other players' minions here have -1 power." },
            { name: "Alien Captain", power: 4, ability: "Special: You may move this minion to another base." },
            { name: "Alien Trooper", power: 2, ability: null },
            { name: "Alien Warrior", power: 3, ability: null },
            { name: "Alien Commander", power: 4, ability: "You may return another minion to its owner's hand." },
            { name: "Alien Spaceship", power: 3, ability: null },
            { name: "Alien Beast", power: 5, ability: null },
            { name: "Alien Scientist", power: 2, ability: "Draw a card." }
        ],
        actions: [
            { name: "Probe", ability: "Return a minion to its owner's hand." },
            { name: "Abduction", ability: "Move a minion to another base." },
            { name: "Mind Control", ability: "Return a minion to its owner's hand. Its owner draws a card." },
            { name: "Beam Up", ability: "Return any number of your minions to your hand." },
            { name: "Invader's Reward", ability: "Draw 2 cards. Play an extra action." },
            { name: "Disintegration Ray", ability: "Destroy a minion of power 2 or less." },
            { name: "Area 51", ability: "Choose a base. Move a minion from there to another base." },
            { name: "Scout Ship", ability: "Draw a card. Play an extra minion." },
            { name: "Abduction Pod", ability: "Return two minions to their owners' hands." },
            { name: "Alien Technology", ability: "Play an extra action. Draw a card." }
        ]
    },
    zombies: {
        name: "Zombies",
        color: "#2d5016",
        minions: [
            { name: "Zombie", power: 2, ability: "When this base scores, you may play a minion from your discard pile here instead of from your hand." },
            { name: "Shambler", power: 3, ability: null },
            { name: "Zombie Lord", power: 4, ability: "You may play a minion from your discard pile on this base." },
            { name: "Gravedigger", power: 2, ability: "You may play a minion from your discard pile instead of from your hand." },
            { name: "Walker", power: 3, ability: null },
            { name: "Zombie King", power: 5, ability: "Ongoing: Your other minions here have +1 power." },
            { name: "Necromancer", power: 3, ability: "You may play a minion from your discard pile here instead of from your hand." },
            { name: "Risen Dead", power: 2, ability: null },
            { name: "Zombie Horde", power: 4, ability: "When this base scores, you may return this minion to your hand instead of the discard pile." },
            { name: "Undead Warrior", power: 3, ability: null }
        ],
        actions: [
            { name: "Grave Robbing", ability: "Search your discard pile for a minion and add it to your hand." },
            { name: "They Keep Coming", ability: "Play a minion from your discard pile as an extra minion." },
            { name: "Zombie Apocalypse", ability: "All players discard down to 3 cards." },
            { name: "Rise Again", ability: "Play a minion from your discard pile." },
            { name: "Necromancy", ability: "Choose a minion in any discard pile and place it on top of that player's deck." },
            { name: "Graveyard", ability: "Choose a base. Each player may play a minion from their discard pile there." },
            { name: "Outbreak", ability: "Play up to three minions from your discard pile. Destroy them at the start of your next turn." },
            { name: "Corpse Takeover", ability: "Play a minion from your discard pile. Draw a card." },
            { name: "Undead Rising", ability: "Return any number of minions from your discard pile to your hand." },
            { name: "Zombie Mob", ability: "Play an extra minion. You may play it from your discard pile." }
        ]
    },
    pirates: {
        name: "Pirates",
        color: "#8b4513",
        minions: [
            { name: "First Mate", power: 2, ability: "You may move another minion to another base." },
            { name: "Pirate Captain", power: 4, ability: "Ongoing: Your other minions here have +1 power." },
            { name: "Crewman", power: 2, ability: null },
            { name: "Pirate King", power: 5, ability: "You may destroy another player's minion of power 2 or less." },
            { name: "Swashbuckler", power: 3, ability: "You may move this minion to another base." },
            { name: "Buccaneer", power: 3, ability: null },
            { name: "Sea Dog", power: 2, ability: null },
            { name: "Ruffian", power: 3, ability: null },
            { name: "Pirate Ship", power: 4, ability: "You may move a minion to another base." },
            { name: "Powder Monkey", power: 2, ability: null }
        ],
        actions: [
            { name: "Mutiny", ability: "Move a minion to another base." },
            { name: "Walk the Plank", ability: "Destroy a minion of power 3 or less." },
            { name: "Port", ability: "Move any number of your minions to another base." },
            { name: "Treasure Map", ability: "Draw 2 cards." },
            { name: "Sea Battle", ability: "Destroy a minion of power 4 or less." },
            { name: "Raid", ability: "Move a minion to another base. You may destroy a minion of power 2 or less there." },
            { name: "Buried Treasure", ability: "Draw 3 cards." },
            { name: "Scurvy Dog", ability: "Choose a base. Move a minion from there to another base." },
            { name: "Plunder", ability: "Move a minion to another base. Draw a card." },
            { name: "Parley", ability: "Choose a base. Each player may move one of their minions from there to another base." }
        ]
    },
    ninjas: {
        name: "Ninjas",
        color: "#2c2c2c",
        minions: [
            { name: "Ninja Master", power: 4, ability: "Ongoing: Your other minions here have +1 power." },
            { name: "Assassin", power: 2, ability: "You may destroy a minion of power 2 or less." },
            { name: "Shinobi", power: 3, ability: "You may move this minion to another base." },
            { name: "Kunoichi", power: 2, ability: "You may destroy a minion of power 3 or less." },
            { name: "Ninja Warrior", power: 3, ability: null },
            { name: "Shadow Warrior", power: 2, ability: null },
            { name: "Ninja Apprentice", power: 2, ability: null },
            { name: "Stealth Fighter", power: 3, ability: null },
            { name: "Silent Assassin", power: 4, ability: "You may destroy a minion of power 2 or less." },
            { name: "Ninja Squad", power: 3, ability: null }
        ],
        actions: [
            { name: "Backstab", ability: "Destroy a minion of power 3 or less." },
            { name: "Smoke Bomb", ability: "Move a minion to another base." },
            { name: "Shadow", ability: "Move any number of your minions to another base." },
            { name: "Hidden Ninja", ability: "Play an extra minion. It has +2 power until the end of the turn." },
            { name: "Ninja Strike", ability: "Destroy a minion of power 4 or less." },
            { name: "Stealth", ability: "Choose a base. Move up to three of your minions from there to another base." },
            { name: "Kunai", ability: "Destroy a minion of power 2 or less. Draw a card." },
            { name: "Ninja Training", ability: "Choose a base. Each of your minions there gains +1 power until the end of the turn." },
            { name: "Silent Kill", ability: "Destroy a minion of power 3 or less. Draw a card." },
            { name: "Vanishing Act", ability: "Return one of your minions to your hand. Draw a card." }
        ]
    }
};

const BASES = [
    { name: "The Space Station", breakpoint: 22, vp1: 4, vp2: 2, vp3: 1, ability: "Ongoing: Minions here have +1 power." },
    { name: "The Graveyard", breakpoint: 20, vp1: 4, vp2: 2, vp3: 1, ability: "When this base scores, each player may play a minion from their discard pile here." },
    { name: "Pirate Cove", breakpoint: 21, vp1: 4, vp2: 2, vp3: 1, ability: "You may move one of your minions from another base to here." },
    { name: "Ninja Dojo", breakpoint: 19, vp1: 4, vp2: 2, vp3: 1, ability: "You may destroy a minion of power 2 or less here." },
    { name: "Central Park", breakpoint: 21, vp1: 4, vp2: 2, vp3: 1, ability: null },
    { name: "The Factory", breakpoint: 20, vp1: 4, vp2: 2, vp3: 1, ability: "Ongoing: Your minions here have +1 power." },
    { name: "The Laboratory", breakpoint: 22, vp1: 4, vp2: 2, vp3: 1, ability: "Draw a card." },
    { name: "The Great Wall", breakpoint: 23, vp1: 5, vp2: 3, vp3: 1, ability: null },
    { name: "The Ocean", breakpoint: 21, vp1: 4, vp2: 2, vp3: 1, ability: "You may move a minion to another base." },
    { name: "The Warehouse", breakpoint: 20, vp1: 4, vp2: 2, vp3: 1, ability: "Play an extra card." }
];

const WINNING_SCORE = 15; // First to 15 points wins
