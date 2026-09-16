/**
 * Soft token-based pill badges for dark and light themes.
 * Matches Chinese ManageEngine labels and English status names.
 */
function toneFromKey(toneKey: string | null | undefined): string {
  const key = (toneKey ?? "").toLowerCase().trim();

  // Resolved / 已解决
  if (key.includes("resolved") || key.includes("已解决") || key.includes("solved")) {
    return "border-success/40 bg-success/10 text-success";
  }

  // Closed / 已关闭
  if (key.includes("closed") || key.includes("已关闭")) {
    return "border-success/40 bg-success/10 text-success";
  }

  // In Progress / 处理中
  if (key.includes("progress") || key.includes("处理中") || key.includes("processing")) {
    return "border-accent/40 bg-accent/10 text-accent";
  }

  // Pending / 待处理 / 挂起
  if (
    key.includes("pending") ||
    key.includes("wait") ||
    key.includes("待处理") ||
    key.includes("等待") ||
    key.includes("挂起")
  ) {
    return "border-warning/40 bg-warning/10 text-warning";
  }

  // Open / Created / 已创建
  if (key.includes("open") || key.includes("created") || key.includes("已创建") || key === "新建") {
    return "border-danger/40 bg-danger/10 text-danger";
  }

  // Assigned / 已分配
  if (key.includes("assigned") || key.includes("已分配") || key.includes("分配")) {
    return "border-accent/40 bg-accent/10 text-accent";
  }

  // Cancelled / 已取消
  if (key.includes("cancel") || key.includes("取消")) {
    return "border-border bg-surface text-text-muted";
  }

  // Rejected / 已拒绝
  if (key.includes("reject") || key.includes("拒绝")) {
    return "border-warning/40 bg-warning/10 text-warning";
  }

  // Overdue / 逾期
  if (key.includes("overdue") || key.includes("逾期")) {
    return "border-danger/40 bg-danger/10 text-danger";
  }

  return "border-border bg-surface text-text-muted";
}

type TicketStatusBadgeProps = {
  label: string | null;
  toneKey?: string | null;
};

export default function TicketStatusBadge({ label, toneKey }: TicketStatusBadgeProps) {
  if (!label || label === "-") {
    return <span className="text-text-dim">-</span>;
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${toneFromKey(
        toneKey ?? label
      )}`}
    >
      {label}
    </span>
  );
}
