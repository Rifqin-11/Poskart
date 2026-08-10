"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Boxes,
  Edit2,
  GripVertical,
  ImagePlus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePermission } from "@/features/admin/hooks/use-permission";
import { FrameShowcasePreview } from "@/features/public/showcase/frame-showcase-preview";
import { cn } from "@/lib/utils";
import type { Template } from "@/types/template";

type SortableTemplateCardProps = {
  template: Template;
  viewMode: "grid" | "list";
  onDelete: (template: Template) => void;
  onEdit: (template: Template) => void;
  onTest: (template: Template) => void;
};

export function SortableTemplateCard({
  template,
  viewMode,
  onDelete,
  onEdit,
  onTest,
}: SortableTemplateCardProps) {
  const { isReadOnly } = usePermission();
  const readOnly = isReadOnly("templates");
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: template.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
      }}
      className={cn(isDragging && "opacity-70")}
    >
      <Card className="group h-full overflow-hidden">
        <CardContent
          className={cn(
            "p-4",
            viewMode === "grid"
              ? "space-y-4"
              : "grid grid-cols-[80px_minmax(0,1fr)] items-start gap-x-4 gap-y-4 sm:grid-cols-[auto_80px_minmax(0,1fr)] sm:items-center lg:grid-cols-[auto_96px_minmax(0,1fr)_auto]",
          )}
        >
          <div
            className={cn(
              "flex items-center justify-between gap-3",
              viewMode === "list" &&
                "col-span-2 sm:col-span-1 sm:flex-col sm:justify-center sm:gap-1 lg:flex-row lg:justify-between lg:gap-3",
            )}
          >
            <span className="text-xs font-medium text-zinc-400">
              Urutan {template.displayOrder + 1}
            </span>
            {!readOnly && (
              <button
                type="button"
                className="flex size-9 cursor-grab touch-none items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 active:cursor-grabbing"
                title="Geser untuk mengubah urutan"
                aria-label={`Ubah urutan ${template.name}`}
                {...attributes}
                {...listeners}
              >
                <GripVertical className="size-4" />
              </button>
            )}
          </div>

          <div
            className={cn(
              "relative mx-auto flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm",
              viewMode === "grid" ? "aspect-[8/12] h-48 w-32" : "h-28 w-20",
            )}
            style={{ backgroundColor: `${template.accentColor}14` }}
          >
            {template.frameLayout ? (
              <FrameShowcasePreview
                name={template.name}
                accentColor={template.accentColor}
                frameImageUrl={template.frameImageUrl ?? null}
                frameLayout={template.frameLayout}
                className="p-1.5"
              />
            ) : template.frameImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={template.frameImageUrl}
                alt={template.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <Boxes
                className="size-10"
                style={{ color: template.accentColor }}
              />
            )}
          </div>

          <div className="min-w-0 space-y-3">
            <h2
              className={cn(
                "min-w-0 text-base font-semibold text-zinc-950",
                viewMode === "grid"
                  ? "truncate"
                  : "line-clamp-2 break-words leading-snug",
              )}
            >
              {template.name}
            </h2>
            {template.tagline ? (
              <p className="line-clamp-2 text-sm text-zinc-500">
                {template.tagline}
              </p>
            ) : (
              <p className="text-sm text-zinc-400">No tagline configured.</p>
            )}
            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span
                  className="size-3 rounded-full border border-zinc-200"
                  style={{ background: template.accentColor }}
                />
                {template.accentColor}
              </span>
              <span>{template.photoCount} photos</span>
              <span>
                {template.usageCount.toLocaleString("id-ID")} kali digunakan
              </span>
              <span>
                {template.frameLayout ? "Custom layout" : "Default layout"}
              </span>
            </div>
          </div>

          <div
            className={cn(
              "shrink-0 gap-1 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-1.5",
              viewMode === "grid"
                ? cn("grid", readOnly ? "grid-cols-1" : "grid-cols-2")
                : cn(
                    "col-span-2 grid sm:col-span-3 lg:col-span-1 lg:flex lg:w-28 lg:flex-col",
                    readOnly ? "grid-cols-1" : "grid-cols-2",
                  ),
            )}
          >
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-full justify-center rounded-xl border-blue-100 bg-blue-50/80 px-2.5 text-[#00357B] shadow-none hover:border-blue-200 hover:bg-blue-100 lg:justify-start"
              onClick={() => onTest(template)}
            >
              <ImagePlus className="size-3.5" /> Test
            </Button>
            {!readOnly && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-full justify-center rounded-xl border-transparent bg-white px-2.5 text-zinc-700 shadow-none hover:border-zinc-200 hover:bg-zinc-100 lg:justify-start"
                  onClick={() => onEdit(template)}
                >
                  <Edit2 className="size-3.5" /> Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-full justify-center rounded-xl px-2.5 text-red-600 hover:bg-red-50 hover:text-red-700 lg:justify-start"
                  onClick={() => onDelete(template)}
                >
                  <Trash2 className="size-3.5" /> Delete
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
