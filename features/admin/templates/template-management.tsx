"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { Boxes, CloudUpload, Grid2X2, List } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageHeader } from "@/features/admin/_components/page-header";
import { FrameTemplateTester } from "@/features/admin/templates/frame-template-tester";
import {
  useDeleteTemplate,
  useReorderTemplates,
  useTemplates,
} from "@/features/admin/templates/use-templates";
import { cn } from "@/lib/utils";
import type { Template } from "@/types/template";

import { SortableTemplateCard } from "./_components/template-card";

const EMPTY_TEMPLATES: Template[] = [];

export function TemplateManagement() {
  const router = useRouter();
  const { data = EMPTY_TEMPLATES } = useTemplates();
  const deleteTemplate = useDeleteTemplate();
  const reorderTemplates = useReorderTemplates();
  const [orderedTemplates, setOrderedTemplates] = useState<Template[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [testTemplate, setTestTemplate] = useState<Template | null>(null);
  const confirmDelete = useConfirmDialog();
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
  );

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setOrderedTemplates(data);
    });
    return () => {
      cancelled = true;
    };
  }, [data]);

  const openAdd = () => router.push("/templates/builder/new");
  const openEdit = (template: Template) =>
    router.push(`/templates/builder/${template.id}`);

  const handleDelete = (t: Template) => {
    confirmDelete.confirm({
      title: "Delete template?",
      description: `Delete "${t.name}"? This cannot be undone.`,
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: () => {
        deleteTemplate.mutate(t.id, {
          onSuccess: () => toast.success("Template deleted"),
          onError: (err) =>
            toast.error(err instanceof Error ? err.message : "Delete failed"),
        });
      },
    });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    const oldIndex = orderedTemplates.findIndex(
      (template) => template.id === active.id,
    );
    const newIndex = orderedTemplates.findIndex(
      (template) => template.id === over.id,
    );
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(orderedTemplates, oldIndex, newIndex).map(
      (template, displayOrder) => ({ ...template, displayOrder }),
    );
    setOrderedTemplates(reordered);
    reorderTemplates.mutate(
      reordered.map((template) => template.id),
      {
        onSuccess: () => toast.success("Urutan template disimpan"),
        onError: (error) => {
          setOrderedTemplates(data);
          toast.error(
            error instanceof Error
              ? error.message
              : "Gagal menyimpan urutan template",
          );
        },
      },
    );
  };

  return (
    <div>
      {confirmDelete.dialog}
      <PageHeader
        title="Template Management"
        description="Frame templates for the Flutter photobooth picker screen."
        action={
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-zinc-200 bg-white p-1">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="icon"
                title="Grid view"
                aria-label="Grid view"
                onClick={() => setViewMode("grid")}
              >
                <Grid2X2 className="size-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="icon"
                title="List view"
                aria-label="List view"
                onClick={() => setViewMode("list")}
              >
                <List className="size-4" />
              </Button>
            </div>
            <Button onClick={openAdd}>
              <CloudUpload className="size-4" /> Add template
            </Button>
          </div>
        }
      />

      {orderedTemplates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Boxes className="mb-4 size-10 text-zinc-300" />
            <div className="text-sm font-medium text-zinc-500">
              No templates yet
            </div>
            <div className="mt-1 text-xs text-zinc-400">
              Create your first frame template for the Flutter app.
            </div>
            <Button className="mt-4" onClick={openAdd}>
              Add template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext
            items={orderedTemplates.map((template) => template.id)}
            strategy={rectSortingStrategy}
          >
            <div
              className={cn(
                "w-full gap-4",
                viewMode === "grid"
                  ? "grid md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5"
                  : "flex flex-col",
              )}
            >
              {orderedTemplates.map((template) => (
                <SortableTemplateCard
                  key={template.id}
                  template={template}
                  viewMode={viewMode}
                  onDelete={handleDelete}
                  onEdit={openEdit}
                  onTest={setTestTemplate}
                />
              ))}
            </div>
          </SortableContext>
          {testTemplate ? (
            <FrameTemplateTester
              template={testTemplate}
              open
              onOpenChange={(open) => {
                if (!open) setTestTemplate(null);
              }}
            />
          ) : null}
        </DndContext>
      )}
    </div>
  );
}
