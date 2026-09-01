"use client";

export function LineChart({
  data,
  max = 100,
  animationDuration = 1800,
}: {
  data: {
    label: string;
    value: number;
  }[];
  max?: number;
  animationDuration?: number;
  animationEasing?: "linear" | "ease-in" | "ease-out" | "ease-in-out";
}) {
  const width = 700;
  const height = 260;

  const left = 42;
  const right = 20;
  const top = 25;
  const bottom = 35;

  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;

  const points = data.map((item, index) => {
    const x = left + (index / Math.max(data.length - 1, 1)) * chartWidth;

    const y = top + chartHeight - (item.value / max) * chartHeight;

    return {
      x,
      y,
      ...item,
    };
  });

  const path =
    points.length > 0
      ? points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ")
      : "";

  const durationSeconds = animationDuration / 1000;
  const pointIntervalSeconds =
    data.length > 1 ? Math.max(durationSeconds / (data.length - 1), 0.12) : durationSeconds;

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        {[0, 25, 50, 75, 100].map((value) => {
          const y = top + chartHeight - (value / 100) * chartHeight;

          return (
            <g key={value}>
              <line
                x1={left}
                x2={width - right}
                y1={y}
                y2={y}
                className="stroke-border-subtle"
                strokeWidth="1"
              />

              <text x="5" y={y + 3} className="fill-text-dim text-[9px]">
                {value}%
              </text>
            </g>
          );
        })}

        {path && (
          <path
            d={path}
            fill="none"
            pathLength="1"
            className="stroke-cyan-400 safety-line-draw"
            style={{ animationDuration: `${durationSeconds}s` }}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="1"
            strokeDashoffset="1"
          />
        )}

        {points.map((point, index) => {
          const delay = `${index * pointIntervalSeconds}s`;

          return (
            <g key={point.label}>
              <circle
                cx={point.x}
                cy={point.y}
                r="5"
                className="fill-surface stroke-cyan-400 safety-line-point"
                strokeWidth="3"
                style={{ animationDelay: delay }}
              />

              <text
                x={point.x}
                y={point.y - 12}
                textAnchor="middle"
                className="fill-text-muted text-[9px] safety-line-value"
                style={{
                  animationDelay: `${index * pointIntervalSeconds + 0.15}s`,
                }}
              >
                {point.value}%
              </text>

              <text
                x={point.x}
                y={height - 10}
                textAnchor="middle"
                className="fill-text-dim text-[9px] safety-line-label"
                style={{
                  animationDelay: `${Math.max(index * pointIntervalSeconds - 0.1, 0)}s`,
                }}
              >
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
