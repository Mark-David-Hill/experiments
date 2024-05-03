import { useState, useEffect } from "react";

export default function Home() {
  const [currentP1Color, setCurrentP1Color] = useState(1);
  const [gameBoard, setGameBoard] = useState(null);

  class Space {
    constructor(color, owner, alreadyCaptured) {
      this.color = color;
      this.owner = owner;
      this.alreadyCaptured = alreadyCaptured;
    }
  }

  const rowCount = 15;
  const colCount = 15;

  const changeColor = (newColor) => {
    const getAdjacentSpaces = (coordinates) => {
      const [row, col] = coordinates;
      let adjacentSpaces = [];
      if (row - 1 >= 0) {
        adjacentSpaces.push([row - 1, col]);
      }
      if (row + 1 <= rowCount - 1) {
        adjacentSpaces.push([row + 1, col]);
      }
      if (col - 1 >= 0) {
        adjacentSpaces.push([row, col - 1]);
      }
      if (col + 1 <= colCount - 1) {
        adjacentSpaces.push([row, col + 1]);
      }

      return adjacentSpaces;
    };

    const recursiveCapture = (coordinates, oldColor, newColor) => {
      console.log("capture");
      const adjacentSpaces = getAdjacentSpaces(coordinates);
      adjacentSpaces.forEach((coordinates) => {
        const [rowIndex, colIndex] = coordinates;
        const space = virtualBoard[rowIndex][colIndex];
        console.log("space.alreadyCaptured", space?.alreadyCaptured);
        console.log("space.color", space?.color);
        if (!space?.alreadyCaptured && space?.color === newColor) {
          console.log("in if statement");
          virtualBoard[rowIndex][colIndex] = new Space(newColor, 1, true);
          recursiveCapture([rowIndex, colIndex], oldColor, newColor);
        }
      });
    };

    const oldColor = currentP1Color;
    const virtualBoard = gameBoard;

    virtualBoard.forEach((row) => {
      row.forEach((space) => {
        space.alreadyCaptured = false;
        if (space.owner === 1) {
          space.color = newColor;
        }
      });
    });

    setCurrentP1Color(newColor);
    virtualBoard[0][0] = new Space(newColor, 1, true);
    recursiveCapture([0, 0], oldColor, newColor);

    setGameBoard(virtualBoard);
  };

  const getRandNum = () => Math.floor(Math.random() * 7) + 1;

  useEffect(() => {
    const virtualBoard = [];

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
      const newRow = [];
      for (let colIndex = 0; colIndex < colCount; colIndex++) {
        let newSpace = new Space(getRandNum(), 0, false);
        if (rowIndex === 0 && colIndex === 0) {
          newSpace = new Space(1, 1, true);
        }
        newRow.push(newSpace);
      }
      virtualBoard.push(newRow);
    }

    setGameBoard(virtualBoard);
  }, []);

  return (
    <div className="home-container">
      <div className="game-board-wrapper">
        {gameBoard &&
          gameBoard.map((row) => {
            return (
              <div className="game-row">
                {row.map((space) => {
                  return (
                    <div
                      className={
                        `color${space.color} ` + (space.owner === 1 && "p1")
                      }
                    ></div>
                  );
                })}
              </div>
            );
          })}
      </div>
      <div className="color-buttons-wrapper">
        <button className="color1" onClick={() => changeColor(1)}></button>
        <button className="color2" onClick={() => changeColor(2)}></button>
        <button className="color3" onClick={() => changeColor(3)}></button>
        <button className="color4" onClick={() => changeColor(4)}></button>
        <button className="color5" onClick={() => changeColor(5)}></button>
        <button className="color6" onClick={() => changeColor(6)}></button>
        <button className="color7" onClick={() => changeColor(7)}></button>
      </div>
    </div>
  );
}
