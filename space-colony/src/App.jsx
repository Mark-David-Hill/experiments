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

  const [month, setMonth] = useState(1);
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
    "What project do you want to start this month?"
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
    let nf = startingMaxFood,
      nm = startingMaxMinerals;
    let fb = 0,
      mb = 0;

    buildings.forEach((b) => {
      switch (b.name) {
        case "Grain Silo":
          nf += grainSiloBonus;
          break;
        case "Mineral Storehouse":
          nm += mineralStorehouseBonus;
          break;
        case "Auto Farm":
          fb += autoFarmBonus;
          break;
        case "Auto Mine":
          mb += autoMineBonus;
          break;
      }
    });

    setMaxFood(nf);
    setMaxMinerals(nm);
    setFoodBonus(fb);
    setMineralsBonus(mb);
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

  // Build now only enqueues the building; cost handled in monthPasses :contentReference[oaicite:3]{index=3}
  const build = (building) => {
    if (minerals >= building.cost) {
      setBuildings((prev) => [...prev, building]);
      setMessage(`Building ${building.name}…`);
      monthPasses("build", building.cost);
    } else {
      setMessage(`Not enough minerals for ${building.name}.`);
    }
  };

  // Month logic now atomically handles cost + production + consumption :contentReference[oaicite:4]{index=4}
  const monthPasses = async (action, buildingCost = 0) => {
    setIsLoading(true);

    // Start from current state
    let nf = food;
    let nm = minerals - buildingCost; // subtract cost here
    let nh = health;
    let np = population;

    // 1) Action phase
    if (action === "farm") {
      const produced = Math.floor(population * 2);
      nf += produced;
      setMessage(`Farmed ${produced} food.`);
      await delay(1000);
    } else if (action === "mine") {
      const produced = Math.floor(population * 1.8);
      nm += produced;
      setMessage(`Mined ${produced} minerals.`);
      await delay(1000);
    }

    // 2) Passive bonuses
    nf += foodBonus;
    nm += mineralsBonus;

    // 3) Consumption & health
    if (nf >= np) {
      nf -= np;
      if (nh < 80) nh += 2;
      setMessage(`Everyone fed`);
    } else {
      const loss = 5 + Math.floor(nh * 0.2);
      nh = Math.max(0, nh - loss);
      np -= 2 + Math.floor(np * 0.01);
      nf = 0;
      setMessage(
        nh > 0
          ? "Food shortfall: health down."
          : "Critical shortage: people dying."
      );
    }

    // 4) Population change
    np += populationChange(nh, np);

    // Commit all updates together
    setFood(nf);
    setMinerals(nm);
    setHealth(nh);
    setPopulation(np);
    setMonth((m) => m + 1);
    setIsLoading(false);
  };

  return (
    <>
      <h1>Project Corix E8</h1>
      <h2>Month: {month}</h2>
      <p style={{ whiteSpace: "pre-wrap" }}>{message}</p>

      <div className="month-choice">
        <button onClick={() => monthPasses("farm")} disabled={isLoading}>
          Farm
        </button>
        <button onClick={() => monthPasses("mine")} disabled={isLoading}>
          Mine
        </button>
        <div className="build-choice">
          <p>Build:</p>
          {buildingChoices.map((b) => (
            <button key={b.name} onClick={() => build(b)} disabled={isLoading}>
              {b.name}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ width: 500 }}>
        <StatBar
          label="Population"
          value={population}
          max={startingMaxPopulation}
          color="#4caf50"
        />
        <StatBar label="Food" value={food} max={maxFood} color="#ff9800" />
        <StatBar label="Health" value={health} max={100} color="#f44336" />
        <StatBar
          label="Minerals"
          value={minerals}
          max={maxMinerals}
          color="#2196f3"
        />
      </div>

      <h2>Buildings:</h2>
      <div className="card">
        {buildings.map((b, i) => (
          <p key={i}>{b.name}</p>
        ))}
      </div>
    </>
  );
}

export default App;
