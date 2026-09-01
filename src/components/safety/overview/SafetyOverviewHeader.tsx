import Link from "next/link";
import type { SafetyLanguage } from "@/lib/safety";
import { safetyText } from "@/lib/safety";

type SafetyOverviewHeaderProps = {
  safetyLanguage: SafetyLanguage;
  monthLabel: string;
  overallCompletion: number;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
};

export function SafetyOverviewHeader({
  safetyLanguage,
  monthLabel,
  overallCompletion,
  onPreviousMonth,
  onNextMonth,
}: SafetyOverviewHeaderProps) {
  return (
    <div className="safety-scroll-animate flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500" />

          <span className="text-[10px] uppercase tracking-[0.16em] text-text-dim">
            {safetyText("management", safetyLanguage)}
          </span>
        </div>

        <h1 className="mt-1 text-xl font-semibold text-text">
          {safetyText("overview", safetyLanguage)}
        </h1>

        <p className="mt-1 text-sm text-text-muted">
          {safetyText("overviewDescription", safetyLanguage)}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPreviousMonth}
            className="rounded-md border border-border bg-surface px-2 py-2 text-xs text-text-muted transition hover:bg-surface-hover"
            aria-label={safetyLanguage === "cn" ? "上个月" : "Previous month"}
          >
            ‹
          </button>

          <div className="min-w-[120px] rounded-md border border-border bg-surface px-3 py-2 text-center text-xs font-medium text-text">
            {monthLabel}
          </div>

          <button
            type="button"
            onClick={onNextMonth}
            className="rounded-md border border-border bg-surface px-2 py-2 text-xs text-text-muted transition hover:bg-surface-hover"
            aria-label={safetyLanguage === "cn" ? "下个月" : "Next month"}
          >
            ›
          </button>
        </div>

        <Link
          href="/safety/management"
          className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-xs font-medium text-text transition hover:border-cyan-400/50 hover:bg-surface-hover"
        >
          🛡️ {safetyText("management", safetyLanguage)} →
        </Link>

        <div
          className={[
            "flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium",
            overallCompletion >= 90
              ? "border border-emerald-400/30 bg-emerald-500/12 text-emerald-300"
              : overallCompletion >= 70
                ? "border border-amber-400/30 bg-amber-500/12 text-amber-300"
                : "border border-rose-400/30 bg-rose-500/12 text-rose-300",
          ].join(" ")}
        >
          <span
            className={[
              "size-2 rounded-full",
              overallCompletion >= 90
                ? "bg-emerald-500"
                : overallCompletion >= 70
                  ? "bg-amber-500"
                  : "bg-rose-500",
            ].join(" ")}
          />

          {overallCompletion >= 90
            ? safetyText("onTrack", safetyLanguage)
            : overallCompletion >= 70
              ? safetyText("needsAttention", safetyLanguage)
              : safetyText("atRisk", safetyLanguage)}
        </div>
      </div>
    </div>
  );
}
