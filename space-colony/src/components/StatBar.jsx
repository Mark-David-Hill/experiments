import React from "react";

function StatBar({ label, value, max, color }) {
  const pct = Math.min(100, Math.floor((value / max) * 100));
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 14, marginBottom: 4 }}>
        {label}: {value}/{max}
      </div>
      <div
        style={{
          background: "#ddd",
          borderRadius: 4,
          overflow: "hidden",
          height: 16,
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            transition: "width 2s ease",
          }}
        />
      </div>
    </div>
  );
}

export default StatBar;
