type IconProps = {
  className?: string;
};

/** SVG Repo: https://www.svgrepo.com/svg/510924/import */
export function ImportIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={["size-4 shrink-0", className].filter(Boolean).join(" ")}
    >
      <path
        d="M12 4v10m0 0 3-3m-3 3-3-3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 16.286c0 2.623 0 3.935-.819 4.75C18.362 21.85 17.044 21.85 14.409 21.85H9.591c-2.635 0-3.953 0-4.772-.814C4 20.221 4 18.91 4 16.286"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** SVG Repo: https://www.svgrepo.com/svg/510915/export */
export function ExportIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={["size-4 shrink-0", className].filter(Boolean).join(" ")}
    >
      <path
        d="M12 14V4m0 0 3 3m-3-3-3 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 16.286c0 2.623 0 3.935-.819 4.75C18.362 21.85 17.044 21.85 14.409 21.85H9.591c-2.635 0-3.953 0-4.772-.814C4 20.221 4 18.91 4 16.286"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
