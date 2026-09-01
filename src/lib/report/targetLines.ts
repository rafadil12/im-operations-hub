/** Split target text into numbered lines (supports newline or inline "1. … 2. …"). */
export function splitTargetLines(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed || trimmed === "—") return [];

  const byNewline = trimmed
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (byNewline.length > 1) return byNewline;

  const single = byNewline[0] ?? trimmed;
  const byNumber = single
    .split(/\s+(?=\d+\.\s)/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (byNumber.length > 1) return byNumber;

  return [single];
}
