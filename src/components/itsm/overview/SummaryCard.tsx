"use client";

import { ReactNode } from "react";

type SummaryCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  icon?: ReactNode;
};

export default function SummaryCard({
  title,
  value,
  subtitle,
  icon,
}: SummaryCardProps) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-5 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-dim">
            {title}
          </p>

          <h3 className="mt-2 text-2xl font-bold text-text">
            {value}
          </h3>

          {subtitle ? (
            <p className="mt-2 text-sm text-text-muted">
              {subtitle}
            </p>
          ) : null}
        </div>

        {icon ? (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}