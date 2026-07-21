const toneByStatus: Record<string, string> = {
  "已完成 Completed": "border-success/40 bg-success/10 text-success",
  "进行中 In Progress": "border-accent/40 bg-accent/10 text-accent",
  "待处理 Pending": "border-warning/40 bg-warning/10 text-warning",
};

export function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-text-dim">-</span>;
  const tone = toneByStatus[status] ?? "border-border bg-surface text-text-muted";
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] ${tone}`}
    >
      {status}
    </span>
  );
}
