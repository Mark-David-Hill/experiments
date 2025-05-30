function StatBar({ label, value, max, color }) {
  const percentage = Math.min(100, Math.floor((value / max) * 100));
  const unitWidth = label === "Health" ? 5 : 0.5;
  const totalWidth = max * unitWidth;

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 14, marginBottom: 4 }}>
        {label}: {value}/{max}
      </div>
      <div
        style={{
          width: totalWidth,
          background: "#ddd",
          borderRadius: 4,
          overflow: "hidden",
          height: 16,
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
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
