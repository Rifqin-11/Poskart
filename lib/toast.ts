"use client";

import { gooeyToast, type GooeyToastOptions } from "goey-toast";
import { getUserFacingErrorMessage } from "@/lib/errors/user-facing-error";

type ToastTitle = string;
type ToastOptions = GooeyToastOptions;

/**
 * GooeyToastWrapper ignores the toaster-level `showTimestamp` prop for regular
 * toasts (it defaults per-toast to `true`), so the clock-time stamp is disabled
 * here instead — otherwise it bloats the pill and truncates the title.
 */
function withDefaults(options?: ToastOptions): ToastOptions | undefined {
  if (!options) return { showTimestamp: false };
  return { ...options, showTimestamp: false };
}

export function showErrorToast(
  title: string,
  error: unknown,
  fallback: string,
  options?: Omit<ToastOptions, "description">,
) {
  return toast.error(title, {
    ...withDefaults(options),
    description: getUserFacingErrorMessage(error, fallback),
  });
}

function message(title: ToastTitle, options?: ToastOptions) {
  return gooeyToast(title, withDefaults(options));
}

export const toast = Object.assign(message, {
  success: (title: ToastTitle, options?: ToastOptions) =>
    gooeyToast.success(title, withDefaults(options)),
  error: (title: ToastTitle, options?: ToastOptions) =>
    gooeyToast.error(title, withDefaults(options)),
  message,
  warning: (title: ToastTitle, options?: ToastOptions) =>
    gooeyToast.warning(title, withDefaults(options)),
  info: (title: ToastTitle, options?: ToastOptions) =>
    gooeyToast.info(title, withDefaults(options)),
  loading: message,
  promise: (
    promise: Parameters<typeof gooeyToast.promise>[0],
    data: Parameters<typeof gooeyToast.promise>[1],
  ) => gooeyToast.promise(promise, { ...data, showTimestamp: false }),
  dismiss: gooeyToast.dismiss,
});
