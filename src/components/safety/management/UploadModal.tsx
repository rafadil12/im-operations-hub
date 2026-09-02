"use client";

import {
  getFileIcon,
  getFileTypeLabel,
  getPreviewKind,
  safetyText,
  type ActivityConfig,
  type FilePreview,
  type SafetyLanguage,
  type UserOption,
} from "@/lib/safety";
import { FormField, inputClass } from "./FormBits";

export function UploadModal({
  language,
  activity,
  date,
  location,
  descriptionEn,
  descriptionCn,
  pic,
  users,
  loadingUsers,
  fileNames,
  filePreviews,
  submitting,
  setDate,
  setLocation,
  setDescriptionEn,
  setDescriptionCn,
  setPic,
  onFileChange,
  onClose,
  onSubmit,
}: {
  language: SafetyLanguage;
  activity: ActivityConfig;
  date: string;
  location: string;
  descriptionEn: string;
  descriptionCn: string;
  pic: string;
  users: UserOption[];
  loadingUsers: boolean;
  fileNames: string[];
  filePreviews: FilePreview[];
  submitting: boolean;
  setDate: (v: string) => void;
  setLocation: (v: string) => void;
  setDescriptionEn: (v: string) => void;
  setDescriptionCn: (v: string) => void;
  setPic: (v: string) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const accept =
    activity.uploadKind === "ppt"
      ? ".ppt,.pptx"
      : activity.uploadKind === "video-excel"
        ? ".mp4,.mov,.avi,.xlsx,.xls"
        : activity.uploadKind === "before-after"
          ? ".jpg,.jpeg,.png,.webp"
          : ".jpg,.jpeg,.png,.webp,.mp4,.mov,.avi";
  const uploadText =
    activity.uploadKind === "none"
      ? safetyText("checklist", language)
      : activity.uploadKind === "before-after"
        ? safetyText("uploadBeforeAfter", language)
        : activity.uploadKind === "image-video"
          ? safetyText("canUploadMany", language)
          : activity.uploadKind === "video-excel"
            ? safetyText("uploadVideoExcel", language)
            : safetyText("uploadPpt", language);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-start justify-between border-b border-border-subtle p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-accent/10 text-xl">
              {activity.icon}
            </div>
            <div>
              <h2 className="text-base font-semibold text-text">{activity.title}</h2>
              <p className="mt-1 text-xs text-text-muted">
                {activity.requirement} · {uploadText}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="cursor-pointer text-xl text-text-dim"
          >
            ×
          </button>
        </div>
        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label={safetyText("date", language)}>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
              />
            </FormField>
            <FormField label={safetyText("pic", language)}>
              <select
                value={pic}
                onChange={(e) => setPic(e.target.value)}
                disabled={loadingUsers}
                className={inputClass}
              >
                <option value="">
                  {loadingUsers ? "Loading PIC..." : safetyText("enterPic", language)}
                </option>

                {users.map((user) => {
                  const employeeNo = user.employee_no?.trim() || "";
                  const nameEn = user.name_en?.trim() || "";
                  const nameCn = user.name_cn?.trim() || "";

                  const displayName =
                    language === "cn"
                      ? nameCn || nameEn || "Tanpa Nama"
                      : nameEn || nameCn || "Tanpa Nama";

                  return (
                    <option key={user.id} value={nameEn || nameCn}>
                      {employeeNo ? `${employeeNo} - ${displayName}` : displayName}
                    </option>
                  );
                })}
              </select>
            </FormField>
          </div>
          {activity.id !== "hazard-case" && (
            <FormField label={safetyText("location", language)}>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={safetyText("enterLocation", language)}
                className={inputClass}
              />
            </FormField>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label={safetyText("descriptionEnglish", language)}>
              <textarea
                value={descriptionEn}
                onChange={(e) => setDescriptionEn(e.target.value)}
                placeholder={
                  activity.id === "hazard-case"
                    ? "Describe the case details. Leave both descriptions empty if there is no case."
                    : safetyText("describeActivity", language)
                }
                rows={4}
                className={`${inputClass} resize-none`}
              />
            </FormField>
            <FormField label={safetyText("descriptionChinese", language)}>
              <textarea
                value={descriptionCn}
                onChange={(e) => setDescriptionCn(e.target.value)}
                placeholder={
                  activity.id === "hazard-case"
                    ? "请描述案件详情。如果没有案件，请将两个描述都留空。"
                    : safetyText("describeActivityChinese", language)
                }
                rows={4}
                className={`${inputClass} resize-none`}
              />
            </FormField>
          </div>
          {activity.uploadKind !== "none" && (
            <FormField label={safetyText("attachment", language)}>
              <label className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-bg/30 px-4 py-8 text-center hover:border-accent/60 hover:bg-accent/5">
                <div className="flex size-11 items-center justify-center rounded-full bg-accent/10 text-lg">
                  ↑
                </div>
                <span className="mt-3 text-xs font-medium text-text">
                  {safetyText("clickUpload", language)}
                </span>
                <span className="mt-1 text-[10px] text-text-dim">{uploadText}</span>
                <input
                  data-safety-upload="true"
                  type="file"
                  multiple
                  className="hidden"
                  accept={accept}
                  onChange={onFileChange}
                />
              </label>
              {filePreviews.length > 0 && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {filePreviews.map((file, index) => {
                    const kind = getPreviewKind(file.name, file.type);

                    return (
                      <div
                        key={`${file.url}-${file.name}-${index}`}
                        className="overflow-hidden rounded-xl border border-border-subtle bg-bg/30"
                      >
                        {kind === "image" ? (
                          <img
                            src={file.url}
                            alt={file.name}
                            className="h-32 w-full object-cover"
                          />
                        ) : kind === "video" ? (
                          <video
                            src={file.url}
                            controls
                            className="h-32 w-full bg-black object-contain"
                          />
                        ) : (
                          <div className="flex h-32 items-center justify-center bg-bg/50">
                            <div className="text-center">
                              <div className="text-3xl">{getFileIcon(kind)}</div>
                              <p className="mt-2 text-[10px] font-medium text-text">
                                {getFileTypeLabel(kind, language)}
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2 border-t border-border-subtle px-3 py-2">
                          <span className="shrink-0 text-xs text-success">✓</span>
                          <p className="truncate text-[10px] font-medium text-text">{file.name}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </FormField>
          )}
          {activity.id === "hazard-case" && (
            <div className="rounded-lg border border-success/20 bg-success/5 p-3">
              <p className="text-[10px] font-medium text-success">
                {safetyText("noCaseQuestion", language)}
              </p>
              <p className="mt-1 text-[9px] leading-4 text-text-muted">
                {safetyText("noCaseHelp", language)}
              </p>
            </div>
          )}
          {activity.id === "hse-tuesday" && (
            <div className="rounded-lg border border-accent/20 bg-accent/5 p-3 text-xs text-text-muted">
              {safetyText("hseHelp", language)}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-border-subtle p-5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="cursor-pointer rounded-md border border-border px-4 py-2 text-xs font-medium text-text-muted"
          >
            {safetyText("cancel", language)}
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="cursor-pointer rounded-md bg-accent px-5 py-2 text-xs font-medium text-white disabled:opacity-50"
          >
            {submitting
              ? safetyText("submitting", language)
              : activity.id === "hazard-case" && fileNames.length === 0
                ? safetyText("setGreenNoCase", language)
                : safetyText("submit", language)}
          </button>
        </div>
      </div>
    </div>
  );
}
