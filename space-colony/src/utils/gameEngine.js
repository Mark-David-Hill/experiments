import { buildingBonuses as bb, startingValues as sv } from "../config";

export function getRandomInt(min, max) {
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

export function populationChange(health, population) {
  const modifier = health < 50 ? -1 : 1;
  const min = Math.floor(population * 0.05 * (health / 100));
  const max = Math.floor(population * 0.1 * (health / 100));
  return modifier * getRandomInt(min, max);
}

export function calculateBonuses(buildings) {
  let maxFood = sv.maxFood;
  let maxMinerals = sv.maxMinerals;
  let foodBonus = 0;
  let mineralsBonus = 0;

  buildings.forEach((b) => {
    switch (b.name) {
      case "Grain Silo":
        maxFood += bb.grainSilo;
        break;
      case "Mineral Storehouse":
        maxMinerals += bb.mineralStorehouse;
        break;
      case "Auto Farm":
        foodBonus += bb.autoFarm;
        break;
      case "Auto Mine":
        mineralsBonus += bb.autoMine;
        break;
      default:
        break;
    }
  });

  return { maxFood, maxMinerals, foodBonus, mineralsBonus };
}

export function tick(state, bonuses) {
  let { food, minerals, health, population, year, buildings } = state;
  const { foodBonus, mineralsBonus } = bonuses;
  let message = "";

  // 1) Apply passive production
  food += foodBonus;
  minerals += mineralsBonus;

  // 2) Food consumption and health adjustment
  if (food >= population) {
    food -= population;
    if (health < 80) health += 2;
    message = "There was enough food for everyone.";
  } else {
    const loss = 5 + Math.floor(health * 0.2);
    health = Math.max(0, health - loss);
    population = Math.max(0, population - (2 + Math.floor(population * 0.01)));
    food = 0;
    message =
      health > 0
        ? "There wasn't enough food for everyone."
        : "Your colony's health is in critical condition. Citizens are dying.";
  }

  // 3) Population growth or decline
  population += populationChange(health, population);

  // 4) Advance year
  year += 1;

  return {
    ...state,
    food,
    minerals,
    health,
    population,
    year,
    message,
  };
}
