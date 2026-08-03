"use client";

import type { ReactNode } from "react";
import {
  ArrowLeft,
  CircleHelp,
  MoreHorizontal,
  Redo2,
  Save,
  Undo2,
} from "lucide-react";
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
  onShowTutorial,
  compact = false,
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
  onShowTutorial?: () => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="relative z-40 flex h-14 shrink-0 items-center gap-1.5 border-b border-zinc-200/80 bg-[#fcfcfb] px-2 shadow-sm shadow-zinc-950/[0.02]">
        <BuilderToolbarButton onClick={onBack} title="Back">
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">Back</span>
        </BuilderToolbarButton>

        {leftContent ? (
          <>
            <div className="h-4 w-px shrink-0 bg-zinc-200" />
            <div className="min-w-0">{leftContent}</div>
          </>
        ) : null}

        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          {onUndo ? (
            <BuilderToolbarButton
              onClick={onUndo}
              disabled={canUndo === false}
              title="Undo"
            >
              <Undo2 className="size-4" />
            </BuilderToolbarButton>
          ) : null}
          {onRedo ? (
            <BuilderToolbarButton
              onClick={onRedo}
              disabled={canRedo === false}
              title="Redo"
            >
              <Redo2 className="size-4" />
            </BuilderToolbarButton>
          ) : null}

          <details className="group relative">
            <summary className="flex size-8 cursor-pointer list-none items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 [&::-webkit-details-marker]:hidden">
              <MoreHorizontal className="size-4" />
              <span className="sr-only">More builder actions</span>
            </summary>
            <div className="absolute top-10 right-0 z-50 w-64 rounded-xl border border-zinc-200 bg-white p-2 shadow-2xl shadow-zinc-950/15">
              <div className="flex flex-col gap-1 [&>*]:w-full [&>*]:justify-start">
                {onShowTutorial ? (
                  <BuilderToolbarButton
                    data-builder-tour="tutorial"
                    onClick={onShowTutorial}
                    title="Show tutorial"
                  >
                    <CircleHelp className="size-3.5" />
                    Show tutorial
                  </BuilderToolbarButton>
                ) : null}
                {centerContent}
                {rightMeta}
              </div>
            </div>
          </details>

          <button
            data-builder-tour="save"
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-[#00357B] px-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-950/20 transition-all hover:-translate-y-px hover:bg-[#002a62] disabled:opacity-60"
          >
            <Save className="size-3.5" />
            <span className="hidden sm:inline">
              {isSaving ? "Saving…" : saveLabel}
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-zinc-200/80 bg-[#fcfcfb] px-3 shadow-sm shadow-zinc-950/[0.02]">
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
        {onShowTutorial ? (
          <BuilderToolbarButton
            data-builder-tour="tutorial"
            onClick={onShowTutorial}
            title="Show tutorial"
            className="text-[#00357B] hover:bg-[#e9f0fb] hover:text-[#00357B]"
          >
            <CircleHelp className="size-3.5" />
            <span className="hidden lg:inline">Show tutorial</span>
          </BuilderToolbarButton>
        ) : null}
        {rightMeta}
        <button
          data-builder-tour="save"
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className={cn(
            "flex items-center gap-1.5 rounded-lg bg-[#00357B] px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-blue-950/20 transition-all hover:-translate-y-px hover:bg-[#002a62] disabled:opacity-60",
          )}
        >
          <Save className="size-3.5" />
          {isSaving ? "Saving…" : saveLabel}
        </button>
      </div>
    </div>
  );
}
