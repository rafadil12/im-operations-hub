import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";

export default function ItsmPage() {
  return (
    <AppShell title="ITSM">
      <div className="mx-auto max-w-2xl rounded-xl border border-border bg-surface p-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
          Module
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-text">ITSM Module</h1>
        <p className="mt-3 text-sm leading-relaxed text-text-muted">
          Detail page for IT Service Management. Ticket queues, SLA tracking, and
          PIC workload will live here.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-md border border-border px-3 py-2 text-xs font-medium text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
        >
          ← Back to Overview
        </Link>
      </div>
    </AppShell>
  );
}
