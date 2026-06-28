"use client";

import { Button } from "@/components/ui/button";

export function BuilderUnsavedDialog({
  open,
  title = "Perubahan belum disimpan",
  description,
  isSaving = false,
  onCancel,
  onDiscard,
  onSave,
}: {
  open: boolean;
  title?: string;
  description: string;
  isSaving?: boolean;
  onCancel: () => void;
  onDiscard: () => void;
  onSave: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-zinc-950">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">{description}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="outline"
            className="border-red-100 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
            onClick={onDiscard}
          >
            Buang
          </Button>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
