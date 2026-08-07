"use client";

import { ReactNode } from "react";
import { useLang } from "@/lib/i18n";
import {
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

type SummaryCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  color?: "blue" | "orange" | "purple" | "green" | "red" | "cyan";
  change?: number;
  trend?: "up" | "down" | "flat";
  badge?: string;
};

const colors = {
  blue: {
    icon: "bg-blue-500/15 text-blue-400",
    line: "#2563eb",
    text: "text-emerald-400",
    badge: "bg-blue-500/15 text-blue-300",
  },
  orange: {
    icon: "bg-orange-500/15 text-orange-400",
    line: "#ea580c",
    text: "text-orange-400",
    badge: "bg-orange-500/15 text-orange-300",
  },
  purple: {
    icon: "bg-purple-500/15 text-purple-400",
    line: "#9333ea",
    text: "text-gray-400",
    badge: "bg-purple-500/15 text-purple-300",
  },
  green: {
    icon: "bg-green-500/15 text-green-400",
    line: "#16a34a",
    text: "text-emerald-400",
    badge: "bg-green-500/15 text-green-300",
  },
  red: {
    icon: "bg-red-500/15 text-red-400",
    line: "#dc2626",
    text: "text-red-400",
    badge: "bg-red-500/15 text-red-300",
  },
  cyan: {
    icon: "bg-cyan-500/15 text-cyan-400",
    line: "#06b6d4",
    text: "text-cyan-400",
    badge: "bg-cyan-500/15 text-cyan-300",
  },
};

export default function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  color = "blue",
  change,
  trend,
  badge,
}: SummaryCardProps) {
  const c = colors[color];
  const { t } = useLang();
  const trendColor =
    trend === "up"
      ? "text-emerald-400"
      : trend === "down"
        ? "text-red-400"
        : "text-gray-400";

  return (
    <div className="flex h-full min-w-0 flex-col rounded-xl border border-border-subtle bg-surface p-4 shadow-sm transition-all hover:shadow-md sm:p-5">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-text-dim">
            {title}
          </p>

          <h3
            className="mt-2 min-h-[2.5rem] line-clamp-2 break-words text-lg font-bold leading-tight text-text sm:min-h-[2.75rem] sm:text-xl"
            title={String(value)}
          >
            {value}
          </h3>

          {subtitle ? (
            <p className="mt-1.5 truncate text-sm text-text-muted">{subtitle}</p>
          ) : (
            <p className="mt-1.5 h-5" aria-hidden />
          )}
        </div>

        {icon && (
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 ${c.icon}`}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="mt-auto pt-4">
        {badge && (
          <span
            className={`inline-flex max-w-full truncate rounded-full px-2.5 py-1 text-[10px] font-semibold ${c.badge}`}
            title={badge}
          >
            {badge}
          </span>
        )}

        {change !== undefined && trend !== undefined && (
          <div className="flex min-w-0 items-end justify-between gap-2">
            <div className="min-w-0">
              <div
                className={`flex items-center gap-1 text-sm font-semibold ${trendColor}`}
              >
                {trend === "up" && <TrendingUp size={14} className="shrink-0" />}
                {trend === "down" && (
                  <TrendingDown size={14} className="shrink-0" />
                )}
                {trend === "flat" && <Minus size={14} className="shrink-0" />}
                <span className="truncate">{change}</span>
              </div>

              <p className="truncate text-xs text-text-muted">
                {t.itsm.vsLastMonth}
              </p>
            </div>

            <svg
              className="h-[30px] w-[72px] shrink-0 sm:w-[90px]"
              viewBox="0 0 90 30"
              aria-hidden
            >
              <path
                d="M2 26C10 26 16 18 24 18C32 18 38 26 46 26C56 26 60 6 70 6C80 6 84 24 88 18"
                fill="none"
                stroke={c.line}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
