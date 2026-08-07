/**
 * Soft pastel pill badges (solid light bg + dark text), tuned for dark UI.
 * Matches Chinese ManageEngine labels and English status names.
 */
function toneFromKey(toneKey: string | null | undefined): string {
  const key = (toneKey ?? "").toLowerCase().trim();

  // Resolved / 已解决
  if (
    key.includes("resolved") ||
    key.includes("已解决") ||
    key.includes("solved")
  ) {
    return "bg-emerald-100 text-emerald-800";
  }

  // Closed / 已关闭
  if (key.includes("closed") || key.includes("已关闭")) {
    return "bg-teal-100 text-teal-800";
  }

  // In Progress / 处理中
  if (
    key.includes("progress") ||
    key.includes("处理中") ||
    key.includes("processing")
  ) {
    return "bg-sky-100 text-sky-800";
  }

  // Pending / 待处理 / 挂起
  if (
    key.includes("pending") ||
    key.includes("wait") ||
    key.includes("待处理") ||
    key.includes("等待") ||
    key.includes("挂起")
  ) {
    return "bg-amber-100 text-amber-900";
  }

  // Open / Created / 已创建
  if (
    key.includes("open") ||
    key.includes("created") ||
    key.includes("已创建") ||
    key === "新建"
  ) {
    return "bg-rose-100 text-rose-800";
  }

  // Assigned / 已分配
  if (key.includes("assigned") || key.includes("已分配") || key.includes("分配")) {
    return "bg-blue-100 text-blue-800";
  }

  // Cancelled / 已取消
  if (key.includes("cancel") || key.includes("取消")) {
    return "bg-slate-200 text-slate-700";
  }

  // Rejected / 已拒绝
  if (key.includes("reject") || key.includes("拒绝")) {
    return "bg-orange-100 text-orange-900";
  }

  // Overdue / 逾期
  if (key.includes("overdue") || key.includes("逾期")) {
    return "bg-red-100 text-red-800";
  }

  return "bg-slate-200 text-slate-700";
}

type TicketStatusBadgeProps = {
  label: string | null;
  toneKey?: string | null;
};

export default function TicketStatusBadge({
  label,
  toneKey,
}: TicketStatusBadgeProps) {
  if (!label || label === "-") {
    return <span className="text-text-dim">-</span>;
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${toneFromKey(
        toneKey ?? label,
      )}`}
    >
      {label}
    </span>
  );
}
