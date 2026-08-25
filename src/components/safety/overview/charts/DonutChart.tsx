"use client";

import { type SafetyLanguage, safetyText } from "@/lib/safety";

export function DonutChart({
  values,
  language,
}: {
  values: {
    label: string;
    value: number;
    className: string;
  }[];
  language: SafetyLanguage;
}) {
  const total = values.reduce((sum, item) => sum + item.value, 0);

  const radius = 55;

  const circumference = 2 * Math.PI * radius;

  const gap = 3;

  const segments = values.map((item, index) => {
    const percentage = total > 0 ? item.value / total : 0;
    const accumulated = values
      .slice(0, index)
      .reduce((sum, prior) => sum + (total > 0 ? prior.value / total : 0), 0);

    return {
      label: item.label,
      className: item.className,
      dash: percentage * circumference,
      offset: -accumulated * circumference,
    };
  });

  return (
    <div className="relative size-48">
      <svg viewBox="0 0 140 140" className="size-full -rotate-90">
        <circle cx="70" cy="70" r={radius} fill="none" className="stroke-bg" strokeWidth="16" />

        {segments.map((item, index) => (
          <circle
            key={item.label}
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            className={`${item.className} safety-donut-segment`}
            style={{
              animationDelay: `${index * 0.14}s`,
            }}
            strokeWidth="16"
            strokeDasharray={`${Math.max(item.dash - gap, 0)} ${circumference}`}
            strokeDashoffset={item.offset}
            strokeLinecap="butt"
          />
        ))}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold text-text">{total}</span>

        <span className="text-[10px] text-text-dim">{safetyText("total", language)}</span>
      </div>
    </div>
  );
}
