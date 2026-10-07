export class ChangeRequestIssueError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ChangeRequestIssueError";
    this.status = status;
  }
}

export const CHANGE_REQUEST_TYPE_EN = "Change Request";

export type ChangeRequestIssueInput = {
  issue_material: boolean;
  sparepart_item_id: number | null;
  sparepart_qty: number | null;
  sparepart_storage_location_id: number | null;
  sparepart_level_id: number | null;
  sparepart_recipient: string;
};

function num(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function parseChangeRequestIssue(body: {
  issue_material?: unknown;
  sparepart_item_id?: unknown;
  sparepart_qty?: unknown;
  sparepart_storage_location_id?: unknown;
  sparepart_level_id?: unknown;
  sparepart_recipient?: unknown;
}): ChangeRequestIssueInput {
  const issue =
    body.issue_material === true || body.issue_material === 1 || body.issue_material === "1";
  return {
    issue_material: issue,
    sparepart_item_id: num(body.sparepart_item_id),
    sparepart_qty: num(body.sparepart_qty),
    sparepart_storage_location_id: num(body.sparepart_storage_location_id),
    sparepart_level_id: num(body.sparepart_level_id),
    sparepart_recipient: String(body.sparepart_recipient ?? "").trim().slice(0, 255),
  };
}

export function issueClientRequestId(recordId: number): string {
  return `mes-record-${recordId}`;
}

export function assertIssueComplete(issue: ChangeRequestIssueInput): void {
  if (!issue.issue_material) return;
  if (
    !issue.sparepart_item_id ||
    !issue.sparepart_qty ||
    !issue.sparepart_storage_location_id ||
    !issue.sparepart_level_id ||
    !issue.sparepart_recipient
  ) {
    throw new ChangeRequestIssueError(
      "Material, quantity, storage location, level, and issued to are required to issue stock."
    );
  }
}
