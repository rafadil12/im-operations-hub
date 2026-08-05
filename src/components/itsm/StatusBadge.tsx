function toneFromKey(toneKey: string |null | undefined): string {
  const key = (toneKey ?? "").toLowerCase();

  // Open Ticket
  if (key.includes("open")) {
    return "border-red-500/40 bg-red-500/10 text-red-600";
  }

  // Assigned
  if (key.includes("assigned")) {
    return "border-blue-500/40 bg-blue-500/10 text-blue-600";
  }

  // In Progress
  if (key.includes("progress")) {
    return "border-cyan-500/40 bg-cyan-500/10 text-cyan-600";
  }

  // Pending
  if (key.includes("pending")) {
    return "border-yellow-500/40 bg-yellow-500/10 text-yellow-600";
  }

  // Resolved
  if (key.includes("resolved")) {
    return "border-green-500/40 bg-green-500/10 text-green-600";
  }

  // Closed
  if (key.includes("closed")) {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-600";
  }

  // Cancelled
  if (key.includes("cancel")) {
    return "border-gray-500/40 bg-gray-500/10 text-gray-600";
  }

  // Rejected
  if (key.includes("reject")) {
    return "border-orange-500/40 bg-orange-500/10 text-orange-600";
  }

  // Overdue
  if (key.includes("overdue")) {
    return "border-red-700/40 bg-red-700/10 text-red-700";
  }

  // Default
  return "border-border bg-surface text-text-muted";
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
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap ${toneFromKey(
        toneKey ?? label
      )}`}
    >
      {label}
    </span>
  );
}