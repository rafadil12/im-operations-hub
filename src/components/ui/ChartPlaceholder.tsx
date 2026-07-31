import type { BarItem } from "@/data/overview-mock";

type BarChartPlaceholderProps = {
  items: BarItem[];
};

export function BarChartPlaceholder({ items }: BarChartPlaceholderProps) {
  return (
    <div className="space-y-2.5">
      {items.map((item) => {
        const width = Math.max(8, Math.round((item.value / item.max) * 100));
        return (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between text-[11px] text-text-muted">
              <span className="truncate pr-2">{item.label}</span>
              <span className="text-text">{item.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-border-subtle">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${width}%`, backgroundColor: item.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

type TrendChartPlaceholderProps = {
  legend: { label: string; color: string }[];
};

export function TrendChartPlaceholder({ legend }: TrendChartPlaceholderProps) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-3">
        {legend.map((item) => (
          <span
            key={item.label}
            className="inline-flex items-center gap-1.5 text-[11px] text-text-muted"
          >
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </span>
        ))}
      </div>
      <svg
        viewBox="0 0 320 90"
        className="h-24 w-full"
        role="img"
        aria-label="Ticket trend chart placeholder"
      >
        <polyline
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          points="0,60 45,52 90,55 135,40 180,45 225,28 270,35 320,22"
        />
        <polyline
          fill="none"
          stroke="#22c55e"
          strokeWidth="2"
          points="0,70 45,65 90,58 135,50 180,42 225,38 270,30 320,25"
        />
        <polyline
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2"
          points="0,75 45,72 90,68 135,70 180,62 225,66 270,58 320,55"
        />
      </svg>
    </div>
  );
}

type DonutChartPlaceholderProps = {
  legend: { label: string; color: string }[];
  /** Percentages 0–100 aligned with legend order. Defaults to mock split. */
  segments?: number[];
  centerValue?: string;
  centerLabel?: string;
};

function buildConicGradient(
  legend: { color: string }[],
  segments: number[],
): string {
  let cursor = 0;
  const stops: string[] = [];
  for (let i = 0; i < legend.length; i++) {
    const share = segments[i] ?? 0;
    const start = cursor;
    cursor = Math.min(100, cursor + share);
    stops.push(`${legend[i].color} ${start}% ${cursor}%`);
  }
  if (cursor < 100) {
    stops.push(`var(--border) ${cursor}% 100%`);
  }
  return `conic-gradient(${stops.join(", ")})`;
}

export function DonutChartPlaceholder({
  legend,
  segments,
  centerValue = "78%",
  centerLabel = "Done",
}: DonutChartPlaceholderProps) {
  const resolvedSegments =
    segments && segments.length === legend.length
      ? segments
      : legend.map((_, i) => (i === 0 ? 78.4 : i === 1 ? 16.8 : 4.8));

  return (
    <div className="flex items-center gap-5">
      <div
        className="relative size-28 shrink-0 rounded-full"
        style={{
          background: buildConicGradient(legend, resolvedSegments),
        }}
        role="img"
        aria-label="Task status donut chart"
      >
        <div className="absolute inset-3 rounded-full bg-surface" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-semibold text-text">{centerValue}</p>
            <p className="text-[10px] text-text-dim">{centerLabel}</p>
          </div>
        </div>
      </div>
      <ul className="space-y-2">
        {legend.map((item) => (
          <li
            key={item.label}
            className="flex items-center gap-2 text-xs text-text-muted"
          >
            <span
              className="size-2.5 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
