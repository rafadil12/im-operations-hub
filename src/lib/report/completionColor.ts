type HslStop = { pct: number; h: number; s: number; l: number };

/** Perceptually spaced stops: bright red → orange → yellow → bright green. */
const STOPS: HslStop[] = [
  { pct: 0, h: 0, s: 92, l: 58 },
  { pct: 12, h: 8, s: 94, l: 56 },
  { pct: 28, h: 22, s: 96, l: 54 },
  { pct: 42, h: 38, s: 97, l: 54 },
  { pct: 55, h: 48, s: 95, l: 58 },
  { pct: 68, h: 58, s: 92, l: 62 },
  { pct: 82, h: 92, s: 84, l: 50 },
  { pct: 92, h: 118, s: 80, l: 52 },
  { pct: 100, h: 138, s: 84, l: 58 },
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Smooth ease between 0 and 1 (no harsh linear segments). */
function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/** Completion fill color for 0–100%; H/S/L interpolated with smoothstep. */
export function completionBarColor(pct: number): string {
  const p = Math.min(100, Math.max(0, pct));

  if (p <= STOPS[0].pct) {
    const s = STOPS[0];
    return `hsl(${s.h} ${s.s}% ${s.l}%)`;
  }

  for (let i = 0; i < STOPS.length - 1; i += 1) {
    const a = STOPS[i];
    const b = STOPS[i + 1];
    if (p <= b.pct) {
      const rawT = (p - a.pct) / (b.pct - a.pct);
      const t = smoothstep(rawT);
      const h = lerp(a.h, b.h, t);
      const s = lerp(a.s, b.s, t);
      const l = lerp(a.l, b.l, t);
      return `hsl(${h} ${s}% ${l}%)`;
    }
  }

  const last = STOPS[STOPS.length - 1];
  return `hsl(${last.h} ${last.s}% ${last.l}%)`;
}
