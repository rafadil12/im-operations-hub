/** Convert a MySQL datetime string to the value for input[type=datetime-local]. */
export function toDateTimeLocal(value: string | null): string {
  if (!value) return "";
  // "YYYY-MM-DD HH:mm:ss" -> "YYYY-MM-DDTHH:mm"
  return value.replace(" ", "T").slice(0, 16);
}

/** Convert an input[type=datetime-local] value to a MySQL datetime string. */
export function fromDateTimeLocal(value: string): string | null {
  if (!value) return null;
  // "YYYY-MM-DDTHH:mm" -> "YYYY-MM-DD HH:mm:00"
  const normalized = value.replace("T", " ");
  return normalized.length === 16 ? `${normalized}:00` : normalized;
}

/** Short display for table cells. */
export function formatDisplay(value: string | null): string {
  if (!value) return "-";
  return value.slice(0, 16).replace("T", " ");
}
