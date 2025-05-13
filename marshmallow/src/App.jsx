import { useState } from "react";
import "./App.css";

function App() {
  const [petName, setPetName] = useState("Marshmallow");
  const [happiness, setHappiness] = useState(10);
  const [hunger, setHunger] = useState(0);
  const [stress, setStress] = useState(0);
  const [money, setMoney] = useState(20);
  const [food, setFood] = useState(0);
  const [strength, setStrength] = useState(5);
  const [speed, setSpeed] = useState(5);
  const [stamina, setStamina] = useState(5);
  const [intelligence, setIntelligence] = useState(5);
  const [week, setWeek] = useState(1);
  const [message, setMessage] = useState("What do you want to do this week?");

  const buyFood = () => {
    if (money >= 10) {
      setFood((prev) => prev + 1);
      setMoney((prev) => prev - 10);
      setMessage(`You bought some food for ${petName}`);
    } else {
      setMessage("You don't have enough money");
    }
  };

  const play = () => {
    setStress((prevStress) => prevStress - 10);
    setHappiness((prevHappiness) => prevHappiness + 5);
    setMessage(`You played with ${petName}. They look happy!`);
    weekPasses();
  };

  const train = (stat) => {
    switch (stat) {
      case "strength":
        setStrength((prev) => prev + 4);
        break;
      case "speed":
        setSpeed((prev) => prev + 4);
        break;
      case "stamina":
        setStamina((prev) => prev + 4);
        break;
      case "intelligence":
        setIntelligence((prev) => prev + 4);
        break;
    }
    setStress((prev) => prev + 2);
    setMessage(
      `You trained with ${petName}. Their ${
        stat === "strength"
          ? "strength"
          : stat === "speed"
          ? "speed"
          : stat === "stamina"
          ? "stamina"
          : state === "intelligence"
          ? "intelligence"
          : "???"
      } increased.`
    );
    weekPasses();
  };

  const work = () => {
    setMoney((prev) => prev + 50);
    setHappiness((prev) => prev - 3);
    setStress((prev) => prev + 3);
    setMessage(
      `You spent the week working. ${petName} looks a little lonely, but you made $50`
    );
    weekPasses();
  };

  const feed = () => {
    if (food > 0) {
      setFood((prev) => prev - 1);
      setHunger((prev) => (prev - 10 > 0 ? prev - 10 : 0));
      setMessage(`You fed ${petName}`);
      setHappiness((prev) => prev + 1);
    }
  };

  const weekPasses = () => {
    setWeek((prevWeek) => prevWeek + 1);

    const newHunger = hunger + 5;
    if (newHunger > 10) {
      setStress((prevStress) => prevStress + 1);
    }

    setHunger(newHunger);
  };

  return (
    <>
      <h1>Marshmallow</h1>
      <h2>Week: {week}</h2>
      <p>{message}</p>
      <div className="week-choice">
        <button onClick={play}>Play with {petName}</button>
        <button onClick={work}>Leave {petName} for Work</button>
        <div className="training-choices">
          <button onClick={() => train("strength")}>Train Strength</button>
          <button onClick={() => train("speed")}>Train Speed</button>
          <button onClick={() => train("stamina")}>Train Stamina</button>
          <button onClick={() => train("intelligence")}>Train Strength</button>
        </div>
      </div>

      <div className="message-wrapper">
        <p>{}</p>
      </div>

      <div className="card">
        <div className="stats">
          <p>Happiness: {happiness}</p>
          <p>Hunger: {hunger}</p>
          <p>Stress: {stress}</p>
          <p>Money: {money}</p>
          <p>Food: {food}</p>
          <p>Strength: {strength}</p>
          <p>Speed: {speed}</p>
          <p>Stamina: {stamina}</p>
          <p>Intelligence: {intelligence}</p>
        </div>
        <div
          className="pet"
          style={{ backgroundColor: "blue", width: "100px", height: "100px" }}
        ></div>
        <button onClick={buyFood}>Buy Food ($10)</button>
        <button onClick={feed}>Feed {petName}</button>
      </div>
    </>
  );
}

export default App;
