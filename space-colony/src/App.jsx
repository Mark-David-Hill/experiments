import { useState } from "react";
import "./App.css";

function App() {
  const [month, setMonth] = useState(1);
  const [population, setPopulation] = useState(100);
  const [health, setHealth] = useState(80);
  const [food, setFood] = useState(250);
  const [minerals, setMinerals] = useState(30);
  const [message, setMessage] = useState(
    "What project do you want to start this month?"
  );
  const [isLoading, setIsLoading] = useState(false);

  const monthPasses = () => {
    setIsLoading(true);
    setMessage("A month passes...");
    const startingPopulation = population;
    const startingFood = food;
    const startingHealth = health;

    setTimeout(() => {
      if (startingFood >= startingPopulation) {
        setFood((prev) => prev - population);
        setMessage("You had enough food for everyone");
      } else {
        if (startingHealth - 7 - Math.floor(startingHealth * 0.2) > 0) {
          setHealth((prev) => prev - 5 - Math.floor(prev * 0.2));

          setPopulation((prev) => prev - 2 - Math.floor(prev * 0.01));
          setMessage("Uh oh, you didn't have enough food for everyone.");
        } else {
          setPopulation((prev) => prev - 2 - Math.floor(prev * 0.2));
          setHealth(0);
          setMessage(
            "The health of your colony is critical. People are dying."
          );
        }
        setFood(0);
      }

      setMonth((prevMonth) => prevMonth + 1);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <>
      <h1>Project Corix E8</h1>
      <h2>Month: {month}</h2>
      <p>{message}</p>
      <div className="month-choice">
        <button onClick={monthPasses} disabled={isLoading}>
          Month passes
        </button>
        {/* <button onClick={() => train("strength")}>Train Strength</button>
        <button onClick={() => train("speed")}>Train Speed</button>
        <button onClick={() => train("stamina")}>Train Stamina</button>
        <button onClick={() => train("intelligence")}>Train Strength</button> */}
      </div>

      <div className="card">
        <div className="stats">
          <p>Population: {population}</p>
          <p>Health: {health}</p>
          <p>Food: {food}</p>
          <p>Minerals: {minerals}</p>
        </div>
      </div>
    </>
  );
}

export default App;
