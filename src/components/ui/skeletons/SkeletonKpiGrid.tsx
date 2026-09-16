"use client";

import { Skeleton } from "@/components/ui/Skeleton";
import { useLang } from "@/lib/i18n";

type SkeletonKpiGridProps = {
  count?: number;
  className?: string;
};

export function SkeletonKpiGrid({ count = 4, className = "" }: SkeletonKpiGridProps) {
  const { t } = useLang();

  return (
    <div
      role="status"
      aria-label={t.common.loading}
      className={`grid gap-2 ${count <= 2 ? "grid-cols-2" : "grid-cols-2 xl:grid-cols-4"} ${className}`.trim()}
    >
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="min-w-0 rounded-md border border-border-subtle bg-bg/40 px-3 py-2">
          <Skeleton className="h-2 w-16" />
          <Skeleton className="mt-2 h-5 w-12" />
        </div>
      ))}
    </div>
  );
}
