export const REPORT_ALLOWED_EXTENSIONS = new Set([
  ".ppt",
  ".pptx",
  ".xls",
  ".xlsx",
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
]);

export const REPORT_FILE_ACCEPT =
  ".ppt,.pptx,.xls,.xlsx,.pdf,.png,.jpg,.jpeg,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf,image/png,image/jpeg";

export function getReportFileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  if (dot < 0) return "";
  const ext = fileName.slice(dot).toLowerCase();
  return ext.length <= 12 ? ext : "";
}

export function isAllowedReportFile(fileName: string): boolean {
  return REPORT_ALLOWED_EXTENSIONS.has(getReportFileExtension(fileName));
}
