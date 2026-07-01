"use client";

export function VisualSaveDialog({
  themeName,
  setThemeName,
  isSaving,
  onClose,
  onConfirm,
}: {
  themeName: string;
  setThemeName: (value: string) => void;
  isSaving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="mb-1 text-lg font-semibold text-zinc-900">
          Save as Theme
        </h2>
        <p className="mb-4 text-sm text-zinc-500">
          Give this layout a name. It will appear on the Themes page where you
          can activate it for the kiosk.
        </p>
        <input
          autoFocus
          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
          placeholder="e.g. Redmi Pad Landscape v1"
          value={themeName}
          onChange={(event) => setThemeName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && themeName.trim()) onConfirm();
            if (event.key === "Escape") onClose();
          }}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!themeName.trim() || isSaving}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
