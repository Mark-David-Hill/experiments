function StatBar({ label, value, max, color, maxRowWidth = 500 }) {
  const unitWidth = label === "Health" ? 5 : 0.5;
  const unitsPerRow = Math.floor(maxRowWidth / unitWidth);

  const rows = [];
  let remMax = max;
  let remValue = value;
  while (remMax > 0) {
    const rowMax = Math.min(remMax, unitsPerRow);
    const rowValue = Math.max(0, Math.min(remValue, rowMax));
    rows.push({ rowMax, rowValue });
    remMax -= rowMax;
    remValue -= rowValue;
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 14, marginBottom: 4 }}>
        {label}: {value}/{max}
      </div>

      {rows.map(({ rowMax, rowValue }, i) => {
        const pct = Math.floor((rowValue / rowMax) * 100);
        return (
          <div
            key={i}
            style={{
              width: rowMax * unitWidth,
              background: "#ddd",
              borderRadius: 4,
              overflow: "hidden",
              height: 16,
              marginBottom: 4,
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
        );
      })}
    </div>
  );
}

export default StatBar;
