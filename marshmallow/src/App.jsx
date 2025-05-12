import { useState } from "react";
import "./App.css";

function App() {
  const [happiness, setHappiness] = useState(10);
  const [hunger, setHunger] = useState(0);
  const [stress, setStress] = useState(0);
  const [money, setMoney] = useState(20);
  const [food, setFood] = useState(0);
  const [strength, setStrength] = useState(5);
  const [speed, setSpeed] = useState(5);
  const [stamina, setStamina] = useState(5);
  const [intelligence, setIntelligence] = useState(5);
  const [skill, setSkill] = useState(10);
  const [week, setWeek] = useState(1);

  const buyFood = () => {
    if (money >= 10) {
      setFood((prev) => prev + 1);
      setMoney((prev) => prev - 10);
    }
  };

  const play = () => {
    setStress((prevStress) => prevStress - 10);
    setHappiness((prevHappiness) => prevHappiness + 5);
    weekPasses();
  };

  const train = () => {
    setSkill((prev) => prev + 10);
    setStress((prev) => prev + 5);
    weekPasses();
  };

  const work = () => {
    setMoney((prev) => prev + 50);
    setHappiness((prev) => prev - 3);
    setStress((prev) => stress + 3);
    weekPasses();
  };

  const feed = () => {
    if (food > 0) {
      setFood((prev) => prev - 1);
      setHunger((prev) => (prev - 10 > 0 ? prev - 10 : 0));
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
      <p>What do you want to do this week?</p>
      <div className="week-choice">
        <button onClick={play}>Play with Marhsmallow</button>
        <button onClick={train}>Train Marshmallow</button>
        <button onClick={work}>Leave Marshmallow for Work</button>
      </div>
      <div className="card">
        <div className="stats">
          <p>Happiness: {happiness}</p>
          <p>Hunger: {hunger}</p>
          <p>Stress: {stress}</p>
          <p>Money: {money}</p>
          <p>Food: {food}</p>
          <p>Skill: {skill}</p>
        </div>
        <div
          className="marshmallow"
          style={{ backgroundColor: "blue", width: "100px", height: "100px" }}
        ></div>
        <button onClick={buyFood}>Buy Food ($10)</button>
        <button onClick={feed}>Feed Marshmallow</button>
      </div>
    </>
  );
}

export default App;
