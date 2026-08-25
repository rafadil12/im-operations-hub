"use client";

import type { ReactNode } from "react";
import type { ModuleCardData } from "@/data/overview";
import { StatPill } from "@/components/ui/StatPill";
import { CardBody } from "./ModuleCardBodies";

type ModuleCardProps = {
  data: ModuleCardData;
  expanded?: boolean;
  onOpen?: () => void;
};
function CardIcon({ type, color }: { type: ModuleCardData["icon"]; color: string }) {
  const wrap = (child: ReactNode) => (
    <span
      className="inline-flex size-7 items-center justify-center rounded-md"
      style={{ backgroundColor: `${color}22`, color }}
      aria-hidden
    >
      {child}
    </span>
  );

  if (type === "calendar")
    return wrap(
      <svg
        viewBox="0 0 24 24"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" strokeWidth="2.2" />
      </svg>
    );

  if (type === "sparepart")
    return wrap(
      <svg
        viewBox="0 0 24 24"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    );

  if (type === "organization")
    return wrap(
      <svg
        viewBox="0 0 24 24"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );

  if (type === "report")
    return wrap(
      <svg
        viewBox="0 0 24 24"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    );

  if (type === "training")
    return wrap(
      <svg
        viewBox="0 0 24 24"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    );

  if (type === "shield")
    return wrap(
      <svg
        viewBox="0 0 24 24"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );

  return wrap(
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export function ModuleCard({ data, expanded = false, onOpen }: ModuleCardProps) {
  return (
    <article
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen}
      onKeyDown={
        onOpen
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpen();
              }
            }
          : undefined
      }
      className={[
        "flex h-full flex-col rounded-xl border border-border bg-surface p-4 transition-colors",
        onOpen
          ? "cursor-pointer hover:border-accent/50 hover:bg-surface-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          : "",
        expanded ? "shadow-[0_20px_48px_var(--shadow-color-soft)]" : "",
      ].join(" ")}
      style={{
        borderTopWidth: 3,
        borderTopColor: data.accentColor,
      }}
    >
      <header className="mb-4 flex items-center gap-2.5">
        <CardIcon type={data.icon} color={data.accentColor} />

        <h3 className="text-sm font-semibold tracking-wide text-text">
          {data.number}. {data.title}
        </h3>
      </header>

      <div
        className={[
          "mb-4 grid gap-2",
          data.stats.length <= 2 ? "grid-cols-2" : "grid-cols-2 xl:grid-cols-4",
        ].join(" ")}
      >
        {data.stats.map((stat) => (
          <div key={stat.label} className="min-w-0">
            <StatPill stat={stat} />
          </div>
        ))}
      </div>

      <CardBody data={data} expanded={expanded} />
    </article>
  );
}
