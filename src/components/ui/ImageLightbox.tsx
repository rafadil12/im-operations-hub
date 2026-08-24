"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

type Props = {
  src: string;
  alt?: string;
  onClose: () => void;
};

function subscribe() {
  return () => {};
}

export function ImageLightbox({ src, alt = "", onClose }: Props) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close preview"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[85vh] max-w-[90vw]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute -right-2 -top-2 z-20 flex size-8 items-center justify-center rounded-full bg-surface text-lg leading-none text-text shadow ring-1 ring-border hover:bg-surface-hover"
        >
          ×
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element -- lightbox for dynamic/local preview URLs */}
        <img
          src={src}
          alt={alt}
          className="max-h-[85vh] max-w-[90vw] rounded-md bg-bg object-contain shadow-lg"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>,
    document.body,
  );
}
