import type { RemarkChange, RemarkEvent } from "./renderRemark";
import { recordLogsCenter } from "./record";

export function itsmImportCounts(
  rowCount: number,
  existingCount: number,
  affectedRows: number
): { imported: number; updated: number } {
  const imported = Math.max(0, rowCount - existingCount);
  const delta = affectedRows - imported;
  if (delta >= 0 && delta % 2 === 0) {
    const updated = delta / 2;
    if (updated <= existingCount && imported + updated <= rowCount) {
      return { imported, updated };
    }
  }
  const updated = Math.max(0, affectedRows - rowCount);
  return { imported: Math.max(0, rowCount - updated), updated };
}

export function itsmImportEvent(imported: number, updated: number): RemarkEvent {
  const changes: RemarkChange[] = [];
  if (updated > 0) changes.push({ field: "updated", to: String(updated) });
  return {
    action: "import",
    summary: "",
    objectType: "requests",
    objectRef: String(Math.max(0, imported)),
    changes: changes.length ? changes : null,
  };
}

export async function recordItsmImport(imported: number, updated: number): Promise<void> {
  if (imported <= 0 && updated <= 0) return;
  const event = itsmImportEvent(imported, updated);
  await recordLogsCenter({
    module: "itsm",
    action: event.action,
    objectType: event.objectType,
    objectRef: event.objectRef,
    changes: event.changes,
  });
}
