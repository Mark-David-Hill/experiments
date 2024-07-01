import { useState } from "react";
import TicTacToeBoard from "../grid-board/TicTacToeBoard";

export default function Home() {
  return (
    <div className="home-container">
      <div className="game-board-wrapper">
        <TicTacToeBoard />
      </div>
    </div>
  );
}
