import { useState } from "react";
import "./App.css";

import StatBar from "./components/StatBar";

import { delay } from "./utils/delay";

function App() {
  const [month, setMonth] = useState(1);
  const [population, setPopulation] = useState(100);
  const [health, setHealth] = useState(80);
  const [food, setFood] = useState(250);
  const [minerals, setMinerals] = useState(30);
  const [maxPopulation, setMaxPopulation] = useState(1000);
  const [maxFood, setMaxFood] = useState(1000);
  const [maxMinerals, setMaxMinerals] = useState(1000);
  const [buildings, setBuildings] = useState([]);
  const [message, setMessage] = useState(
    "What project do you want to start this month?"
  );
  const [isLoading, setIsLoading] = useState(false);

  const buildingChoices = [
    {
      name: "Auto Farm",
      cost: 500,
      description: "Produces an additional 50 food every year",
    },
    {
      name: "Grain Silo",
      cost: 300,
      description: "Increases the max amount of food storage by 500",
    },
    {
      name: "Auto Mine",
      cost: 700,
      description: "Produces an additional 50 minerals year",
    },
    {
      name: "Mineral Storehouse",
      cost: 300,
      description: "Increases the max amount of mineral storage by 500",
    },
  ];

  const getRandomInt = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  const populationChange = (health, population) => {
    let modifier = 1;
    let min = 0;
    let max = 0;

    if (health < 30) {
      modifier = -1;
      min = Math.floor(population * 0.2 * ((100 - health) / 100));
      max = Math.floor(population * 0.4 * ((100 - health) / 100));
    } else if (health < 50) {
      modifier = -1;
      min = Math.floor(population * 0.1 * ((100 - health) / 100));
      max = Math.floor(population * 0.2 * ((100 - health) / 100));
    } else if (health < 70) {
      min = Math.floor(population * 0.01 * (health / 100));
      max = Math.floor(population * 0.1 * (health / 100));
    } else {
      min = Math.floor(population * 0.1 * (health / 100));
      max = Math.floor(population * 0.2 * (health / 100));
    }

    return modifier * getRandomInt(min, max);
  };

  const build = (building) => {
    if (minerals > building.cost) {
      setMessage(
        `You spent ${building.cost} minerals and a ${building.name} was built.`
      );
      setBuildings((prev) => [...prev, building]);
      monthPasses();
    } else {
      setMessage(
        `You don't have enough minerals to build ${building.name}. It costs ${building.cost} minerals`
      );
    }
  };

  const monthPasses = async (action) => {
    setIsLoading(true);

    const startingPopulation = population;
    const startingFood = food;
    const startingHealth = health;
    const startingMinerals = minerals;
    let foodProduced = 0;
    let mineralsProduced = 0;

    // Phase 1: do action (e.g. farming)
    // if (action === "farm") {
    //   setMessage("The colonists spend the month farming.");
    // } else if (action === "mine") {
    //   setMessage("The colonists spend the month mining");
    // }

    // await delay(2000);

    if (action === "farm") {
      foodProduced = Math.floor(startingPopulation * 2);
      setFood(startingFood + foodProduced);
      setMessage(`${foodProduced} food was produced.`);
    } else if (action === "mine") {
      mineralsProduced = Math.floor(startingPopulation * 1.8);
      setMinerals(startingMinerals + startingPopulation);
      setMessage(`the colonists mined ${mineralsProduced} minerals.`);
    }

    // Phase 2: month passes
    await delay(2000);
    setMessage("A year passes...");

    // Phase 3: consumption & health
    await delay(2000);

    const totalFood = startingFood + foodProduced;
    if (totalFood >= startingPopulation) {
      setFood((prev) => prev - startingPopulation);
      if (health < 80) {
        setHealth(startingHealth + 2);
      }
      setMessage(
        `You had enough food for everyone. Food produced: ${foodProduced}. Food consumed: ${startingPopulation}.`
      );
    } else {
      const healthLoss = 5 + Math.floor(startingHealth * 0.2);
      if (startingHealth - healthLoss > 0) {
        setHealth((prev) => prev - healthLoss);
        setPopulation((prev) => prev - 2 - Math.floor(prev * 0.01));
        setMessage("Uh oh, you didn't have enough food for everyone.");
      } else {
        setPopulation((prev) => prev - 2 - Math.floor(prev * 0.2));
        setHealth(0);
        setMessage("The health of your colony is critical. People are dying.");
      }
      setFood(0);
    }

    const popChange = populationChange(health, population);
    console.log(popChange);

    setPopulation((prev) => prev + popChange);
    setMonth((prev) => prev + 1);
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
          {buildingChoices.map((building) => {
            return (
              <button onClick={() => build(building)} disabled={isLoading}>
                {building.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ width: "500px" }}>
        <StatBar
          label="Population"
          value={population}
          max={maxPopulation}
          color="#4caf50"
        />
        <StatBar label="Health" value={health} max={100} color="#f44336" />
        <StatBar label="Food" value={food} max={maxFood} color="#ff9800" />
        <StatBar
          label="Minerals"
          value={minerals}
          max={maxMinerals}
          color="#2196f3"
        />
      </div>

      <h2>Buildings:</h2>
      <div className="card">
        {buildings.map((building) => {
          return <p>{building.name}</p>;
        })}
      </div>
    </>
  );
}

export default App;
