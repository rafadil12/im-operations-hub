type ImOneLogoProps = {
  /** "mark" renders only the glyph, for the collapsed sidebar. */
  variant?: "full" | "mark";
  className?: string;
};

/**
 * Brand mark: the "iM" glyph as folded blue planes. The wordmark next to it is
 * plain text so it inherits the app font and the surrounding text color.
 */
function ImOneMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 44 40"
      className={className}
      fill="none"
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id="im-one-i" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4cb8f7" />
          <stop offset="100%" stopColor="#1f7fe0" />
        </linearGradient>
        <linearGradient id="im-one-m" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="55%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="im-one-fold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e3a8a" />
          <stop offset="100%" stopColor="#152f6f" />
        </linearGradient>
        <linearGradient id="im-one-plane" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2f6fd0" />
        </linearGradient>
      </defs>

      <circle cx="5" cy="5" r="4.6" fill="url(#im-one-i)" />
      <rect
        x="0.6"
        y="12.6"
        width="8.8"
        height="26.4"
        rx="4.4"
        fill="url(#im-one-i)"
      />

      <path
        d="M13 39V3h8l7 17 7-17h8v36h-6.5V14l-6 14h-5l-6-14v25z"
        fill="url(#im-one-m)"
      />
      <path d="M21 3l7 17-2.5 8L19.5 14z" fill="url(#im-one-fold)" />
      <path d="M35 3h8v36h-6.5V14z" fill="url(#im-one-plane)" />
    </svg>
  );
}

/** The 智造 seal that sits after the wordmark. */
function ZhiZaoSeal() {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-[3px] bg-[#c8202a] px-[2px] py-[1px] font-sans text-[6px] font-medium leading-[1.15] text-white"
      aria-hidden
    >
      <span className="block">智</span>
      <span className="block">造</span>
    </span>
  );
}

export function ImOneLogo({
  variant = "full",
  className = "",
}: ImOneLogoProps) {
  return (
    <div
      className={`flex items-center gap-2 ${className}`}
      role="img"
      aria-label="IM ONE — Intelligent Operations, One Platform"
    >
      <ImOneMark className={variant === "mark" ? "h-6 w-auto" : "h-7 w-auto"} />

      {variant === "full" && (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[17px] font-bold leading-none tracking-tight">
              IM<span className="font-normal"> One</span>
            </span>
            <ZhiZaoSeal />
          </div>
          <p className="mt-1 whitespace-nowrap text-[5.5px] font-medium uppercase leading-none tracking-[0.08em] text-sidebar-text-muted">
            Intelligent Operations, One Platform
          </p>
        </div>
      )}
    </div>
  );
}
