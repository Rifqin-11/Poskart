"use client";

import { useRef, useState } from "react";
import { Check, ImageUp, Loader2, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

type UploadState = "idle" | "dragging" | "uploading" | "success" | "error";

export function ImageUploadDropzone({
  accept,
  label = "Drop an image here",
  helperText,
  successLabel = "Upload complete",
  disabled = false,
  compact = false,
  className,
  validate,
  onUpload,
}: {
  accept: string;
  label?: string;
  helperText?: string;
  successLabel?: string;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
  validate?: (file: File) => string | null | undefined;
  onUpload: (file: File) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [message, setMessage] = useState("");

  const submit = async (file?: File) => {
    if (!file || disabled || state === "uploading") return;
    const validationError = validate?.(file);
    if (validationError) {
      setMessage(validationError);
      setState("error");
      return;
    }

    setMessage("");
    setState("uploading");
    try {
      await onUpload(file);
      setState("success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
      setState("error");
    }
  };

  const isBusy = state === "uploading";
  const isError = state === "error";
  const isSuccess = state === "success";

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (!disabled) inputRef.current?.click();
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled && !isBusy) setState("dragging");
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        if (!isBusy) setState("idle");
      }}
      onDrop={(event) => {
        event.preventDefault();
        void submit(event.dataTransfer.files.item(0) ?? undefined);
      }}
      className={cn(
        "group relative flex cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed text-center outline-none transition-[border-color,background-color,transform,box-shadow] duration-200 focus-visible:ring-2 focus-visible:ring-[#00357B] focus-visible:ring-offset-2",
        compact ? "min-h-20 px-3 py-3" : "min-h-32 px-5 py-5",
        state === "dragging" &&
          "scale-[1.01] border-[#00357B] bg-[#eef5ff] shadow-[0_8px_24px_rgba(0,53,123,0.12)]",
        isBusy && "cursor-wait border-[#00357B]/40 bg-[#f4f7ff]",
        isSuccess && "border-emerald-300 bg-emerald-50/70",
        isError && "border-red-300 bg-red-50/70",
        state === "idle" &&
          "border-zinc-300 bg-zinc-50/80 hover:border-[#00357B]/50 hover:bg-[#f4f7ff]",
        disabled && "cursor-not-allowed opacity-55",
        className,
      )}
    >
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept={accept}
        disabled={disabled || isBusy}
        onChange={(event) => {
          void submit(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <div className={cn("flex items-center gap-3", !compact && "flex-col")}>
        <span
          className={cn(
            "grid shrink-0 place-items-center rounded-lg transition-transform duration-200",
            compact ? "size-8" : "size-10",
            isBusy
              ? "bg-[#00357B] text-white"
              : isSuccess
                ? "bg-emerald-600 text-white"
                : isError
                  ? "bg-red-600 text-white"
                  : "bg-white text-[#00357B] shadow-sm ring-1 ring-zinc-200",
            state === "dragging" && "scale-110",
          )}
        >
          {isBusy ? <Loader2 className="size-4 animate-spin" /> : null}
          {isSuccess ? <Check className="size-4" /> : null}
          {isError ? <X className="size-4" /> : null}
          {state === "idle" || state === "dragging" ? (
            state === "dragging" ? <ImageUp className="size-4" /> : <Upload className="size-4" />
          ) : null}
        </span>
        <div className={cn("min-w-0", !compact && "text-center")}>
          <p className="text-xs font-semibold text-zinc-700">
            {isBusy
              ? "Uploading image..."
              : isSuccess
                ? successLabel
                : isError
                  ? "Upload failed"
                  : state === "dragging"
                    ? "Release to upload"
                    : label}
          </p>
          <p className="mt-0.5 text-[10px] leading-4 text-zinc-400">
            {isError ? message : helperText ?? "Drag and drop, or click to browse"}
          </p>
        </div>
      </div>
    </div>
  );
}
