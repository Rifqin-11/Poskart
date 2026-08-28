"use client";

import { gooeyToast, type GooeyToastOptions } from "goey-toast";
import { getUserFacingErrorMessage } from "@/lib/errors/user-facing-error";

type ToastTitle = string;
type ToastOptions = GooeyToastOptions;

export function showErrorToast(
  title: string,
  error: unknown,
  fallback: string,
  options?: Omit<ToastOptions, "description">,
) {
  return toast.error(title, {
    ...options,
    description: getUserFacingErrorMessage(error, fallback),
  });
}

function message(title: ToastTitle, options?: ToastOptions) {
  return gooeyToast(title, options);
}

export const toast = Object.assign(message, {
  success: (title: ToastTitle, options?: ToastOptions) =>
    gooeyToast.success(title, options),
  error: (title: ToastTitle, options?: ToastOptions) =>
    gooeyToast.error(title, options),
  message,
  warning: (title: ToastTitle, options?: ToastOptions) =>
    gooeyToast.warning(title, options),
  info: (title: ToastTitle, options?: ToastOptions) =>
    gooeyToast.info(title, options),
  loading: message,
  promise: gooeyToast.promise,
  dismiss: gooeyToast.dismiss,
});
