export function SafetyOverviewStyles() {
  return (
    <>
      <style>{`
        @keyframes safetyBarGrow {
          from { transform: scaleY(0); transform-origin: bottom; opacity: 0.2; }
          to { transform: scaleY(1); transform-origin: bottom; opacity: 1; }
        }

        @keyframes safetyHorizontalGrow {
          from { transform: scaleX(0); transform-origin: left; opacity: 0.2; }
          to { transform: scaleX(1); transform-origin: left; opacity: 1; }
        }

        @keyframes safetyDonutReveal {
          from { opacity: 0; transform: rotate(-8deg) scale(0.94); }
          to { opacity: 1; transform: rotate(0deg) scale(1); }
        }

        @keyframes safetyLineDraw {
          from { stroke-dashoffset: 1; }
          to { stroke-dashoffset: 0; }
        }

        @keyframes safetyPointReveal {
          from { opacity: 0; transform: scale(0.4); }
          to { opacity: 1; transform: scale(1); }
        }

        @keyframes safetyTextReveal {
          from { opacity: 0; transform: translateY(3px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .safety-line-draw {
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation: safetyLineDraw 1.8s ease-in-out both;
        }

        .safety-line-point {
          opacity: 0;
          transform-box: fill-box;
          transform-origin: center;
          animation: safetyPointReveal 0.35s ease-out both;
        }

        .safety-line-value,
        .safety-line-label {
          opacity: 0;
          animation: safetyTextReveal 0.3s ease-out both;
        }

        .safety-bar-grow {
          animation: safetyBarGrow 0.8s cubic-bezier(0.42, 0, 0.58, 1) both;
        }

        .safety-horizontal-grow {
          animation: safetyHorizontalGrow 1s cubic-bezier(0.42, 0, 0.58, 1) both;
        }

        .safety-donut-segment {
          animation: safetyDonutReveal 0.8s cubic-bezier(0.42, 0, 0.58, 1) both;
          transform-box: fill-box;
          transform-origin: center;
        }

        @media (prefers-reduced-motion: reduce) {
          .safety-overview-page .safety-bar-grow,
          .safety-overview-page .safety-horizontal-grow,
          .safety-overview-page .safety-donut-segment,
          .safety-overview-page .safety-line-draw,
          .safety-overview-page .safety-line-point,
          .safety-overview-page .safety-line-value,
          .safety-overview-page .safety-line-label {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
            stroke-dashoffset: 0 !important;
          }
        }
      `}</style>
      <style>{`
        .safety-overview-page {
          --safety-cyan: 34 211 238;
          --safety-emerald: 52 211 153;
          --safety-amber: 251 191 36;
          --safety-rose: 251 113 133;
        }

        .safety-overview-page section,
        .safety-overview-page > div > .rounded-xl {
          transition: border-color .25s ease, box-shadow .25s ease, background-color .25s ease;
        }

        .safety-overview-page section:hover {
          border-color: rgb(var(--safety-cyan) / .20);
          box-shadow: 0 12px 34px rgb(8 47 73 / .12);
        }

        .safety-overview-page .rounded-xl.bg-surface {
          background-image: linear-gradient(145deg, rgb(255 255 255 / .025), transparent 45%, rgb(var(--safety-cyan) / .025));
        }

        .safety-overview-page .bg-emerald-500 {
          background-image: linear-gradient(90deg, rgb(16 185 129), rgb(52 211 153));
        }
        .safety-overview-page .bg-amber-500 {
          background-image: linear-gradient(90deg, rgb(245 158 11), rgb(251 191 36));
        }
        .safety-overview-page .bg-rose-500 {
          background-image: linear-gradient(90deg, rgb(244 63 94), rgb(251 113 133));
        }
        .safety-overview-page .bg-cyan-500 {
          background-image: linear-gradient(90deg, rgb(6 182 212), rgb(34 211 238));
        }

        .safety-overview-page .safety-line-draw {
          filter: drop-shadow(0 0 5px rgb(var(--safety-cyan) / .35));
        }

        .safety-overview-page .safety-line-point {
          filter: drop-shadow(0 0 5px rgb(var(--safety-cyan) / .35));
        }

        .safety-overview-page .safety-donut-segment {
          filter: drop-shadow(0 0 3px rgb(255 255 255 / .08));
        }

        .safety-overview-page .safety-horizontal-grow,
        .safety-overview-page .safety-bar-grow {
          box-shadow: inset 0 1px rgb(255 255 255 / .18), 0 3px 10px rgb(0 0 0 / .10);
        }
      `}</style>
    </>
  );
}
