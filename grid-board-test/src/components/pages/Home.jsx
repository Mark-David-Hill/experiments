import { useState } from "react";
import TicTacToeBoard from "../grid-board/TicTacToeBoard";
import LightsOutBoard from "../grid-board/LightsOutBoard";

export default function Home() {
  return (
    <div className="home-container">
      <div className="game-board-wrapper">
        {/* <TicTacToeBoard /> */}
        <LightsOutBoard />
        <TicTacToeBoard />
      </div>
    </div>
  );
}
