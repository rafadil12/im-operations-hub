"use client";

import {
  type MonthlyEvidenceItem,
  type SafetyLanguage,
  type WeekEvidenceItem,
  getFileIcon,
  getPreviewKind,
  getReadableFileKind,
  localizeActivity,
  safetyText,
} from "@/lib/safety";

type EvidenceGalleryItem = WeekEvidenceItem | MonthlyEvidenceItem;

type EvidenceGalleryModalProps = {
  items: EvidenceGalleryItem[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  onClose: () => void;
  language: SafetyLanguage;
  variant: "weekly" | "monthly";
};

function getItemSubtitle(
  item: EvidenceGalleryItem,
  language: SafetyLanguage,
  variant: "weekly" | "monthly"
): string {
  if (variant === "weekly") {
    return item.activity.shortTitle;
  }

  const monthlyItem = item as MonthlyEvidenceItem;
  return monthlyItem.sourceLabel || localizeActivity(monthlyItem.activity, language).shortTitle;
}

export function EvidenceGalleryModal({
  items,
  selectedIndex,
  onSelectIndex,
  onClose,
  language,
  variant,
}: EvidenceGalleryModalProps) {
  if (items.length === 0) return null;

  const current = items[selectedIndex];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border-subtle px-5 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text">{current?.file.name}</p>
            <p className="mt-1 text-[10px] text-text-dim">
              {selectedIndex + 1} / {items.length}
              {" • "}
              {current ? getItemSubtitle(current, language, variant) : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={
              variant === "monthly"
                ? "ml-4 cursor-pointer rounded-lg px-3 py-1.5 text-xl leading-none text-text-dim hover:bg-surface-hover hover:text-text"
                : "ml-4 rounded-lg px-3 py-1.5 text-xl leading-none text-text-dim hover:bg-surface-hover hover:text-text"
            }
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-bg/20 p-4">
          {variant === "weekly" ? (
            <>
              <div className="flex min-h-[55vh] items-center justify-center">
                {(() => {
                  if (!current) return null;

                  const currentKind = getPreviewKind(current.file.name, current.file.type);

                  if (currentKind === "image") {
                    return (
                      <img
                        src={current.file.url}
                        alt={current.file.name}
                        className="max-h-[68vh] max-w-full rounded-lg object-contain shadow-2xl"
                      />
                    );
                  }

                  if (currentKind === "video") {
                    return (
                      <video
                        src={current.file.url}
                        controls
                        autoPlay
                        className="max-h-[68vh] max-w-full rounded-lg bg-black object-contain shadow-2xl"
                      />
                    );
                  }

                  return (
                    <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
                      <div className="text-6xl">{getFileIcon(currentKind)}</div>
                      <p className="text-sm font-semibold text-text">{current.file.name}</p>
                      <p className="text-xs text-text-dim">
                        {getReadableFileKind(currentKind, language)}
                      </p>
                      <a
                        href={current.file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-text hover:bg-surface-hover"
                      >
                        {safetyText("open", language)}
                      </a>
                    </div>
                  );
                })()}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {items.map((galleryItem, galleryIndex) => {
                  const galleryKind = getPreviewKind(galleryItem.file.name, galleryItem.file.type);

                  return (
                    <button
                      key={`${galleryItem.activity.id}-${galleryItem.file.name}-gallery-${galleryIndex}`}
                      type="button"
                      onClick={() => onSelectIndex(galleryIndex)}
                      className={`relative h-16 cursor-pointer overflow-hidden rounded-lg border transition-all ${
                        galleryIndex === selectedIndex
                          ? "border-accent ring-2 ring-accent/30"
                          : "border-border hover:border-accent/50"
                      }`}
                    >
                      {galleryKind === "image" ? (
                        <img
                          src={galleryItem.file.url}
                          alt={galleryItem.file.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-bg/50 text-xl">
                          {getFileIcon(galleryKind)}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              {(() => {
                if (!current) return null;
                const currentKind = getPreviewKind(current.file.name, current.file.type);

                if (currentKind === "image") {
                  return (
                    <div className="flex min-h-[55vh] items-center justify-center">
                      <img
                        src={current.file.url}
                        alt={current.file.name}
                        className="max-h-[68vh] max-w-full rounded-lg object-contain shadow-2xl"
                      />
                    </div>
                  );
                }

                return (
                  <div className="flex min-h-[55vh] flex-col items-center justify-center gap-3 p-10 text-center">
                    <div className="text-6xl">{getFileIcon(currentKind)}</div>
                    <p className="text-sm font-semibold text-text">{current.file.name}</p>
                    <p className="text-xs text-text-dim">
                      {getReadableFileKind(currentKind, language)}
                    </p>
                    <a
                      href={current.file.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-text hover:bg-surface-hover"
                    >
                      {safetyText("open", language)}
                    </a>
                  </div>
                );
              })()}

              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {items.map((item, index) => {
                  const kind = getPreviewKind(item.file.name, item.file.type);
                  const monthlyItem = item as MonthlyEvidenceItem;
                  return (
                    <button
                      key={`monthly-gallery-${item.activity.id}-${monthlyItem.submissionId ?? "single"}-${item.file.name}-${index}`}
                      type="button"
                      onClick={() => onSelectIndex(index)}
                      className={`relative h-16 cursor-pointer overflow-hidden rounded-lg border transition-all ${
                        index === selectedIndex
                          ? "border-accent ring-2 ring-accent/30"
                          : "border-border hover:border-accent/50"
                      }`}
                    >
                      {kind === "image" ? (
                        <img
                          src={item.file.url}
                          alt={item.file.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-bg/50 text-xl">
                          {getFileIcon(kind)}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
