"use client";

import { ReactNode } from "react";
import { useLang } from "@/lib/i18n";
import { TrendingUp, TrendingDown, Minus, ArrowUpRight } from "lucide-react";

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
    accent: "#3B82F6",
    soft: "rgba(59,130,246,.10)",
    icon: "bg-blue-500/10 text-blue-500 dark:text-blue-300",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
  },
  orange: {
    accent: "#F97316",
    soft: "rgba(249,115,22,.10)",
    icon: "bg-orange-500/10 text-orange-500 dark:text-orange-300",
    badge: "bg-orange-500/10 text-orange-600 dark:text-orange-300",
  },
  purple: {
    accent: "#8B5CF6",
    soft: "rgba(139,92,246,.10)",
    icon: "bg-violet-500/10 text-violet-500 dark:text-violet-300",
    badge: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
  },
  green: {
    accent: "#10B981",
    soft: "rgba(16,185,129,.10)",
    icon: "bg-emerald-500/10 text-emerald-500 dark:text-emerald-300",
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  },
  red: {
    accent: "#EF4444",
    soft: "rgba(239,68,68,.10)",
    icon: "bg-red-500/10 text-red-500 dark:text-red-300",
    badge: "bg-red-500/10 text-red-600 dark:text-red-300",
  },
  cyan: {
    accent: "#06B6D4",
    soft: "rgba(6,182,212,.10)",
    icon: "bg-cyan-500/10 text-cyan-500 dark:text-cyan-300",
    badge: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300",
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
      ? "text-emerald-600 dark:text-emerald-400"
      : trend === "down"
        ? "text-red-600 dark:text-red-400"
        : "text-text-muted";

  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <article
      className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface/95 p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg sm:p-5"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, ${c.accent}, transparent)` }}
      />

      <div
        className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: c.soft }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
            {title}
          </p>

          <div className="mt-2 flex items-end gap-2">
            <h3
              className="truncate text-3xl font-black leading-none tracking-tight text-text sm:text-[2rem]"
              title={String(value)}
            >
              {value}
            </h3>
            {trend && trend !== "flat" ? (
              <TrendIcon size={15} className={`mb-0.5 shrink-0 ${trendColor}`} />
            ) : null}
          </div>

          {subtitle ? (
            <p className="mt-2 truncate text-[11px] text-text-muted" title={subtitle}>
              {subtitle}
            </p>
          ) : null}
        </div>

        {icon ? (
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ring-black/[0.04] dark:ring-white/[0.05] ${c.icon}`}
          >
            {icon}
          </div>
        ) : null}
      </div>

      <div className="relative mt-auto pt-4">
        <div className="h-px bg-border-subtle" />

        <div className="mt-3 flex items-center justify-between gap-2">
          {change !== undefined && trend !== undefined ? (
            <div className="flex min-w-0 items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${
                  trend === "up"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                    : trend === "down"
                      ? "bg-red-500/10 text-red-600 dark:text-red-300"
                      : "bg-bg text-text-muted"
                }`}
              >
                <TrendIcon size={11} />
                {Math.abs(change)}
              </span>
              <span className="truncate text-[9px] text-text-dim">
                {t.itsm.vsLastMonth}
              </span>
            </div>
          ) : badge ? (
            <span
              className={`inline-flex max-w-full truncate rounded-full px-2.5 py-1 text-[9px] font-bold ${c.badge}`}
              title={badge}
            >
              {badge}
            </span>
          ) : (
            <span className="text-[9px] text-text-dim">ITSM</span>
          )}

          <span
            className="flex shrink-0 items-center gap-1 text-[9px] font-semibold text-text-dim transition-colors group-hover:text-text-muted"
            aria-hidden
          >
            <ArrowUpRight size={11} />
          </span>
        </div>
      </div>
    </article>
  );
}
