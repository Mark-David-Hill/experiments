class Cell {
  constructor(color, player = 0) {
    this.color = color;
    this.player = player;
  }
}

class VirtualGrid {
  constructor(
    gridEl,
    rowCount,
    colCount,
    colors,
    grid = [],
    p1Color = "",
    p2Color = ""
  ) {
    this.gridEl = gridEl;
    this.rowCount = rowCount;
    this.colCount = colCount;
    this.colors = colors;
    this.grid = grid;
    (p1Color = ""), (p2Color = "");
  }

  getRandColor = () => this.colors[Math.floor(Math.random() * 7)];

  resetGrid() {
    this.grid = [];
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
      this.grid.push([]);
      for (let colIndex = 0; colIndex < colCount; colIndex++) {
        const cell = new Cell();
        const color = this.getRandColor();
        cell.color = color;
        if (rowIndex === 0 && colIndex === 0) {
          this.p1Color = color;
          this.player = 1;
        }
      }
    }
  }

  clearGridEl() {
    while (this.grid.firstChild) {
      this.grid.removeChild(this.grid.firstChild);
    }
  }

  drawGrid() {
    this.clearGridEl();
    for (let rowIndex = 0; rowIndex < this.rowCount; rowIndex++) {
      const rowEl = document.createElement("div");
      rowEl.classList.add("game-row");
      boardEl.appendChild(rowEl);
      for (let colIndex = 0; colIndex < colCount; colIndex++) {
        const cellEl = document.createElement("div");
        // console.log(this.grid[rowIndex]);
        // if (this.grid[rowIndex][colIndex].player === 1) {
        //   cellEl.classList.add("p1");
        // }
        const randNum = Math.floor(Math.random() * 7);
        cellEl.style.backgroundColor = colors[randNum];
        rowEl.appendChild(cellEl);
      }
    }
  }
}

function initializeButtons(buttonArray, colors) {
  for (let i = 0; i < buttons.length; i++) {
    buttonArray[i].style.backgroundColor = colors[i];
    buttonArray[i].addEventListener("click", () => {
      setColor(colors[i]);
    });
  }
}

buttons = document
  .getElementsByClassName("color-buttons-wrapper")[0]
  .getElementsByTagName("button");
boardEl = document.getElementsByClassName("game-board-wrapper")[0];

const colors = ["red", "orange", "yellow", "green", "blue", "indigo", "violet"];
const rowCount = 5;
const colCount = 5;
// initializeBoard(board, numRows, numColumns, colors);
const vBoard = new VirtualGrid(boardEl, rowCount, colCount, colors);
initializeButtons(buttons, colors);

vBoard.resetGrid();
vBoard.drawGrid();
