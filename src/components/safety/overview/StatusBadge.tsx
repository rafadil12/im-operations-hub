"use client";

import { type SafetyLanguage, safetyText } from "@/lib/safety";

export function StatusBadge({ status, language }: { status?: string; language: SafetyLanguage }) {
  const normalized = status ?? "not_submitted";

  const config =
    normalized === "completed"
      ? {
          label: safetyText("closed", language),
          className: "bg-emerald-500/12 text-emerald-400",
        }
      : normalized === "case_found"
        ? {
            label: language === "cn" ? "发现案件" : "Case Found",
            className: "bg-rose-500/12 text-rose-400",
          }
        : normalized === "not_applicable"
          ? {
              label: language === "cn" ? "无案件" : "No Case",
              className: "bg-cyan-500/12 text-cyan-300",
            }
          : {
              label: language === "cn" ? "未提交" : "Not Submitted",
              className: "bg-amber-500/12 text-amber-400",
            };

  return (
    <span
      className={`mt-1 inline-flex rounded-md px-2 py-1 text-[9px] font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
