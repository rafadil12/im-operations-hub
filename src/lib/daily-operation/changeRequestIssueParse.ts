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

export type IssueFieldError =
  | "recipient_required"
  | "item_required"
  | "qty_required"
  | "qty_invalid"
  | "location_required"
  | "qty_exceeds";

const ISSUE_ERROR_TEXT: Record<IssueFieldError, string> = {
  recipient_required: "Issued To is required.",
  item_required: "Material is required.",
  qty_required: "Quantity is required.",
  qty_invalid: "Quantity must be a positive integer.",
  location_required: "Storage location is required.",
  qty_exceeds: "Quantity cannot exceed available stock.",
};

export function issueErrorField(error: IssueFieldError): "recipient" | "item" | "qty" | "location" {
  if (error === "recipient_required") return "recipient";
  if (error === "item_required") return "item";
  if (error === "location_required") return "location";
  return "qty";
}

export function collectIssueErrors(
  body: {
    issue_material?: unknown;
    sparepart_item_id?: unknown;
    sparepart_qty?: unknown;
    sparepart_storage_location_id?: unknown;
    sparepart_level_id?: unknown;
    sparepart_recipient?: unknown;
  },
  availableQty?: number | null
): IssueFieldError[] {
  const issue =
    body.issue_material === true || body.issue_material === 1 || body.issue_material === "1";
  if (!issue) return [];

  const errors: IssueFieldError[] = [];
  if (!String(body.sparepart_recipient ?? "").trim()) errors.push("recipient_required");
  if (!num(body.sparepart_item_id)) errors.push("item_required");

  const qtyRaw = body.sparepart_qty;
  const qtyEmpty = qtyRaw == null || String(qtyRaw).trim() === "";
  if (qtyEmpty) {
    errors.push("qty_required");
  } else if (!num(qtyRaw)) {
    errors.push("qty_invalid");
  } else if (availableQty != null && Number(qtyRaw) > availableQty) {
    errors.push("qty_exceeds");
  }

  if (!num(body.sparepart_storage_location_id) || !num(body.sparepart_level_id)) {
    errors.push("location_required");
  }
  return errors;
}

export function formatIssueErrors(errors: IssueFieldError[]): string {
  return errors.map((error) => ISSUE_ERROR_TEXT[error]).join(" ");
}

export function assertIssueComplete(issue: ChangeRequestIssueInput): void {
  const errors = collectIssueErrors(issue);
  if (errors.length === 0) return;
  throw new ChangeRequestIssueError(formatIssueErrors(errors));
}
