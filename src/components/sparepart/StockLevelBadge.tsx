import type { StockLevelStatus } from "@/lib/sparepart/categories";

const STATUS_BADGE_CLASS: Record<StockLevelStatus, string> = {
  critical:
    "rounded-full bg-danger/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-danger",
  low: "rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning",
  normal:
    "rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-success",
};

export function StockLevelBadge({
  status,
  labels,
}: {
  status: StockLevelStatus;
  labels: Record<StockLevelStatus, string>;
}) {
  return <span className={STATUS_BADGE_CLASS[status]}>{labels[status]}</span>;
}
