import { useState, useEffect, use } from "react";

import StatBar from "./StatBar";

import { delay } from "../utils/delay";

import {
  startingValues as sv,
  buildingBonuses as bb,
  buildingChoices,
} from "../config";

function Game() {
  const [year, setYear] = useState(1);
  const [population, setPopulation] = useState(100);
  const [health, setHealth] = useState(sv.health);
  const [food, setFood] = useState(sv.food);
  const [minerals, setMinerals] = useState(sv.minerals);

  const [maxFood, setMaxFood] = useState(sv.maxFood);
  const [maxMinerals, setMaxMinerals] = useState(sv.maxMinerals);

  const [foodBonus, setFoodBonus] = useState(0);
  const [mineralsBonus, setMineralsBonus] = useState(0);

  const [buildings, setBuildings] = useState([]);
  const [message, setMessage] = useState(
    "What project do you want the colonists to work on this year?"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [gameOverState, setGameOverState] = useState(false);

  const getBuildingCount = (buildingName) =>
    buildings.filter((b) => b.name === buildingName).length;

  // Passive effects when buildings change
  useEffect(() => {
    let newFood = sv.maxFood;
    let newMinerals = sv.maxMinerals;
    let foodBonus = 0;
    let mineralsBonus = 0;

    buildings.forEach((b) => {
      switch (b.name) {
        case "Grain Silo":
          newFood += bb.grainSilo;
          break;
        case "Mineral Storehouse":
          newMinerals += bb.mineralStorehouse;
          break;
        case "Auto Farm":
          foodBonus += bb.autoFarm;
          break;
        case "Auto Mine":
          mineralsBonus += bb.autoMine;
          break;
      }
    });

    setMaxFood(newFood);
    setMaxMinerals(newMinerals);
    setFoodBonus(foodBonus);
    setMineralsBonus(mineralsBonus);
  }, [buildings]);

  const getRandomInt = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  const populationChange = (h, p) => {
    let modifier = h < 50 ? -1 : 1;
    let min = Math.floor(p * 0.05 * (h / 100));
    let max = Math.floor(p * 0.1 * (h / 100));
    return modifier * getRandomInt(min, max);
  };

  const build = (building) => {
    if (minerals >= building.cost) {
      setMessage(`Building ${building.name}…`);
      yearPasses("build", building.cost, building);
    } else {
      setMessage(`Not enough minerals for ${building.name}.`);
    }
  };

  const yearPasses = async (action, buildingCost = 0, newBuilding = null) => {
    setIsLoading(true);

    let newFood = food;
    let newMinerals = minerals - buildingCost;
    let newHealth = health;
    let newPopulation = population;
    let messageUpdates = [];

    // 1) Action phase
    if (action === "farm") {
      const produced = Math.floor(population * 2);
      newFood += produced;
      messageUpdates.push(`Farmed ${produced} food.`);
      await delay(1000);
    } else if (action === "mine") {
      const produced = Math.floor(population * 1.8);
      newMinerals += produced;
      messageUpdates.push(`Mined ${produced} minerals.`);
      await delay(1000);
    } else if (action === "build" && newBuilding) {
      setBuildings((prev) => [...prev, newBuilding]);
      messageUpdates.push(`Completed building ${newBuilding.name}.`);
      await delay(1000);
    }

    // 2) Passive bonuses
    if (foodBonus > 0) {
      newFood += foodBonus;
      // messageUpdates.push(`+${foodBonus} food from Auto Farms.`);
    }
    if (mineralsBonus > 0) {
      newMinerals += mineralsBonus;
      // messageUpdates.push(`+${mineralsBonus} minerals from Auto Mines.`);
    }

    // 3) food and health change
    if (newFood >= newPopulation) {
      newFood -= newPopulation;
      if (newHealth < 80) newHealth = Math.min(100, newHealth + 2);
      messageUpdates.push("There was enough food for everyone.");
    } else {
      const loss = 5 + Math.floor(newHealth * 0.2);
      newHealth = Math.max(0, newHealth - loss);
      newPopulation = Math.max(
        0,
        newPopulation - (2 + Math.floor(newPopulation * 0.01))
      );
      newFood = 0;
      messageUpdates.push(
        newHealth > 0
          ? "There wasn't enough food for everyone."
          : "Your colony's health is in critical condition. Citizens are dying."
      );
    }

    newPopulation = Math.max(
      0,
      newPopulation + populationChange(newHealth, newPopulation)
    );
    newFood = Math.min(newFood, maxFood);
    newMinerals = Math.min(newMinerals, maxMinerals);

    // Combine all messages
    setMessage(messageUpdates.join("\n"));

    setFood(newFood);
    setMinerals(newMinerals);
    setHealth(newHealth);
    setPopulation(newPopulation);
    setYear((prev) => prev + 1);
    setIsLoading(false);

    if (newHealth <= 0) {
      setMessage("Your colony has died out completely.");
      setGameOverState(true);
    }
  };

  return (
    <div className="game-container">
      <h1>Project Corix E8</h1>
      <h2>Year: {year}</h2>
      <p style={{ whiteSpace: "pre-wrap", minHeight: "1.5em" }}>{message}</p>

      <div className="year-choice">
        <button
          onClick={() => yearPasses("farm")}
          disabled={isLoading || gameOverState}
        >
          Farm
        </button>
        <button
          onClick={() => yearPasses("mine")}
          disabled={isLoading || gameOverState}
        >
          Mine
        </button>
        <div className="build-choice">
          <p>Build:</p>
          {buildingChoices.map((building) => {
            const count = getBuildingCount(building.name);
            const hasLimit = typeof building.maxCount === "number";
            const reachedMax = hasLimit && count >= building.maxCount;

            return (
              <button
                key={building.name}
                onClick={() => build(building)}
                disabled={
                  isLoading ||
                  gameOverState ||
                  minerals < building.cost ||
                  reachedMax
                }
                title={
                  reachedMax
                    ? `You’ve built the maximum of ${building.maxCount} ${building.name}(s).`
                    : undefined
                }
              >
                {building.name} ({building.cost})
                {hasLimit && (
                  <span
                    style={{ marginLeft: 8, fontSize: "0.9em", opacity: 0.75 }}
                  >
                    {count}/{building.maxCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ width: 500 }}>
        <StatBar label="Health" value={health} max={100} color="#f44336" />
        <StatBar
          label="Population"
          value={population}
          max={sv.maxPopulation}
          color="#4caf50"
        />
        <StatBar label="Food" value={food} max={maxFood} color="#ff9800" />
        <StatBar
          label="Minerals"
          value={minerals}
          max={maxMinerals}
          color="#2196f3"
        />
      </div>

      <h2>Building Slots</h2>
      <div className="building-slots-container">
        {buildingChoices
          .filter((b) => typeof b.maxCount === "number")
          .map((b) => {
            const built = getBuildingCount(b.name);
            return (
              <div key={b.name} className="building-slots-row">
                <span className="building-slots-label">{b.name}</span>
                <div className="building-slots">
                  {Array.from({ length: b.maxCount }).map((_, i) => (
                    <span
                      key={i}
                      className="building-slot"
                      style={{
                        backgroundColor: i < built ? b.color : "#eee",
                        borderColor: "#666",
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
      </div>

      <h2>Bonuses:</h2>
      <div className="card" style={{ margin: "10px 0" }}>
        <p>Food Bonus per Year: {foodBonus}</p>
        <p>Minerals Bonus per Year: {mineralsBonus}</p>
        <p>Max Food Storage: {maxFood}</p>
        <p>Max Minerals Storage: {maxMinerals}</p>
      </div>
    </div>
  );
}

export default Game;
