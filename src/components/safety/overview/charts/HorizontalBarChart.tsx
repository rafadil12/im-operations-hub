"use client";

export function HorizontalBarChart({
  data,
  suffix = "",
}: {
  data: {
    label: string;
    value: number;
  }[];
  suffix?: string;
}) {
  return (
    <div className="space-y-5">
      {data.map((item, index) => (
        <div key={item.label}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-text">{item.label}</span>

            <span className="text-xs font-semibold text-text">
              {item.value}
              {suffix}
            </span>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-bg">
            <div
              className={[
                "h-full rounded-full safety-horizontal-grow",
                item.value >= 90
                  ? "bg-emerald-500"
                  : item.value >= 70
                    ? "bg-amber-500"
                    : "bg-rose-500",
              ].join(" ")}
              style={{
                animationDelay: `${index * 0.12}s`,
                width: `${Math.min(item.value, 100)}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
