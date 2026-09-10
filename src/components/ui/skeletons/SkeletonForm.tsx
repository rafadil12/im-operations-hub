"use client";

import { Skeleton } from "@/components/ui/Skeleton";
import { useLang } from "@/lib/i18n";

type SkeletonFormProps = {
  fields?: number;
  className?: string;
};

export function SkeletonForm({ fields = 5, className = "" }: SkeletonFormProps) {
  const { t } = useLang();

  return (
    <div role="status" aria-label={t.common.loading} className={`space-y-4 ${className}`.trim()}>
      {Array.from({ length: fields }, (_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      ))}
      <div className="flex justify-end gap-2 pt-2">
        <Skeleton className="h-9 w-20 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
    </div>
  );
}
