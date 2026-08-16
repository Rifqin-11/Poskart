"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Boxes,
  Check,
  CloudUpload,
  FolderPlus,
  Grid2X2,
  GripVertical,
  List,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/features/admin/_components/page-header";
import { FrameTemplateTester } from "@/features/admin/templates/frame-template-tester";
import {
  useDeleteTemplate,
  useCreateFrameCategory,
  useDeleteFrameCategory,
  useFrameCategories,
  useMoveTemplateToFrameCategory,
  useReorderFrameCategories,
  useReorderTemplates,
  useTemplates,
  useUpdateFrameCategory,
} from "@/features/admin/templates/use-templates";
import { cn } from "@/lib/utils";
import { getUserFacingErrorMessage } from "@/lib/errors/user-facing-error";
import { usePermission } from "@/features/admin/hooks/use-permission";
import { useI18n } from "@/lib/i18n/i18n-provider";
import type { FrameCategory, Template } from "@/types/template";

import { SortableTemplateCard } from "./_components/template-card";

const EMPTY_TEMPLATES: Template[] = [];
const GROUP_DROP_PREFIX = "template-category:";

type TemplateGroup = {
  id: string;
  label: string | null;
  frameCategoryId: string | null;
  templates: Template[];
};

type ActiveTemplateDrag = {
  templateId: string;
  sourceGroupId: string;
  currentGroupId: string;
  initialTemplates: Template[];
};

