"use client";

import { Legend } from "../Legend";

export function GroupedBarChart({
  data,
  firstLabel,
  secondLabel,
}: {
  data: {
    label: string;
    first: number;
    second: number;
  }[];
  firstLabel: string;
  secondLabel: string;
}) {
  const max = Math.max(...data.flatMap((item) => [item.first, item.second]), 1);

  return (
    <div>
      <div className="flex h-56 items-end gap-4 border-b border-border-subtle px-2 pb-8">
        {data.map((item, index) => (
          <div
            key={item.label}
            className="relative flex h-full flex-1 items-end justify-center gap-1"
          >
            <div className="relative flex h-full items-end">
              <div
                className="w-7 rounded-t bg-amber-500 safety-bar-grow"
                style={{
                  animationDelay: `${index * 0.14}s`,
                  height: `${Math.max((item.first / max) * 100, item.first > 0 ? 5 : 0)}%`,
                }}
              />

              {item.first > 0 && (
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-text-muted">
                  {item.first}
                </span>
              )}
            </div>

            <div className="relative flex h-full items-end">
              <div
                className="w-7 rounded-t bg-emerald-500 safety-bar-grow"
                style={{
                  animationDelay: `${index * 0.14 + 0.06}s`,
                  height: `${Math.max((item.second / max) * 100, item.second > 0 ? 5 : 0)}%`,
                }}
              />

              {item.second > 0 && (
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-text-muted">
                  {item.second}
                </span>
              )}
            </div>

            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] text-text-dim">
              {item.label}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-5">
        <Legend color="bg-amber-500" label={firstLabel} />

        <Legend color="bg-emerald-500" label={secondLabel} />
      </div>
    </div>
  );
}
