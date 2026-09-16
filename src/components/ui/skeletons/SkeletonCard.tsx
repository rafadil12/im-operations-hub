"use client";

import { Skeleton, SkeletonCircle } from "@/components/ui/Skeleton";
import { SkeletonChart } from "./SkeletonChart";
import { SkeletonKpiGrid } from "./SkeletonKpiGrid";
import { useLang } from "@/lib/i18n";

type SkeletonCardProps = {
  className?: string;
};

export function SkeletonCard({ className = "" }: SkeletonCardProps) {
  const { t } = useLang();

  return (
    <article
      role="status"
      aria-label={t.common.loading}
      className={`flex h-full flex-col rounded-xl border border-border bg-surface p-4 ${className}`.trim()}
    >
      <header className="mb-4 flex items-center gap-2.5">
        <SkeletonCircle className="size-7" />
        <Skeleton className="h-4 w-44" />
      </header>

      <SkeletonKpiGrid count={4} className="mb-4" />

      <div className="min-h-28 flex-1">
        <SkeletonChart variant="bar" />
      </div>
    </article>
  );
}
