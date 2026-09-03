"use client";

import { Skeleton } from "@/components/ui/Skeleton";
import { useLang } from "@/lib/i18n";

type SkeletonTableProps = {
  rows?: number;
  columns?: number;
  className?: string;
};

export function SkeletonTable({ rows = 6, columns = 5, className = "" }: SkeletonTableProps) {
  const { t } = useLang();

  return (
    <div
      role="status"
      aria-label={t.common.loading}
      className={`overflow-x-auto rounded-lg border border-border-subtle bg-surface ${className}`.trim()}
    >
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-border-subtle">
            {Array.from({ length: columns }, (_, index) => (
              <th key={index} className="px-3 py-2">
                <Skeleton className="h-3 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, rowIndex) => (
            <tr key={rowIndex} className="border-b border-border-subtle last:border-b-0">
              {Array.from({ length: columns }, (_, columnIndex) => (
                <td key={columnIndex} className="px-3 py-3">
                  <Skeleton className={`h-3 ${columnIndex === 0 ? "w-28" : "w-16"}`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
