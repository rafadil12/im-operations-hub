import type { ReactNode } from "react";

type FormIconProps = {
  className?: string;
};

type DuotoneProps = FormIconProps & {
  children: (colors: { primary: string; accent: string }) => ReactNode;
};

/** Same duotone idea as sidebar NavIcons, tuned for form surfaces. */
function FormDuotoneSvg({ className, children }: DuotoneProps) {
  const primary = "var(--text-muted)";
  const accent = "var(--accent)";

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={["size-4 shrink-0", className].filter(Boolean).join(" ")}
    >
      {children({ primary, accent })}
    </svg>
  );
}

/** Document — Basic Information */
export function FormDocumentIcon({ className }: FormIconProps) {
  return (
    <FormDuotoneSvg className={className}>
      {({ primary, accent }) => (
        <>
          <path
            d="M7 3.5h7.5L19 8v11.5A2 2 0 0 1 17 21.5H7A2 2 0 0 1 5 19.5v-14A2 2 0 0 1 7 3.5Z"
            stroke={primary}
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path d="M14.5 3.5V8H19" stroke={primary} strokeWidth="1.75" strokeLinejoin="round" />
          <path d="M8.5 12h7M8.5 15.5h5" stroke={accent} strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
    </FormDuotoneSvg>
  );
}

/** A / 文 — Description */
export function FormTranslateIcon({ className }: FormIconProps) {
  return (
    <FormDuotoneSvg className={className}>
      {({ primary, accent }) => (
        <>
          <path
            d="M4.5 6.5h9.5M9.25 6.5v1.75c0 3.4-2.1 5.75-4.75 6.75"
            stroke={primary}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7 12.5c1.1 1.35 2.65 2.25 4.5 2.5"
            stroke={primary}
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <path
            d="M13.5 20.5 16.1 13h1.3l2.6 7.5M14.35 17.5h4.3"
            stroke={accent}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </FormDuotoneSvg>
  );
}

/** Tag — Brand */
export function FormTagIcon({ className }: FormIconProps) {
  return (
    <FormDuotoneSvg className={className}>
      {({ primary, accent }) => (
        <>
          <path
            d="M3.75 12.35 11.1 5c.38-.38.9-.6 1.44-.6H19.5c.83 0 1.5.67 1.5 1.5v6.96c0 .54-.21 1.06-.6 1.44L13.05 21.6a1.5 1.5 0 0 1-2.12 0L3.75 14.47a1.5 1.5 0 0 1 0-2.12Z"
            stroke={primary}
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <circle cx="16.25" cy="8.75" r="1.35" fill={accent} />
        </>
      )}
    </FormDuotoneSvg>
  );
}

/** Box — Inventory Settings */
export function FormBoxIcon({ className }: FormIconProps) {
  return (
    <FormDuotoneSvg className={className}>
      {({ primary, accent }) => (
        <>
          <path
            d="M3.75 8.25 12 3.75l8.25 4.5v9L12 21.75l-8.25-4.5v-9Z"
            stroke={primary}
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path d="M3.75 8.25 12 12.75l8.25-4.5M12 12.75V21.75" stroke={primary} strokeWidth="1.75" />
          <path d="M8 10.6 12 12.75 16 10.6" stroke={accent} strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
    </FormDuotoneSvg>
  );
}

/** Notes lines — Additional Information */
export function FormNotesIcon({ className }: FormIconProps) {
  return (
    <FormDuotoneSvg className={className}>
      {({ primary, accent }) => (
        <>
          <path
            d="M6.5 4.5h8.5L18.5 8v11a1.5 1.5 0 0 1-1.5 1.5H6.5A1.5 1.5 0 0 1 5 19V6A1.5 1.5 0 0 1 6.5 4.5Z"
            stroke={primary}
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path d="M15 4.5V8h3.5" stroke={primary} strokeWidth="1.75" strokeLinejoin="round" />
          <path
            d="M8.25 12h7.5M8.25 15.25h5.5"
            stroke={accent}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </>
      )}
    </FormDuotoneSvg>
  );
}
