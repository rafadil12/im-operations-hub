function toneFromKey(toneKey: string | null | undefined): string {
  const key = (toneKey ?? "").toLowerCase();
  if (key.includes("completed") || key.includes("done")) {
    return "border-success/40 bg-success/10 text-success";
  }
  if (key.includes("progress")) {
    return "border-accent/40 bg-accent/10 text-accent";
  }
  if (key.includes("pending")) {
    return "border-warning/40 bg-warning/10 text-warning";
  }
  return "border-border bg-surface text-text-muted";
}

export function StatusBadge({ label, toneKey }: { label: string | null; toneKey?: string | null }) {
  if (!label || label === "-") {
    return <span className="text-text-dim">-</span>;
  }
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] ${toneFromKey(toneKey ?? label)}`}
    >
      {label}
    </span>
  );
}
