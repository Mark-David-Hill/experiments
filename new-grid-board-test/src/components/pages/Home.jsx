import SnakeBoard from "../grid-board/SnakeBoard";
import TopDownBoard from "../grid-board/TopDownBoard";

export default function Home() {
  return (
    <div className="home-container">
      <div className="game-board-wrapper">
        <TopDownBoard />
        <SnakeBoard />
      </div>
    </div>
  );
}