export function TemplateManagement() {
  const router = useRouter();
  const { data = EMPTY_TEMPLATES } = useTemplates();
  const deleteTemplate = useDeleteTemplate();
  const reorderTemplates = useReorderTemplates();
  const moveTemplateToFrameCategory = useMoveTemplateToFrameCategory();
  const reorderFrameCategories = useReorderFrameCategories();
  const { data: frameCategories = [] } = useFrameCategories();
  const createFrameCategory = useCreateFrameCategory();
  const updateFrameCategory = useUpdateFrameCategory();
  const deleteFrameCategory = useDeleteFrameCategory();
  const { isReadOnly } = usePermission();
  const { t } = useI18n();
  const [orderedTemplates, setOrderedTemplates] = useState<Template[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [testTemplate, setTestTemplate] = useState<Template | null>(null);
  const [frameCategoriesOpen, setFrameCategoriesOpen] = useState(false);
  const orderedTemplatesRef = useRef<Template[]>([]);
  const activeTemplateDragRef = useRef<ActiveTemplateDrag | null>(null);
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
      if (!cancelled) {
        orderedTemplatesRef.current = data;
        setOrderedTemplates(data);
      }
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
      title: "Delete frame?",
      description: `Delete "${t.name}"? This cannot be undone.`,
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: () => {
        deleteTemplate.mutate(t.id, {
          onSuccess: () => toast.success("Frame deleted"),
          onError: (err) =>
            toast.error(getUserFacingErrorMessage(err, "Frame tidak dapat dihapus.")),
        });
      },
    });
  };

  const handleDeleteFrameCategory = (category: FrameCategory) => {
    confirmDelete.confirm({
      title: "Delete frame category?",
      description: `Frames in "${category.name}" will remain available but become uncategorized.`,
      confirmLabel: "Delete category",
      destructive: true,
      onConfirm: () => {
        deleteFrameCategory.mutate(category.id, {
          onSuccess: () => toast.success("Frame category deleted"),
          onError: (error) =>
            toast.error(
              getUserFacingErrorMessage(error, "Kategori frame tidak dapat dihapus."),
            ),
        });
      },
    });
  };

  const templateGroups = useMemo<TemplateGroup[]>(() => {
    if (frameCategories.length === 0) {
      return [
        {
          id: "all-templates",
          label: null,
          frameCategoryId: null,
          templates: orderedTemplates,
        },
      ];
    }

    const categorizedGroups = frameCategories.map((category) => ({
      id: category.id,
      label: category.name,
      frameCategoryId: category.id,
      templates: orderedTemplates.filter(
        (template) => template.frameCategoryId === category.id,
      ),
    }));
    const uncategorizedTemplates = orderedTemplates.filter(
      (template) => !template.frameCategoryId,
    );

    return [
      ...categorizedGroups,
      {
        id: "uncategorized-templates",
        label: "General",
        frameCategoryId: null,
        templates: uncategorizedTemplates,
      },
    ];
  }, [frameCategories, orderedTemplates]);

  const setTemplateOrder = (templates: Template[]) => {
    orderedTemplatesRef.current = templates;
    setOrderedTemplates(templates);
  };

  const getDestinationGroup = (overId: string) =>
    templateGroups.find((candidate) =>
      candidate.templates.some((template) => template.id === overId),
    ) ??
    templateGroups.find(
      (candidate) => `${GROUP_DROP_PREFIX}${candidate.id}` === overId,
    );

  const handleDragStart = ({ active }: DragStartEvent) => {
    const templateId = String(active.id);
    const sourceGroup = templateGroups.find((candidate) =>
      candidate.templates.some((template) => template.id === templateId),
    );
    if (!sourceGroup) return;

    activeTemplateDragRef.current = {
      templateId,
      sourceGroupId: sourceGroup.id,
      currentGroupId: sourceGroup.id,
      initialTemplates: orderedTemplatesRef.current,
    };
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    const activeDrag = activeTemplateDragRef.current;
    if (!activeDrag || !over || String(active.id) !== activeDrag.templateId) {
      return;
    }

    const activeId = activeDrag.templateId;
    const sourceGroup = templateGroups.find((candidate) =>
      candidate.templates.some((template) => template.id === activeId),
    );
    const destinationGroup = getDestinationGroup(String(over.id));
    if (
      !sourceGroup ||
      !destinationGroup ||
      sourceGroup.id === destinationGroup.id
    ) {
      return;
    }

    const activeTemplate = sourceGroup.templates.find(
      (template) => template.id === activeId,
    );
    if (!activeTemplate) return;

    const sourceTemplates = sourceGroup.templates.filter(
      (template) => template.id !== activeId,
    );
    const destinationTemplates = [...destinationGroup.templates];
    const destinationIndex = destinationTemplates.findIndex(
      (template) => template.id === String(over.id),
    );
    destinationTemplates.splice(
      destinationIndex < 0 ? destinationTemplates.length : destinationIndex,
      0,
      {
        ...activeTemplate,
        frameCategoryId: destinationGroup.frameCategoryId ?? undefined,
      },
    );

    activeDrag.currentGroupId = destinationGroup.id;
    setTemplateOrder(
      templateGroups
        .flatMap((group) => {
          if (group.id === sourceGroup.id) return sourceTemplates;
          if (group.id === destinationGroup.id) return destinationTemplates;
          return group.templates;
        })
        .map((template, displayOrder) => ({ ...template, displayOrder })),
    );
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    const activeDrag = activeTemplateDragRef.current;
    activeTemplateDragRef.current = null;
    if (isReadOnly("templates")) return;
    if (!over) {
      if (activeDrag) setTemplateOrder(activeDrag.initialTemplates);
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeDrag && activeDrag.currentGroupId !== activeDrag.sourceGroupId) {
      const movedTemplate = orderedTemplatesRef.current.find(
        (template) => template.id === activeId,
      );
      if (!movedTemplate) {
        setTemplateOrder(activeDrag.initialTemplates);
        return;
      }

      moveTemplateToFrameCategory.mutate(
        {
          templateId: activeId,
          frameCategoryId: movedTemplate.frameCategoryId ?? null,
          templateIds: orderedTemplatesRef.current.map(
            (template) => template.id,
          ),
        },
        {
          onSuccess: () =>
            toast.success("Kategori dan urutan frame disimpan"),
          onError: (error) => {
            setTemplateOrder(activeDrag.initialTemplates);
            toast.error(
              getUserFacingErrorMessage(
                error,
                "Gagal menyimpan kategori frame. Coba lagi.",
              ),
            );
          },
        },
      );
      return;
    }

    if (active.id === over.id) return;

    const sourceGroup = templateGroups.find((candidate) =>
      candidate.templates.some((template) => template.id === active.id),
    );
    const destinationGroup = getDestinationGroup(overId);
    if (!sourceGroup || !destinationGroup) return;

    const activeTemplate = sourceGroup.templates.find(
      (template) => template.id === activeId,
    );
    if (!activeTemplate) return;

    const oldIndex = sourceGroup.templates.findIndex(
      (template) => template.id === activeId,
    );
    const destinationIndex = destinationGroup.templates.findIndex(
      (template) => template.id === overId,
    );

    let nextGroups: TemplateGroup[];
    if (sourceGroup.id === destinationGroup.id) {
      const newIndex =
        destinationIndex < 0
          ? sourceGroup.templates.length - 1
          : destinationIndex;
      if (oldIndex === newIndex) return;
      const movedGroup = arrayMove(sourceGroup.templates, oldIndex, newIndex);
      nextGroups = templateGroups.map((group) =>
        group.id === sourceGroup.id
          ? { ...group, templates: movedGroup }
          : group,
      );
    } else {
      const movedTemplate: Template = {
        ...activeTemplate,
        frameCategoryId: destinationGroup.frameCategoryId ?? undefined,
      };
      const sourceTemplates = sourceGroup.templates.filter(
        (template) => template.id !== activeId,
      );
      const targetIndex =
        destinationIndex < 0
          ? destinationGroup.templates.length
          : destinationIndex;
      const destinationTemplates = [...destinationGroup.templates];
      destinationTemplates.splice(targetIndex, 0, movedTemplate);
      nextGroups = templateGroups.map((group) => {
        if (group.id === sourceGroup.id) {
          return { ...group, templates: sourceTemplates };
        }
        if (group.id === destinationGroup.id) {
          return { ...group, templates: destinationTemplates };
        }
        return group;
      });
    }

    const reordered = nextGroups
      .flatMap((group) => group.templates)
      .map((template, displayOrder) => ({ ...template, displayOrder }));
    setTemplateOrder(reordered);
    const templateIds = reordered.map((template) => template.id);
    const rollback = (error: unknown) => {
      setTemplateOrder(activeDrag?.initialTemplates ?? data);
      toast.error(
        getUserFacingErrorMessage(
          error,
          "Gagal menyimpan urutan frame. Coba lagi.",
        ),
      );
    };

    if (sourceGroup.id !== destinationGroup.id) {
      moveTemplateToFrameCategory.mutate(
        {
          templateId: activeId,
          frameCategoryId: destinationGroup.frameCategoryId,
          templateIds,
        },
        {
          onSuccess: () =>
            toast.success("Kategori dan urutan frame disimpan"),
        },
      );
    } else {
      reorderTemplates.mutate(templateIds, {
        onSuccess: () => toast.success("Urutan frame disimpan"),
        onError: rollback,
      });
    }
  };

  return (
    <div>
      {confirmDelete.dialog}
      <PageHeader
        title={t("templates.pageTitle")}
        description={t("templates.pageDesc")}
        action={
          <div className="flex w-full flex-wrap items-center gap-2.5 md:w-auto md:justify-end">
            <div className="flex h-10 items-center gap-0.5 rounded-full border border-zinc-200 bg-white p-1 shadow-sm shadow-zinc-950/[0.03]">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="icon"
                title="Grid view"
                aria-label="Grid view"
                className="size-8 rounded-full"
                onClick={() => setViewMode("grid")}
              >
                <Grid2X2 className="size-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="icon"
                title="List view"
                aria-label="List view"
                className="size-8 rounded-full"
                onClick={() => setViewMode("list")}
              >
                <List className="size-4" />
              </Button>
            </div>
            {!isReadOnly("templates") && (
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full px-4"
                onClick={() => setFrameCategoriesOpen(true)}
              >
                <FolderPlus className="size-4" /> {t("templates.frameCategories")}
              </Button>
            )}
            {!isReadOnly("templates") && (
              <Button onClick={openAdd} className="h-10 rounded-full px-4">
                <CloudUpload className="size-4" /> {t("templates.addTemplate")}
              </Button>
            )}
          </div>
        }
      />

      <FrameCategoriesDialog
        open={frameCategoriesOpen}
        categories={frameCategories}
        creating={createFrameCategory.isPending}
        updatingId={updateFrameCategory.variables?.id ?? null}
        deletingId={deleteFrameCategory.variables ?? null}
        reordering={reorderFrameCategories.isPending}
        onOpenChange={setFrameCategoriesOpen}
        onCreate={(name) =>
          createFrameCategory.mutate(name, {
            onSuccess: () => toast.success("Frame category created"),
            onError: (error) =>
              toast.error(
                getUserFacingErrorMessage(
                  error,
                  "Kategori frame tidak dapat dibuat.",
                ),
              ),
          })
        }
        onUpdate={(id, name) =>
          updateFrameCategory.mutate(
            { id, name },
            {
              onSuccess: () => toast.success("Frame category updated"),
              onError: (error) =>
                toast.error(
                  getUserFacingErrorMessage(
                    error,
                    "Kategori frame tidak dapat diperbarui.",
                  ),
                ),
            },
          )
        }
        onDelete={handleDeleteFrameCategory}
        onReorder={async (categoryIds) => {
          try {
            await reorderFrameCategories.mutateAsync(categoryIds);
            toast.success("Urutan kategori disimpan");
          } catch (error) {
            toast.error(
              getUserFacingErrorMessage(
                error,
                "Gagal menyimpan urutan kategori. Coba lagi.",
              ),
            );
            throw error;
          }
        }}
      />

      {orderedTemplates.length === 0 ? (
        <div className="relative overflow-hidden rounded-4xl border border-blue-100 bg-[#f7f9ff] px-6 py-16 text-center sm:px-10">
          <div className="absolute -right-20 -top-24 size-64 rounded-full bg-blue-100/70 blur-3xl" />
          <div className="relative mx-auto max-w-lg">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-white text-[#00357B] shadow-sm ring-1 ring-blue-100">
              <Boxes className="size-6" />
            </div>
            <h2 className="mt-5 text-xl font-semibold tracking-tight">
              Belum ada frame template
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Buat template frame pertama Anda untuk ditampilkan di kiosk. Template menentukan tampilan dan bingkai foto yang tersedia untuk tamu.
            </p>
            {!isReadOnly("templates") && (
              <Button className="mt-6 rounded-full" onClick={openAdd}>
                <Plus className="size-4" /> Tambah template
              </Button>
            )}
          </div>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragCancel={() => {
            const activeDrag = activeTemplateDragRef.current;
            activeTemplateDragRef.current = null;
            if (activeDrag) setTemplateOrder(activeDrag.initialTemplates);
          }}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-8">
            {templateGroups.map((group) => (
              <TemplateGroupSection
                key={group.id}
                group={group}
                viewMode={viewMode}
                onDelete={handleDelete}
                onEdit={openEdit}
                onTest={setTestTemplate}
              />
            ))}
          </div>
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

function TemplateGroupSection({
  group,
  viewMode,
  onDelete,
  onEdit,
  onTest,
}: {
  group: TemplateGroup;
  viewMode: "grid" | "list";
  onDelete: (template: Template) => void;
  onEdit: (template: Template) => void;
  onTest: (template: Template) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${GROUP_DROP_PREFIX}${group.id}`,
    data: { frameCategoryId: group.frameCategoryId },
  });

  return (
    <section ref={setNodeRef} className="scroll-mt-6">
      {group.label ? (
        <div className="mb-3 flex min-w-0 items-center gap-3">
          <h2 className="min-w-0 truncate text-sm font-semibold text-zinc-900">
            {group.label}
          </h2>
          <span className="shrink-0 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-500">
            {group.templates.length} frame
            {group.templates.length === 1 ? "" : "s"}
          </span>
          <div className="h-px min-w-4 flex-1 bg-zinc-200" />
        </div>
      ) : null}
      <SortableContext
        items={group.templates.map((template) => template.id)}
        strategy={rectSortingStrategy}
      >
        <div
          className={cn(
            "w-full rounded-2xl transition-colors",
            isOver && "ring-2 ring-[#00357B]/25 ring-offset-2",
            group.templates.length === 0
              ? "flex min-h-28 items-center justify-center border border-dashed border-zinc-200 bg-white/60"
              : viewMode === "grid"
                ? "grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5"
                : "flex flex-col gap-4",
          )}
        >
          {group.templates.length === 0 ? (
            <p className="text-sm text-zinc-400">
              Tarik frame ke sini untuk memasukkannya ke{" "}
              {group.label?.toLowerCase()}.
            </p>
          ) : (
            group.templates.map((template) => (
              <SortableTemplateCard
                key={template.id}
                template={template}
                viewMode={viewMode}
                onDelete={onDelete}
                onEdit={onEdit}
                onTest={onTest}
              />
            ))
          )}
        </div>
      </SortableContext>
    </section>
  );
}

function FrameCategoriesDialog({
  open,
  categories,
  creating,
  updatingId,
  deletingId,
  reordering,
  onOpenChange,
  onCreate,
  onUpdate,
  onDelete,
  onReorder,
}: {
  open: boolean;
  categories: FrameCategory[];
  creating: boolean;
  updatingId: string | null;
  deletingId: string | null;
  reordering: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string) => void;
  onUpdate: (id: string, name: string) => void;
  onDelete: (category: FrameCategory) => void;
  onReorder: (categoryIds: string[]) => Promise<void>;
}) {
  const [newName, setNewName] = useState("");
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});
  const [orderedCategories, setOrderedCategories] = useState(categories);
  const categorySensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
  );

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setOrderedCategories(categories);
    });
    return () => {
      cancelled = true;
    };
  }, [categories]);

  const resolvedNames = useMemo(
    () =>
      new Map(
        orderedCategories.map((category) => [
          category.id,
          draftNames[category.id] ?? category.name,
        ]),
      ),
    [orderedCategories, draftNames],
  );

  const handleCategoryDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id || reordering) return;
    const oldIndex = orderedCategories.findIndex(
      (category) => category.id === active.id,
    );
    const newIndex = orderedCategories.findIndex(
      (category) => category.id === over.id,
    );
    if (oldIndex < 0 || newIndex < 0) return;

    const nextCategories = arrayMove(orderedCategories, oldIndex, newIndex);
    setOrderedCategories(nextCategories);
    void onReorder(nextCategories.map((category) => category.id)).catch(() => {
      setOrderedCategories(categories);
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Frame categories"
      className="max-w-2xl border-zinc-200/80 shadow-[0_24px_80px_rgba(24,24,27,0.18)]"
      overlayClassName="bg-zinc-950/40 p-3 backdrop-blur-md sm:p-6"
      headerAction={
        <span className="hidden items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] text-zinc-500 sm:inline-flex">
          <span className="font-semibold tabular-nums text-zinc-900">
            {orderedCategories.length}
          </span>
          {orderedCategories.length === 1 ? "collection" : "collections"}
        </span>
      }
    >
      <div className="space-y-6">
        <section className="overflow-hidden rounded-2xl border border-[#00357B]/10 bg-[#00357B]/[0.035]">
          <div className="flex gap-3 p-4 sm:p-5">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#00357B] text-white shadow-sm shadow-[#00357B]/20">
              <FolderPlus className="size-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-zinc-950">
                Organize frame collections
              </h3>
              <p className="mt-1 max-w-2xl text-[13px] leading-5 text-zinc-500">
                Assign a collection while editing a frame. Collections appear
                as kiosk tabs when they contain at least one frame. Drag rows
                to set the tab order.
              </p>
            </div>
          </div>
          <form
            className="border-t border-[#00357B]/10 p-3 sm:p-4"
            onSubmit={(event) => {
              event.preventDefault();
              const name = newName.trim();
              if (!name || creating) return;
              onCreate(name);
              setNewName("");
            }}
          >
            <label
              htmlFor="new-frame-category"
              className="mb-2 block text-xs font-medium text-zinc-600"
            >
              Create a new collection
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="new-frame-category"
                value={newName}
                maxLength={64}
                aria-label="New frame category name"
                placeholder="e.g. Wedding, Graduation, Seasonal"
                onChange={(event) => setNewName(event.target.value)}
                className="h-10 rounded-xl border-zinc-200 bg-white shadow-none focus:border-[#00357B]/40 focus:ring-[#00357B]/10"
              />
              <Button
                type="submit"
                disabled={!newName.trim() || creating}
                className="h-10 rounded-xl bg-[#00357B] px-4 shadow-sm shadow-[#00357B]/15 hover:bg-[#002b63] sm:w-auto"
              >
                {creating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                {creating ? "Adding..." : "Add collection"}
              </Button>
            </div>
          </form>
        </section>

        <section aria-labelledby="frame-collections-heading">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h3
                id="frame-collections-heading"
                className="text-sm font-semibold text-zinc-950"
              >
                Your collections
              </h3>
              <p className="mt-0.5 text-xs text-zinc-500">
                Changes save per collection. The order controls the kiosk tabs.
              </p>
            </div>
            <span className="shrink-0 text-xs tabular-nums text-zinc-400 sm:hidden">
              {orderedCategories.length}
            </span>
          </div>

          <div className="space-y-2.5">
            {orderedCategories.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/70 px-6 py-10 text-center">
                <div className="mx-auto grid size-11 place-items-center rounded-2xl bg-white text-[#00357B] shadow-sm ring-1 ring-zinc-200">
                  <FolderPlus className="size-5" />
                </div>
                <p className="mt-3 text-sm font-semibold text-zinc-900">
                  No collections yet
                </p>
                <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-zinc-500">
                  Frames will stay in one grid until you create a collection
                  and assign frames to it.
                </p>
              </div>
            ) : (
              <DndContext
                sensors={categorySensors}
                onDragEnd={handleCategoryDragEnd}
              >
                <SortableContext
                  items={orderedCategories.map((category) => category.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2.5">
                    {orderedCategories.map((category, index) => (
                      <SortableFrameCategoryRow
                        key={category.id}
                        category={category}
                        index={index}
                        draftName={
                          resolvedNames.get(category.id) ?? category.name
                        }
                        saving={updatingId === category.id}
                        deleting={deletingId === category.id}
                        disabled={reordering}
                        onDraftNameChange={(name) =>
                          setDraftNames((current) => ({
                            ...current,
                            [category.id]: name,
                          }))
                        }
                        onUpdate={onUpdate}
                        onDelete={onDelete}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </section>
      </div>
    </Dialog>
  );
}

function SortableFrameCategoryRow({
  category,
  index,
  draftName,
  saving,
  deleting,
  disabled,
  onDraftNameChange,
  onUpdate,
  onDelete,
}: {
  category: FrameCategory;
  index: number;
  draftName: string;
  saving: boolean;
  deleting: boolean;
  disabled: boolean;
  onDraftNameChange: (name: string) => void;
  onUpdate: (id: string, name: string) => void;
  onDelete: (category: FrameCategory) => void;
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: category.id, disabled });
  const changed = draftName.trim() !== category.name;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
      }}
      className={cn(
        "transition-[opacity,transform]",
        isDragging && "opacity-60",
      )}
    >
      <div className="group flex items-center gap-2 rounded-2xl border border-zinc-200/80 bg-white p-2 shadow-[0_2px_8px_rgba(24,24,27,0.04)] transition-[border-color,box-shadow] hover:border-zinc-300 hover:shadow-[0_6px_18px_rgba(24,24,27,0.07)] sm:gap-2.5 sm:p-2.5">
        <button
          type="button"
          className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50"
          title="Geser untuk mengubah urutan kategori"
          aria-label={`Ubah urutan kategori ${category.name}`}
          disabled={disabled}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <div className="hidden size-8 shrink-0 place-items-center rounded-xl bg-[#00357B]/[0.08] text-[#00357B] sm:grid">
          <FolderPlus className="size-4" />
        </div>
        <span className="w-5 shrink-0 text-center text-[11px] font-semibold tabular-nums text-zinc-400">
          {String(index + 1).padStart(2, "0")}
        </span>
        <Input
          value={draftName}
          maxLength={64}
          aria-label={`Category name for ${category.name}`}
          disabled={disabled}
          onChange={(event) => onDraftNameChange(event.target.value)}
          className="h-10 min-w-0 flex-1 rounded-xl border-zinc-200 bg-zinc-50/70 shadow-none focus:border-[#00357B]/30 focus:bg-white focus:ring-[#00357B]/10"
        />
        <Button
          type="button"
          variant={changed ? "secondary" : "ghost"}
          size="icon"
          disabled={disabled || !changed || !draftName.trim() || saving}
          aria-label={`Save ${category.name}`}
          title={changed ? "Save collection name" : "No changes to save"}
          onClick={() => onUpdate(category.id, draftName.trim())}
          className={cn(
            "size-9 rounded-xl",
            changed
              ? "bg-[#00357B]/[0.08] text-[#00357B] hover:bg-[#00357B]/[0.14]"
              : "text-zinc-400",
          )}
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : changed ? (
            <Check className="size-4" />
          ) : (
            <Pencil className="size-4" />
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled || deleting}
          aria-label={`Delete ${category.name}`}
          title={`Delete ${category.name}`}
          className="size-9 rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={() => onDelete(category)}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
