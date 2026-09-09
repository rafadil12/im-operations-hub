"use client";

import { Skeleton } from "@/components/ui/Skeleton";
import { useLang } from "@/lib/i18n";

type SkeletonChartProps = {
  variant?: "bar" | "donut" | "line";
  className?: string;
};

const BAR_HEIGHTS = ["h-[36%]", "h-[53%]", "h-[70%]", "h-[42%]", "h-[87%]", "h-[61%]"];

export function SkeletonChart({ variant = "bar", className = "" }: SkeletonChartProps) {
  const { t } = useLang();

  return (
    <div
      role="status"
      aria-label={t.common.loading}
      className={`flex h-full min-h-28 items-end ${className}`.trim()}
    >
      {variant === "donut" ? (
        <div className="flex w-full items-center justify-center gap-6 py-4">
          <Skeleton className="size-28 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ) : variant === "line" ? (
        <div className="flex h-full w-full flex-col justify-end gap-2 py-2">
          <Skeleton className="h-24 w-full rounded-md" />
          <div className="flex justify-between">
            <Skeleton className="h-2 w-8" />
            <Skeleton className="h-2 w-8" />
            <Skeleton className="h-2 w-8" />
            <Skeleton className="h-2 w-8" />
          </div>
        </div>
      ) : (
        <div className="flex h-full w-full items-end gap-2 pt-4">
          {BAR_HEIGHTS.map((height, index) => (
            <Skeleton key={index} className={`min-w-0 flex-1 rounded-sm ${height}`} />
          ))}
        </div>
      )}
    </div>
  );
}
