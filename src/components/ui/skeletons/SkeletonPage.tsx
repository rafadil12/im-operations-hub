"use client";

import { Skeleton } from "@/components/ui/Skeleton";
import { SkeletonCard } from "./SkeletonCard";
import { SkeletonForm } from "./SkeletonForm";
import { SkeletonTable } from "./SkeletonTable";
import { useLang } from "@/lib/i18n";

type SkeletonPagePreset = "table" | "dashboard" | "form";

type SkeletonPageProps = {
  preset?: SkeletonPagePreset;
  className?: string;
};

export function SkeletonPage({ preset = "table", className = "" }: SkeletonPageProps) {
  const { t } = useLang();

  if (preset === "dashboard") {
    return (
      <div role="status" aria-label={t.common.loading} className={className}>
        <div className="mb-3 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-72" />
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (preset === "form") {
    return (
      <div
        role="status"
        aria-label={t.common.loading}
        className={`rounded-xl border border-border bg-surface p-4 md:p-5 ${className}`.trim()}
      >
        <Skeleton className="mb-5 h-5 w-36" />
        <SkeletonForm />
      </div>
    );
  }

  return (
    <div role="status" aria-label={t.common.loading} className={`space-y-4 ${className}`.trim()}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
      <SkeletonTable />
    </div>
  );
}
