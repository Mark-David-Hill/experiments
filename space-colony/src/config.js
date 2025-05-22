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
  { name: "Auto Farm", cost: 700, description: "Produces +50 food/year" },
  { name: "Grain Silo", cost: 300, description: "Increases food cap" },
  { name: "Auto Mine", cost: 500, description: "Produces +50 minerals/year" },
  {
    name: "Mineral Storehouse",
    cost: 300,
    description: "Increases mineral cap",
  },
];
