"use client";

import type { ReactNode } from "react";
import { ArrowLeft, Redo2, Save, Undo2 } from "lucide-react";
import { BuilderToolbarButton } from "@/features/builder/shared/builder-toolbar-button";
import { cn } from "@/lib/utils";

export function BuilderHeader({
  title,
  subtitle,
  saveLabel,
  isSaving = false,
  canUndo,
  canRedo,
  leftContent,
  centerContent,
  rightMeta,
  onBack,
  onSave,
  onUndo,
  onRedo,
}: {
  title?: string;
  subtitle?: string;
  saveLabel: string;
  isSaving?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  leftContent?: ReactNode;
  centerContent?: ReactNode;
  rightMeta?: ReactNode;
  onBack: () => void;
  onSave: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
}) {
  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-zinc-200 bg-white px-3">
      <BuilderToolbarButton onClick={onBack} title="Back">
        <ArrowLeft className="size-3.5" />
        Back
      </BuilderToolbarButton>

      {title ? (
        <>
          <div className="h-4 w-px bg-zinc-200" />
          <div className="min-w-0 pr-2">
            <div className="truncate text-sm font-semibold text-zinc-950">
              {title}
            </div>
            {subtitle ? (
              <div className="truncate text-[11px] text-zinc-500">
                {subtitle}
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      {leftContent ? (
        <>
          <div className="h-4 w-px bg-zinc-200" />
          {leftContent}
        </>
      ) : null}

      {centerContent ? (
        <>
          <div className="h-4 w-px bg-zinc-200" />
          {centerContent}
        </>
      ) : null}

      <div className="flex items-center gap-1">
        {onUndo ? (
          <BuilderToolbarButton
            onClick={onUndo}
            disabled={canUndo === false}
            title="Undo"
          >
            <Undo2 className="size-3.5" />
          </BuilderToolbarButton>
        ) : null}
        {onRedo ? (
          <BuilderToolbarButton
            onClick={onRedo}
            disabled={canRedo === false}
            title="Redo"
          >
            <Redo2 className="size-3.5" />
          </BuilderToolbarButton>
        ) : null}
      </div>

      <div className="ml-auto flex min-w-0 items-center gap-2">
        {rightMeta}
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className={cn(
            "flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-60",
          )}
        >
          <Save className="size-3.5" />
          {isSaving ? "Saving…" : saveLabel}
        </button>
      </div>
    </div>
  );
}
