import React from "react";

const GridCell = ({ cellData, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={cellData.classNames}
      style={{
        width: "50px",
        height: "50px",
        border: "1px solid black",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
    >
      {cellData.text}
    </div>
  );
};

export default GridCell;
