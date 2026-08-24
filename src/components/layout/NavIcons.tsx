import type { ReactElement, ReactNode } from "react";

type NavIconProps = {
  active?: boolean;
  className?: string;
};

type DuotoneProps = NavIconProps & {
  children: (colors: {
    primary: string;
    accent: string;
    cutout: string;
  }) => ReactNode;
};

function DuotoneSvg({ active, className, children }: DuotoneProps) {
  const primary = active ? "#ffffff" : "var(--sidebar-text)";
  const accent = active ? "#ffffff" : "var(--sidebar-active)";
  const cutout = active ? "var(--sidebar-active)" : "var(--sidebar-bg)";

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={["size-4 shrink-0", className].filter(Boolean).join(" ")}
    >
      {children({ primary, accent, cutout })}
    </svg>
  );
}

/** 2×2 dashboard grid */
export function OverviewIcon({ active, className }: NavIconProps) {
  return (
    <DuotoneSvg active={active} className={className}>
      {({ primary, accent }) => (
        <>
          <rect x="3" y="3" width="8" height="8" rx="1.5" fill={primary} />
          <rect x="13" y="3" width="8" height="8" rx="1.5" fill={accent} />
          <rect x="3" y="13" width="8" height="8" rx="1.5" fill={accent} />
          <rect x="13" y="13" width="8" height="8" rx="1.5" fill={primary} />
        </>
      )}
    </DuotoneSvg>
  );
}

/** Headset — blue mic tip */
export function ItsmIcon({ active, className }: NavIconProps) {
  return (
    <DuotoneSvg active={active} className={className}>
      {({ primary, accent }) => (
        <>
          <path
            d="M4.5 12a7.5 7.5 0 0 1 15 0"
            stroke={primary}
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <rect x="3" y="11.5" width="3.5" height="6" rx="1.5" fill={primary} />
          <rect x="17.5" y="11.5" width="3.5" height="6" rx="1.5" fill={primary} />
          <path
            d="M19.25 17.5v1.25a2.25 2.25 0 0 1-2.25 2.25h-2"
            stroke={primary}
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <circle cx="14.5" cy="20.75" r="1.35" fill={accent} />
        </>
      )}
    </DuotoneSvg>
  );
}

/** Clipboard — blue list markers */
export function DailyOperationIcon({ active, className }: NavIconProps) {
  return (
    <DuotoneSvg active={active} className={className}>
      {({ primary, accent }) => (
        <>
          <path
            d="M8 4.75h-.75A2.25 2.25 0 0 0 5 7v12.25A2.25 2.25 0 0 0 7.25 21.5h9.5A2.25 2.25 0 0 0 19 19.25V7a2.25 2.25 0 0 0-2.25-2.25H16"
            stroke={primary}
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <rect
            x="8"
            y="3"
            width="8"
            height="3.5"
            rx="1.25"
            stroke={primary}
            strokeWidth="1.75"
          />
          <circle cx="9.25" cy="10.5" r="0.9" fill={accent} />
          <circle cx="9.25" cy="14" r="0.9" fill={accent} />
          <circle cx="9.25" cy="17.5" r="0.9" fill={accent} />
          <path
            d="M11.5 10.5h4M11.5 14h4M11.5 17.5h3"
            stroke={primary}
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity={0.55}
          />
        </>
      )}
    </DuotoneSvg>
  );
}

/** Shield with medical cross (Safety) */
export function SafetyIcon({ active, className }: NavIconProps) {
  return (
    <DuotoneSvg active={active} className={className}>
      {({ primary, accent }) => (
        <>
          <path
            d="M12 2.4 19.6 5.6v5.1c0 4.95-3.2 8.7-7.6 10-4.4-1.3-7.6-5.05-7.6-10V5.6L12 2.4Z"
            fill={primary}
          />
          {/* Rounded medical cross */}
          <rect x="10.85" y="8.1" width="2.3" height="7.8" rx="1.15" fill={accent} />
          <rect x="8.1" y="10.85" width="7.8" height="2.3" rx="1.15" fill={accent} />
        </>
      )}
    </DuotoneSvg>
  );
}

