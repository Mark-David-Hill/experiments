function setColor(color) {
  currentColor = color
  console.log(currentColor)
}

function initializeBoard(boardEl, numRows, numColumns, colors) {
  for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
    const row = document.createElement("div")
    row.classList.add("game-row")
    boardEl.appendChild(row)
    for (let colIndex = 0; colIndex < numColumns; colIndex++) {
      const space = document.createElement("div")
      const randNum = Math.floor(Math.random() * 7)
      space.style.backgroundColor = colors[randNum]
      if (rowIndex === 0 && colIndex === 0) {
        setColor(colors[randNum])
      }
      row.appendChild(space)
    }
  }
}

function initializeButtons (buttonArray, colors) {
  for (let i = 0; i < buttons.length; i++) {
    buttonArray[i].style.backgroundColor = colors[i]
    buttonArray[i].addEventListener("click", () => {
      setColor(colors[i])
    })
  }
}

// getAdjacentSpaces (space) {

// }

buttons = document.getElementsByClassName("color-buttons-wrapper")[0].getElementsByTagName('button');
board = document.getElementsByClassName("game-board-wrapper")[0]
// rows = document.getElementsByClassName("game-board-wrapper")[0].getElementsByClassName('game-row')
colors = ["red", "orange", "yellow", "green", "blue", "indigo", "violet"]
currentColor = "red";

const numRows = 5;
const numColumns = 5;
initializeBoard(board, numRows, numColumns, colors)
initializeButtons(buttons, colors)