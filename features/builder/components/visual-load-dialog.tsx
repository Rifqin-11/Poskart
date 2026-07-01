"use client";

import { Trash2, X } from "lucide-react";
import { relativeTime, type LocalDraft } from "@/lib/services/draft-service";
import { cn } from "@/lib/utils";
import type { LayoutSchema } from "@/types/builder";

type SavedBuilderTheme = {
  id: string;
  name: string;
  is_active: boolean;
  updated_at: string;
  schema: LayoutSchema;
};

export function VisualLoadDialog({
  loadTab,
  setLoadTab,
  localDrafts,
  dbThemes,
  loadSearch,
  setLoadSearch,
  onClose,
  onLoadSchema,
  onDeleteLocalDraft,
}: {
  loadTab: "local" | "db";
  setLoadTab: (tab: "local" | "db") => void;
  localDrafts: LocalDraft[];
  dbThemes: SavedBuilderTheme[];
  loadSearch: string;
  setLoadSearch: (value: string) => void;
  onClose: () => void;
  onLoadSchema: (
    schema: LayoutSchema,
    opts?: { themeId?: string; themeName?: string },
  ) => void;
  onDeleteLocalDraft: (id: string) => void;
}) {
  const normalizedSearch = loadSearch.toLowerCase();

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/50 pt-16 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h2 className="text-base font-semibold text-zinc-900">
            Load Template
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex border-b border-zinc-100">
          <button
            onClick={() => setLoadTab("local")}
            className={cn(
              "flex-1 py-2.5 text-xs font-semibold transition-colors",
              loadTab === "local"
                ? "border-b-2 border-zinc-900 text-zinc-900"
                : "text-zinc-400 hover:text-zinc-700",
            )}
          >
            Local Drafts {localDrafts.length > 0 && `(${localDrafts.length})`}
          </button>
          <button
            onClick={() => setLoadTab("db")}
            className={cn(
              "flex-1 py-2.5 text-xs font-semibold transition-colors",
              loadTab === "db"
                ? "border-b-2 border-zinc-900 text-zinc-900"
                : "text-zinc-400 hover:text-zinc-700",
            )}
          >
            Saved Themes {dbThemes.length > 0 && `(${dbThemes.length})`}
          </button>
        </div>

        <div className="border-b border-zinc-100 px-4 py-2">
          <input
            className="w-full rounded-lg bg-zinc-50 px-3 py-1.5 text-xs text-zinc-700 outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-200"
            placeholder="Search templates..."
            value={loadSearch}
            onChange={(event) => setLoadSearch(event.target.value)}
            autoFocus
          />
        </div>

        <div className="max-h-80 overflow-y-auto">
          {loadTab === "local" ? (
            <LocalDraftList
              drafts={localDrafts}
              search={normalizedSearch}
              onLoadSchema={onLoadSchema}
              onDeleteLocalDraft={onDeleteLocalDraft}
            />
          ) : (
            <SavedThemeList
              themes={dbThemes}
              search={normalizedSearch}
              onLoadSchema={onLoadSchema}
            />
          )}
        </div>

        <div className="border-t border-zinc-100 px-5 py-3 text-[10px] text-zinc-400">
          Local drafts are stored in your browser · DB themes are from Supabase
        </div>
      </div>
    </div>
  );
}

function LocalDraftList({
  drafts,
  search,
  onLoadSchema,
  onDeleteLocalDraft,
}: {
  drafts: LocalDraft[];
  search: string;
  onLoadSchema: (schema: LayoutSchema) => void;
  onDeleteLocalDraft: (id: string) => void;
}) {
  if (drafts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm font-medium text-zinc-400">
          No local drafts yet
        </p>
        <p className="mt-1 text-xs text-zinc-300">
          Press Ctrl+S or click Save to create a draft.
        </p>
      </div>
    );
  }

  return drafts
    .filter((draft) => !search || draft.name.toLowerCase().includes(search))
    .map((draft) => (
      <div
        key={draft.id}
        className="flex items-center gap-3 border-b border-zinc-50 px-4 py-3 hover:bg-zinc-50"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-800">
            {draft.name}
          </p>
          <p className="mt-0.5 text-[10px] text-zinc-400">
            {relativeTime(draft.savedAt)} ·{" "}
            {draft.schema.canvas?.width ?? "?"}×
            {draft.schema.canvas?.height ?? "?"}
          </p>
        </div>
        <button
          onClick={() => onLoadSchema(draft.schema)}
          className="shrink-0 rounded-lg bg-zinc-900 px-3 py-1 text-xs font-semibold text-white hover:bg-zinc-700"
        >
          Load
        </button>
        <button
          onClick={() => onDeleteLocalDraft(draft.id)}
          className="shrink-0 rounded-md p-1 text-zinc-300 hover:bg-red-50 hover:text-red-500"
          title="Delete draft"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    ));
}

function SavedThemeList({
  themes,
  search,
  onLoadSchema,
}: {
  themes: SavedBuilderTheme[];
  search: string;
  onLoadSchema: (
    schema: LayoutSchema,
    opts: { themeId: string; themeName: string },
  ) => void;
}) {
  if (themes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm font-medium text-zinc-400">
          No themes in database
        </p>
        <p className="mt-1 text-xs text-zinc-300">
          Click &quot;Save theme&quot; to publish a theme to the database.
        </p>
      </div>
    );
  }

  return themes
    .filter((theme) => !search || theme.name.toLowerCase().includes(search))
    .map((theme) => (
      <div
        key={theme.id}
        className="flex items-center gap-3 border-b border-zinc-50 px-4 py-3 hover:bg-zinc-50"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-medium text-zinc-800">
              {theme.name}
            </p>
            {theme.is_active && (
              <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
                Active
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[10px] text-zinc-400">
            {relativeTime(theme.updated_at)} ·{" "}
            {theme.schema.canvas?.width ?? "?"}×
            {theme.schema.canvas?.height ?? "?"}
          </p>
        </div>
        <button
          onClick={() =>
            onLoadSchema(theme.schema, {
              themeId: theme.id,
              themeName: theme.name,
            })
          }
          className="shrink-0 rounded-lg bg-zinc-900 px-3 py-1 text-xs font-semibold text-white hover:bg-zinc-700"
        >
          Load
        </button>
      </div>
    ));
}
