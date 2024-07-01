import React from "react";

const GridCell = ({ value, onClick }) => {
  return (
    <div
      onClick={onClick}
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
      {value}
    </div>
  );
};

export default GridCell;
