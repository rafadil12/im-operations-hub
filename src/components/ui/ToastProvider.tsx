"use client";

import type { ReactNode } from "react";
import { toast as toastify, ToastContainer, type ToastOptions } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTheme } from "@/lib/theme";

export type ToastVariant = "success" | "error" | "info";

type ToastContextValue = {
  toast: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
};

const OPTIONS: ToastOptions = {
  position: "top-right",
  autoClose: 4000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
};

function show(message: string, variant: ToastVariant = "info") {
  if (variant === "success") {
    toastify.success(message, OPTIONS);
  } else if (variant === "error") {
    toastify.error(message, OPTIONS);
  } else {
    toastify(message, OPTIONS);
  }
}

/** Stable API — avoids useEffect refetch loops when toast is in deps. */
const toastApi: ToastContextValue = {
  toast: show,
  success: (message: string) => show(message, "success"),
  error: (message: string) => show(message, "error"),
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  return (
    <>
      {children}
      <ToastContainer
        position="top-right"
        autoClose={4000}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme={theme}
        toastClassName="!rounded-lg !text-sm !font-medium"
      />
    </>
  );
}

export function useToast(): ToastContextValue {
  return toastApi;
}
