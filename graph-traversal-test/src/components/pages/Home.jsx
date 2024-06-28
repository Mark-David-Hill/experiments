import { useState, useEffect } from "react";

export default function Home() {
  const [gameBoard, setGameBoard] = useState(null);
  const [hasPath, setHasPath] = useState(false);

  class Space {
    constructor(isLand, isStart, alreadyExplored, isDestination) {
      this.isLand = isLand;
      this.isStart = isStart;
      this.alreadyExplored = alreadyExplored;
      this.isDestination = isDestination;
      this.color = isLand ? 1 : 2;
    }
  }

  const rowCount = 12;
  const colCount = 12;

  const targetRow = 2;
  const targetCol = 2;

  const checkForPath = (srcCoord, dstCoord) => {
    const getAdjacentSpaces = (coordinates) => {
      const [row, col] = coordinates;
      let adjacentSpaces = [];
      if (row - 1 >= 0 && gameBoard[row - 1][col].isLand) {
        adjacentSpaces.push([row - 1, col]);
      }
      if (row + 1 <= rowCount - 1 && gameBoard[row + 1][col].isLand) {
        adjacentSpaces.push([row + 1, col]);
      }
      if (col - 1 >= 0 && gameBoard[row][col - 1].isLand) {
        adjacentSpaces.push([row, col - 1]);
      }
      if (col + 1 <= colCount - 1 && gameBoard[row][col + 1].isLand) {
        adjacentSpaces.push([row, col + 1]);
      }

      return adjacentSpaces;
    };

    const recursiveExploration = (coordinates) => {
      console.log("recursive exploration start");
      console.log("coordinates", coordinates);
      if (coordinates[0] === targetRow && coordinates[1] === targetCol) {
        console.log("SET HAS PATH TO TRUE");
        setHasPath(true);
      } else {
        const adjacentSpaces = getAdjacentSpaces(coordinates);
        console.log("adjacent spaces", adjacentSpaces);
        if (adjacentSpaces) {
          adjacentSpaces.forEach((coordinates) => {
            const [rowIndex, colIndex] = coordinates;
            const space = virtualBoard[rowIndex][colIndex];
            if (
              !space?.alreadyExplored &&
              space?.isLand &&
              !space?.isDestination
            ) {
              virtualBoard[rowIndex][colIndex] = new Space(
                true,
                false,
                true,
                false
              );
              recursiveExploration([rowIndex, colIndex]);
            } else if (
              !space?.alreadyExplored &&
              space?.isLand &&
              space?.isDestination
            ) {
              virtualBoard[rowIndex][colIndex] = new Space(
                true,
                false,
                true,
                true
              );
              recursiveExploration([rowIndex, colIndex]);
            }
          });
        }
      }
    };

    const virtualBoard = gameBoard;

    console.log("VIRTUAL BOARD", virtualBoard);

    if (virtualBoard) {
      virtualBoard.forEach((row) => {
        row.forEach((space) => {
          space.alreadyExplored = false;
        });
      });
      virtualBoard[0][0] = new Space(true, true, true, false);
      recursiveExploration([0, 0]);

      setGameBoard(virtualBoard);
    }
  };

  // const getRandNum = () => Math.floor(Math.random() * 2) + 1;

  const getRandBool = () => {
    const randInt = Math.floor(Math.random() * 2) + 1;
    const randBool = randInt === 1 ? true : false;
    return randBool;
  };

  useEffect(() => {
    console.log("use effect");
    const virtualBoard = [];

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
      const newRow = [];
      for (let colIndex = 0; colIndex < colCount; colIndex++) {
        let newSpace = new Space(getRandBool(), false, false, false);
        if (rowIndex === 0 && colIndex === 0) {
          newSpace = new Space(true, true, true, false);
        } else if (rowIndex === targetRow && colIndex === targetCol) {
          newSpace = new Space(true, false, false, true);
        }

        newRow.push(newSpace);
      }
      virtualBoard.push(newRow);
    }

    setGameBoard(virtualBoard);

    console.log("Game Board:", gameBoard);

    checkForPath();
  }, [Space, checkForPath, gameBoard]);

  return (
    <div className="home-container">
      <div className="game-board-wrapper">
        {gameBoard &&
          gameBoard.map((row, rowIndex) => {
            return (
              <div className="game-row" key={rowIndex}>
                {row.map((space, spaceIndex) => {
                  return (
                    <div
                      className={
                        `color${space.color}` +
                        `${space.isStart ? " start" : ""}` +
                        `${space.isDestination ? " destination" : ""}`
                      }
                      key={spaceIndex}
                    ></div>
                  );
                })}
              </div>
            );
          })}
      </div>
      <div>
        <p>
          {hasPath === true
            ? "There is a path to the destination"
            : "There is no path to the destination"}
        </p>
      </div>
    </div>
  );
}
