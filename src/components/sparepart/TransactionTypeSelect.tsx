"use client";

import { type ReactNode } from "react";
import { useLang } from "@/lib/i18n";
import type { MovementType } from "@/lib/types";
import {
  SparepartDropdown,
  type SparepartDropdownOption,
} from "@/components/sparepart/SparepartDropdown";

type ForwardType = Extract<MovementType, "101" | "201" | "311">;

type Props = {
  value: ForwardType;
  onChange: (value: ForwardType) => void;
  className?: string;
};

function IconReceive({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M4 19h16" />
    </svg>
  );
}

function IconIssue({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 21V9" />
      <path d="M7 14l5-5 5 5" />
      <path d="M4 5h16" />
    </svg>
  );
}

function IconTransfer({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7 7h12l-3-3" />
      <path d="M16 17H4l3 3" />
      <path d="M19 7v4" />
      <path d="M5 17v-4" />
    </svg>
  );
}

const OPTIONS: {
  value: ForwardType;
  Icon: (props: { className?: string }) => ReactNode;
  labelKey: "movement101" | "movement201" | "movement311";
}[] = [
  { value: "101", Icon: IconReceive, labelKey: "movement101" },
  { value: "201", Icon: IconIssue, labelKey: "movement201" },
  { value: "311", Icon: IconTransfer, labelKey: "movement311" },
];

export function TransactionTypeSelect({ value, onChange, className = "" }: Props) {
  const { t } = useLang();
  const options: SparepartDropdownOption[] = OPTIONS.map(({ value, Icon, labelKey }) => ({
    value,
    label: t.sparepart[labelKey],
    icon: <Icon className="h-4 w-4" />,
  }));

  return (
    <SparepartDropdown
      value={value}
      options={options}
      onChange={(next) => onChange(next as ForwardType)}
      className={className}
    />
  );
}
