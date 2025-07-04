import React from "react";

const GridCell = ({ cellData, onClick }) => {
  let cellStyle = {
    border: "2px solid #333",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: "24px",
    fontWeight: "bold",
    backgroundColor: "#f9f9f9",
    margin: "2px",
    borderRadius: "4px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    transform: cellData.rotation ? `rotate(${cellData.rotation}deg)` : "none",
  };

  return (
    <div onClick={onClick} className={cellData.classNames} style={cellStyle}>
      {cellData.text}
    </div>
  );
};

export default GridCell;