/** Gear + wrench overlay */
export function SparepartIcon({ active, className }: NavIconProps) {
  return (
    <DuotoneSvg active={active} className={className}>
      {({ primary, accent, cutout }) => (
        <>
          <rect x="10.75" y="2.5" width="2.5" height="4" rx="0.6" fill={primary} />
          <rect
            x="10.75"
            y="2.5"
            width="2.5"
            height="4"
            rx="0.6"
            fill={primary}
            transform="rotate(60 12 12)"
          />
          <rect
            x="10.75"
            y="2.5"
            width="2.5"
            height="4"
            rx="0.6"
            fill={primary}
            transform="rotate(120 12 12)"
          />
          <rect
            x="10.75"
            y="2.5"
            width="2.5"
            height="4"
            rx="0.6"
            fill={primary}
            transform="rotate(180 12 12)"
          />
          <rect
            x="10.75"
            y="2.5"
            width="2.5"
            height="4"
            rx="0.6"
            fill={primary}
            transform="rotate(240 12 12)"
          />
          <rect
            x="10.75"
            y="2.5"
            width="2.5"
            height="4"
            rx="0.6"
            fill={primary}
            transform="rotate(300 12 12)"
          />
          <circle cx="12" cy="12" r="5.1" fill={primary} />
          <circle cx="12" cy="12" r="2.1" fill={cutout} />
          <path
            d="M15.9 4.4c.28-.28.74-.28 1.02 0l1.9 1.9c.28.28.28.74 0 1.02l-.78.78-2.92-2.92.78-.78Zm-1.1 1.1 2.92 2.92-4.05 4.05c-.14.14-.32.23-.5.28l-1.6.3a.34.34 0 0 1-.4-.4l.3-1.6c.05-.18.14-.36.28-.5l4.05-4.05Z"
            fill={accent}
          />
        </>
      )}
    </DuotoneSvg>
  );
}

/** Two people — rear figure blue */
export function OrganizationIcon({ active, className }: NavIconProps) {
  return (
    <DuotoneSvg active={active} className={className}>
      {({ primary, accent }) => (
        <>
          <circle cx="15.5" cy="8" r="2.6" fill={accent} />
          <path
            d="M20.5 18.5c0-2.35-2.15-4.25-4.8-4.25-.7 0-1.35.12-1.95.35 1.85.7 3.15 2.35 3.15 4.3v.6h3.6v-.6Z"
            fill={accent}
          />
          <circle cx="9.5" cy="8.25" r="3" fill={primary} />
          <path
            d="M3.5 18.75c0-2.9 2.7-5.25 6-5.25s6 2.35 6 5.25v.5H3.5v-.5Z"
            fill={primary}
          />
        </>
      )}
    </DuotoneSvg>
  );
}

/** Document + pie chart accent */
export function ReportIcon({ active, className }: NavIconProps) {
  return (
    <DuotoneSvg active={active} className={className}>
      {({ primary, accent }) => (
        <>
          <path
            d="M7 3.5h7.5L19 8v11.5A2 2 0 0 1 17 21.5H7A2 2 0 0 1 5 19.5v-14A2 2 0 0 1 7 3.5Z"
            stroke={primary}
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="M14.5 3.5V8H19"
            stroke={primary}
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="M14.25 17.75a3.1 3.1 0 1 1 0-6.2 3.1 3.1 0 0 1 0 6.2Z"
            fill={accent}
            opacity={0.35}
          />
          <path d="M14.25 11.55v3.1h3.1A3.1 3.1 0 0 0 14.25 11.55Z" fill={accent} />
        </>
      )}
    </DuotoneSvg>
  );
}

/** Graduation cap — blue mortarboard */
export function TrainingIcon({ active, className }: NavIconProps) {
  return (
    <DuotoneSvg active={active} className={className}>
      {({ primary, accent }) => (
        <>
          <path
            d="M2.5 10.25 12 5.5l9.5 4.75L12 15 2.5 10.25Z"
            fill={accent}
          />
          <path
            d="M6.5 12.5v4.25c0 .4.9 1.75 5.5 1.75s5.5-1.35 5.5-1.75V12.5"
            stroke={primary}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M21.5 10.25v5.5"
            stroke={primary}
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <circle cx="21.5" cy="16.5" r="1.1" fill={accent} />
        </>
      )}
    </DuotoneSvg>
  );
}

/** Horizontal sliders — blue knobs */
export function SettingsIcon({ active, className }: NavIconProps) {
  return (
    <DuotoneSvg active={active} className={className}>
      {({ primary, accent }) => (
        <>
          <path
            d="M4 7h16M4 12h16M4 17h16"
            stroke={primary}
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <circle cx="8" cy="7" r="2.15" fill={accent} />
          <circle cx="15" cy="12" r="2.15" fill={accent} />
          <circle cx="10" cy="17" r="2.15" fill={accent} />
        </>
      )}
    </DuotoneSvg>
  );
}

export type NavIconId =
  | "dashboard"
  | "itsm"
  | "daily-operation"
  | "safety"
  | "sparepart"
  | "organization"
  | "report"
  | "training"
  | "settings";

const iconMap: Record<
  NavIconId,
  (props: NavIconProps) => ReactElement
> = {
  dashboard: OverviewIcon,
  itsm: ItsmIcon,
  "daily-operation": DailyOperationIcon,
  safety: SafetyIcon,
  sparepart: SparepartIcon,
  organization: OrganizationIcon,
  report: ReportIcon,
  training: TrainingIcon,
  settings: SettingsIcon,
};

export function NavIcon({
  id,
  active,
  className,
}: NavIconProps & { id: NavIconId }) {
  const Icon = iconMap[id];
  return <Icon active={active} className={className} />;
}
