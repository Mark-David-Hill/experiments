export const colors = {
  health: "#f44336",
  food: "#ff9800",
  minerals: "#2196f3",
};

export const startingValues = {
  maxFood: 1000,
  maxMinerals: 1000,
  maxPopulation: 1000,
  food: 250,
  minerals: 100,
  health: 80,
};

export const buildingBonuses = {
  autoFarm: 50,
  autoMine: 50,
  grainSilo: 500,
  mineralStorehouse: 500,
};

export const buildingChoices = [
  {
    name: "Auto Farm",
    cost: 700,
    description: "Produces +50 food/year",
    count: 0,
    maxCount: 5,
    color: colors.food,
  },
  {
    name: "Grain Silo",
    cost: 300,
    description: "Increases food cap",
    count: 0,
    maxCount: 4,
    color: colors.food,
  },
  {
    name: "Auto Mine",
    cost: 500,
    description: "Produces +50 minerals/year",
    count: 0,
    maxCount: 5,
    color: colors.minerals,
  },
  {
    name: "Mineral Storehouse",
    cost: 300,
    description: "Increases mineral cap",
    count: 0,
    maxCount: 4,
    color: colors.minerals,
  },
  {
    name: "Hospital",
    cost: 800,
    description: "Increases health of the colony",
    count: 0,
    maxCount: 1,
    color: colors.health,
  },
];
