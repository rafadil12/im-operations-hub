"use client";

export function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg/30 p-3">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-text-dim">{label}</p>
      <p className="mt-1.5 truncate text-xs font-medium text-text">{value}</p>
    </div>
  );
}
export function StatusPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "warning" | "danger";
}) {
  const c = {
    success: "bg-success/10 border-success/20 text-success",
    warning: "bg-warning/10 border-warning/20 text-warning",
    danger: "bg-danger/10 border-danger/20 text-danger",
  }[tone];
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${c}`}>
      <span className="text-[10px] font-medium">{label}</span>
      <span className="text-xs font-semibold">{value}</span>
    </div>
  );
}
export function ProgressStatus({
  label,
  description,
  value,
  total,
  tone,
}: {
  label: string;
  description: string;
  value: number;
  total: number;
  tone: "success" | "warning" | "danger";
}) {
  const c = {
    success: "text-success bg-success/[0.025]",
    warning: "text-warning bg-warning/[0.025]",
    danger: "text-danger bg-danger/[0.025]",
  }[tone];
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div
      className={`flex items-center justify-between gap-4 border-b border-border-subtle px-5 py-5 last:border-b-0 ${c}`}
    >
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-text-dim">
          {label}
        </p>
        <p className="mt-1 text-[10px] text-text-muted">{description}</p>
      </div>
      <div className="text-right">
        <p className="text-2xl font-semibold leading-none">{value}</p>
        <p className="mt-1 text-[9px] text-text-dim">{pct}%</p>
      </div>
    </div>
  );
}
export function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-text">{label}</label>
      {children}
    </div>
  );
}

export const inputClass =
  "w-full rounded-md border border-border bg-bg/40 px-3 py-2 text-xs text-text outline-none placeholder:text-text-dim focus:border-accent";
