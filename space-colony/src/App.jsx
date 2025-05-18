import { useState, useEffect } from "react";
import "./App.css";

import StatBar from "./components/StatBar";
import { delay } from "./utils/delay";

function App() {
  const startingMaxFood = 1000;
  const startingMaxMinerals = 1000;
  const startingMaxPopulation = 1000;
  const startingFood = 250;
  const startingMinerals = 100;

  const autoFarmBonus = 50;
  const autoMineBonus = 50;
  const grainSiloBonus = 500;
  const mineralStorehouseBonus = 500;

  const [year, setYear] = useState(1);
  const [population, setPopulation] = useState(100);
  const [health, setHealth] = useState(80);
  const [food, setFood] = useState(startingFood);
  const [minerals, setMinerals] = useState(startingMinerals);

  const [maxFood, setMaxFood] = useState(startingMaxFood);
  const [maxMinerals, setMaxMinerals] = useState(startingMaxMinerals);

  const [foodBonus, setFoodBonus] = useState(0);
  const [mineralsBonus, setMineralsBonus] = useState(0);

  const [buildings, setBuildings] = useState([]);
  const [message, setMessage] = useState(
    "What project do you want the colonists to work on this year?"
  );
  const [isLoading, setIsLoading] = useState(false);

  const buildingChoices = [
    { name: "Auto Farm", cost: 500, description: "Produces +50 food/year" },
    { name: "Grain Silo", cost: 300, description: "Increases food cap" },
    { name: "Auto Mine", cost: 700, description: "Produces +50 minerals/year" },
    {
      name: "Mineral Storehouse",
      cost: 300,
      description: "Increases mineral cap",
    },
  ];

  // Passive effects when buildings change :contentReference[oaicite:2]{index=2}
  useEffect(() => {
    let newFood = startingMaxFood;
    let newMinerals = startingMaxMinerals;
    let foodBonus = 0;
    let mineralsBonus = 0;

    buildings.forEach((b) => {
      switch (b.name) {
        case "Grain Silo":
          newFood += grainSiloBonus;
          break;
        case "Mineral Storehouse":
          newMinerals += mineralStorehouseBonus;
          break;
        case "Auto Farm":
          foodBonus += autoFarmBonus;
          break;
        case "Auto Mine":
          mineralsBonus += autoMineBonus;
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
      setBuildings((prev) => [...prev, building]);
      setMessage(`Building ${building.name}…`);
      yearPasses("build", building.cost);
    } else {
      setMessage(`Not enough minerals for ${building.name}.`);
    }
  };

  const yearPasses = async (action, buildingCost = 0) => {
    setIsLoading(true);

    let newFood = food;
    let newMinerals = minerals - buildingCost;
    let newHealth = health;
    let newPopulation = population;

    // 1) Action phase
    if (action === "farm") {
      const produced = Math.floor(population * 2);
      newFood += produced;
      setMessage(`Farmed ${produced} food.`);
      await delay(1000);
    } else if (action === "mine") {
      const produced = Math.floor(population * 1.8);
      newMinerals += produced;
      setMessage(`Mined ${produced} minerals.`);
      await delay(1000);
    }

    // 2) Passive bonuses
    newFood += foodBonus;
    newMinerals += mineralsBonus;

    // 3) food and health change
    if (newFood >= newPopulation) {
      newFood -= newPopulation;
      if (newHealth < 80) newHealth += 2;
      setMessage(`There was enough food for everyone`);
    } else {
      const loss = 5 + Math.floor(newHealth * 0.2);
      newHealth = Math.max(0, newHealth - loss);
      newPopulation -= 2 + Math.floor(newPopulation * 0.01);
      newFood = 0;
      setMessage(
        newHealth > 0
          ? "There wasn't enough food for everyone."
          : "Your colony's health is in critical condition. Citizens are dying."
      );
    }

    // 4) Population change
    newPopulation += populationChange(newHealth, newPopulation);

    setFood(newFood);
    setMinerals(newMinerals);
    setHealth(newHealth);
    setPopulation(newPopulation);
    setYear((m) => m + 1);
    setIsLoading(false);
  };

  return (
    <>
      <h1>Project Corix E8</h1>
      <h2>Year: {year}</h2>
      <p style={{ whiteSpace: "pre-wrap" }}>{message}</p>

      <div className="year-choice">
        <button onClick={() => yearPasses("farm")} disabled={isLoading}>
          Farm
        </button>
        <button onClick={() => yearPasses("mine")} disabled={isLoading}>
          Mine
        </button>
        <div className="build-choice">
          <p>Build:</p>
          {buildingChoices.map((b) => (
            <button key={b.name} onClick={() => build(b)} disabled={isLoading}>
              {b.name} ({b.cost})
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ width: 500 }}>
        <StatBar label="Health" value={health} max={100} color="#f44336" />
        <StatBar
          label="Population"
          value={population}
          max={startingMaxPopulation}
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

      <h2>Buildings:</h2>
      <div className="card" style={{ display: "flex", gap: "30px" }}>
        {buildings.map((b, i) => (
          <p key={i}>{b.name}</p>
        ))}
      </div>
    </>
  );
}

export default App;
