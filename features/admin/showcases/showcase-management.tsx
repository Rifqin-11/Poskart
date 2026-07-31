"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Frame,
  ImagePlus,
  Images,
  Loader2,
  Palette,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/features/admin/_components/page-header";
import { usePermission } from "@/features/admin/hooks/use-permission";
import { useLayoutSchemas } from "@/features/admin/layout/use-layout";
import {
  useCreateShowcase,
  useDeleteShowcase,
  useShowcases,
  useUpdateShowcase,
} from "@/features/admin/showcases/use-showcases";
import { useTemplates } from "@/features/admin/templates/use-templates";
import { ThemeThumbnail } from "@/features/admin/themes/theme-thumbnail";
import { FrameShowcasePreview } from "@/features/public/showcase/frame-showcase-preview";
import {
  BUILDER_IMAGE_ACCEPT,
  uploadShowcaseImage,
} from "@/lib/services/storage-service";
import { cn } from "@/lib/utils";
import type { LayoutSchemaRow } from "@/features/admin/layout/api";
import type {
  Showcase,
  ShowcaseCustomItemInput,
  ShowcaseInput,
} from "@/types/showcase";
import type { Template } from "@/types/template";

const EMPTY_SHOWCASES: Showcase[] = [];
const EMPTY_TEMPLATES: Template[] = [];
const EMPTY_LAYOUTS: LayoutSchemaRow[] = [];

function publicShowcasePath(showcase: Showcase) {
  return `/showcase/${showcase.publicToken}`;
}

function ShowcaseVisual({
  template,
  theme,
  customItem,
}: {
  template?: Template;
  theme?: LayoutSchemaRow;
  customItem?: Showcase["customItems"][number];
}) {
  if (template) {
    return (
      <div className="grid h-56 place-items-center bg-[#eef3ff] p-7">
        <FrameShowcasePreview
          name={template.name}
          accentColor={template.accentColor}
          frameImageUrl={template.frameImageUrl ?? null}
          frameLayout={template.frameLayout ?? null}
        />
      </div>
    );
  }

  if (theme) {
    return (
      <div className="grid h-56 place-items-center bg-zinc-100 p-7">
        <ThemeThumbnail
          schema={theme.schema}
          className="max-h-full max-w-full shadow-lg shadow-zinc-950/10"
        />
      </div>
    );
  }

  if (customItem) {
    return (
      <div className="h-56 overflow-hidden bg-zinc-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={customItem.imageUrl}
          alt={customItem.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        />
      </div>
    );
  }

  return (
    <div className="grid h-56 place-items-center bg-zinc-50 text-zinc-300">
      <Images className="size-10" />
    </div>
  );
}

export function ShowcaseManagement() {
  const showcasesQuery = useShowcases();
  const templatesQuery = useTemplates();
  const layoutsQuery = useLayoutSchemas();
  const createShowcase = useCreateShowcase();
  const updateShowcase = useUpdateShowcase();
  const deleteShowcase = useDeleteShowcase();
  const confirmDelete = useConfirmDialog();
  const { isReadOnly } = usePermission();
  const readOnly = isReadOnly("showcase");
  const showcases = showcasesQuery.data ?? EMPTY_SHOWCASES;
  const templates = templatesQuery.data ?? EMPTY_TEMPLATES;
  const layouts = layoutsQuery.data ?? EMPTY_LAYOUTS;
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingShowcase, setEditingShowcase] = useState<Showcase | null>(null);

  const publishedFrames = useMemo(
    () =>
      templates.filter(
        (template) =>
          template.category === "frame" && template.status === "published",
      ),
    [templates],
  );

  const openCreate = () => {
    setEditingShowcase(null);
    setEditorOpen(true);
  };

  const openEdit = (showcase: Showcase) => {
    setEditingShowcase(showcase);
    setEditorOpen(true);
  };

  const copyLink = async (showcase: Showcase) => {
    try {
      const url = new URL(publicShowcasePath(showcase), window.location.origin);
      await navigator.clipboard.writeText(url.toString());
      toast.success("Public showcase link copied");
    } catch {
      toast.error("Unable to copy showcase link");
    }
  };

  const handleSave = async (input: ShowcaseInput) => {
    if (editingShowcase) {
      await updateShowcase.mutateAsync({ id: editingShowcase.id, input });
      toast.success("Showcase updated");
    } else {
      await createShowcase.mutateAsync(input);
      toast.success("Showcase created");
    }
    setEditorOpen(false);
  };

  const handleDelete = (showcase: Showcase) => {
    confirmDelete.confirm({
      title: "Delete showcase?",
      description: `Delete "${showcase.name}" and disable its public link? This cannot be undone.`,
      confirmLabel: "Delete showcase",
      destructive: true,
      onConfirm: async () => {
        try {
          await deleteShowcase.mutateAsync(showcase.id);
          toast.success("Showcase deleted");
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : "Unable to delete showcase",
          );
        }
      },
    });
  };

  const loadError =
    showcasesQuery.error ?? templatesQuery.error ?? layoutsQuery.error;

  return (
    <div>
      {confirmDelete.dialog}
      <PageHeader
        title="Showcase Management"
        description="Create public presentation links with frames, kiosk themes, and uploaded custom categories."
        action={
          !readOnly ? (
            <Button className="rounded-full" onClick={openCreate}>
              <Plus className="size-4" /> Create showcase
            </Button>
          ) : undefined
        }
      />

      {loadError ? (
        <Card className="border-red-100 bg-red-50/60">
          <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-red-900">Showcases could not be loaded</p>
              <p className="mt-1 text-sm text-red-700">{loadError.message}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                void showcasesQuery.refetch();
                void templatesQuery.refetch();
                void layoutsQuery.refetch();
              }}
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : showcasesQuery.isLoading || templatesQuery.isLoading || layoutsQuery.isLoading ? (
        <div className="grid min-h-72 place-items-center rounded-[1.75rem] border border-zinc-100 bg-white">
          <Loader2 className="size-6 animate-spin text-zinc-400" />
        </div>
      ) : showcases.length === 0 ? (
        <div className="relative overflow-hidden rounded-[2rem] border border-blue-100 bg-[#f7f9ff] px-6 py-16 text-center sm:px-10">
          <div className="absolute -right-20 -top-24 size-64 rounded-full bg-blue-100/70 blur-3xl" />
          <div className="relative mx-auto max-w-lg">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-white text-[#00357B] shadow-sm ring-1 ring-blue-100">
              <Frame className="size-6" />
            </div>
            <h2 className="mt-5 text-xl font-semibold tracking-tight">
              Create a presentation for your next partner
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Combine published frames, kiosk themes, and uploaded custom
              references into one public link that partners can open without
              signing in.
            </p>
            {!readOnly ? (
              <Button className="mt-6 rounded-full" onClick={openCreate}>
                <Plus className="size-4" /> Create first showcase
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {showcases.map((showcase) => {
            const firstTemplate = showcase.templateIds
              .map((id) => templates.find((template) => template.id === id))
              .find(Boolean);
            const firstTheme = showcase.themeIds
              .map((id) => layouts.find((layout) => layout.id === id))
              .find(Boolean);
            const firstCustomItem = showcase.customItems[0];

            return (
              <Card
                key={showcase.id}
                className="group overflow-hidden border-zinc-100 transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-zinc-950/5"
              >
                <ShowcaseVisual
                  template={firstTemplate}
                  theme={firstTheme}
                  customItem={firstCustomItem}
                />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold tracking-tight">
                        {showcase.name}
                      </h2>
                      <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-zinc-500">
                        {showcase.description ||
                          "Public visual presentation for partners."}
                      </p>
                    </div>
                    <a
                      href={publicShowcasePath(showcase)}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Open ${showcase.name}`}
                      className="grid size-9 shrink-0 place-items-center rounded-full border border-zinc-200 text-zinc-500 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-[#00357B]"
                    >
                      <ExternalLink className="size-4" />
                    </a>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Badge variant="secondary" className="gap-1.5">
                      <Frame className="size-3" /> {showcase.templateIds.length} frames
                    </Badge>
                    <Badge variant="secondary" className="gap-1.5">
                      <Palette className="size-3" /> {showcase.themeIds.length} themes
                    </Badge>
                    <Badge variant="secondary" className="gap-1.5">
                      <Images className="size-3" /> {showcase.customItems.length} custom
                    </Badge>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-2 border-t border-zinc-100 pt-4">
                    <Button variant="outline" onClick={() => void copyLink(showcase)}>
                      <Copy className="size-4" /> Copy link
                    </Button>
                    {readOnly ? (
                      <a
                        href={publicShowcasePath(showcase)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
                      >
                        <ExternalLink className="size-4" /> View
                      </a>
                    ) : (
                      <Button onClick={() => openEdit(showcase)}>
                        <Pencil className="size-4" /> Edit
                      </Button>
                    )}
                  </div>
                  {!readOnly ? (
                    <button
                      type="button"
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-medium text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      onClick={() => handleDelete(showcase)}
                    >
                      <Trash2 className="size-3.5" /> Delete showcase
                    </button>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {editorOpen ? (
        <ShowcaseEditorDialog
          key={editingShowcase?.id ?? "new-showcase"}
          showcase={editingShowcase}
          templates={publishedFrames}
          layouts={layouts}
          saving={createShowcase.isPending || updateShowcase.isPending}
          onOpenChange={setEditorOpen}
          onSave={handleSave}
        />
      ) : null}
    </div>
  );
}

function ShowcaseEditorDialog({
  showcase,
  templates,
  layouts,
  saving,
  onOpenChange,
  onSave,
}: {
  showcase: Showcase | null;
  templates: Template[];
  layouts: LayoutSchemaRow[];
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: ShowcaseInput) => Promise<void>;
}) {
  const [name, setName] = useState(showcase?.name ?? "");
  const [description, setDescription] = useState(showcase?.description ?? "");
  const [templateIds, setTemplateIds] = useState<string[]>(
    showcase?.templateIds ?? [],
  );
  const [themeIds, setThemeIds] = useState<string[]>(showcase?.themeIds ?? []);
  const [customItems, setCustomItems] = useState<EditableCustomItem[]>(
    showcase?.customItems.map((item) => ({
      key: item.id,
      category: item.category,
      title: item.title,
      description: item.description,
      imageUrl: item.imageUrl,
      storagePath: item.storagePath,
    })) ?? [],
  );
  const [uploadingItemKeys, setUploadingItemKeys] = useState<string[]>([]);
  const [frameSearch, setFrameSearch] = useState("");
  const [themeSearch, setThemeSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const visibleTemplates = templates.filter((template) =>
    `${template.name} ${template.tagline ?? ""}`
      .toLocaleLowerCase()
      .includes(frameSearch.trim().toLocaleLowerCase()),
  );
  const visibleLayouts = layouts.filter((layout) =>
    layout.name.toLocaleLowerCase().includes(themeSearch.trim().toLocaleLowerCase()),
  );

  const toggleId = (
    id: string,
    values: string[],
    setValues: (values: string[]) => void,
  ) => {
    setValues(
      values.includes(id)
        ? values.filter((value) => value !== id)
        : [...values, id],
    );
  };

  const addCustomItem = () => {
    setCustomItems((current) => [
      ...current,
      {
        key: crypto.randomUUID(),
        category: "",
        title: "",
        description: "",
        imageUrl: "",
        storagePath: "",
      },
    ]);
  };

  const updateCustomItem = (
    key: string,
    patch: Partial<ShowcaseCustomItemInput>,
  ) => {
    setCustomItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  };

  const uploadCustomItemImage = async (key: string, file: File) => {
    setError(null);
    setUploadingItemKeys((current) => [...current, key]);
    try {
      const uploaded = await uploadShowcaseImage(file);
      updateCustomItem(key, {
        imageUrl: uploaded.url,
        storagePath: uploaded.path,
      });
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload showcase image.",
      );
    } finally {
      setUploadingItemKeys((current) =>
        current.filter((itemKey) => itemKey !== key),
      );
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedName = name.trim();
    if (!normalizedName) {
      setError("Showcase name is required.");
      return;
    }
    if (uploadingItemKeys.length) {
      setError("Wait for all showcase images to finish uploading.");
      return;
    }
    const invalidCustomItem = customItems.find(
      (item) =>
        !item.category.trim() ||
        !item.title.trim() ||
        !item.imageUrl ||
        !item.storagePath,
    );
    if (invalidCustomItem) {
      setError(
        "Every custom item needs a category, title, and uploaded image.",
      );
      return;
    }
    setError(null);
    try {
      await onSave({
        name: normalizedName,
        description: description.trim(),
        templateIds,
        themeIds,
        customItems: customItems.map((item) => ({
          category: item.category,
          title: item.title,
          description: item.description,
          imageUrl: item.imageUrl,
          storagePath: item.storagePath,
        })),
      });
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save showcase.",
      );
    }
  };

  return (
    <Dialog
      open
      onOpenChange={onOpenChange}
      title={showcase ? "Edit showcase" : "Create showcase"}
      className="max-w-6xl rounded-[1.75rem]"
    >
      <form onSubmit={submit} className="space-y-7">
        <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <label className="space-y-2 text-sm font-medium text-zinc-700">
            Showcase name
            <Input
              value={name}
              maxLength={100}
              placeholder="Cafe partnership collection"
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-zinc-700">
            Description
            <Textarea
              value={description}
              maxLength={600}
              className="min-h-24 resize-y"
              placeholder="Explain what this partner can review from the public link."
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
        </div>

        <SelectionSection
          icon={Frame}
          title="Frame templates"
          description="Only published frame templates can be included in a public showcase."
          selectedCount={templateIds.length}
          search={frameSearch}
          searchPlaceholder="Search frame templates"
          onSearchChange={setFrameSearch}
        >
          {visibleTemplates.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleTemplates.map((template) => {
                const selected = templateIds.includes(template.id);
                return (
                  <button
                    type="button"
                    key={template.id}
                    aria-pressed={selected}
                    className={cn(
                      "relative overflow-hidden rounded-2xl border bg-white text-left transition-[border-color,box-shadow,transform] hover:-translate-y-0.5",
                      selected
                        ? "border-[#00357B] ring-2 ring-[#00357B]/10"
                        : "border-zinc-200 hover:border-zinc-300 hover:shadow-md",
                    )}
                    onClick={() => toggleId(template.id, templateIds, setTemplateIds)}
                  >
                    <div className="grid h-44 place-items-center bg-[#f4f7ff] p-5">
                      <FrameShowcasePreview
                        name={template.name}
                        accentColor={template.accentColor}
                        frameImageUrl={template.frameImageUrl ?? null}
                        frameLayout={template.frameLayout ?? null}
                      />
                    </div>
                    <div className="p-3">
                      <p className="truncate text-sm font-semibold">{template.name}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {template.photoCount} photo slots
                      </p>
                    </div>
                    <SelectionMark selected={selected} />
                  </button>
                );
              })}
            </div>
          ) : (
            <SelectionEmpty message="No published frame templates match this search." />
          )}
        </SelectionSection>

        <section className="rounded-[1.5rem] border border-blue-100 bg-[#f4f7ff] p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-[#00357B] shadow-sm ring-1 ring-blue-100">
                <ImagePlus className="size-4" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">Custom categories</h3>
                  <Badge className="border-blue-100 bg-white text-[#00357B]">
                    {customItems.length} items
                  </Badge>
                </div>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-zinc-500">
                  Add booth setups, print samples, branding references, or any
                  other category. Items with the same category are grouped on
                  the public page.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="shrink-0 border-blue-200 bg-white"
              disabled={customItems.length >= 40}
              onClick={addCustomItem}
            >
              <Plus className="size-4" /> Add custom item
            </Button>
          </div>

          {customItems.length ? (
            <div className="mt-5 space-y-4">
              {customItems.map((item, index) => {
                const uploading = uploadingItemKeys.includes(item.key);
                return (
                  <article
                    key={item.key}
                    className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm"
                  >
                    <div className="grid lg:grid-cols-[0.7fr_1.3fr]">
                      <div className="relative grid min-h-56 place-items-center overflow-hidden border-b border-blue-100 bg-zinc-50 lg:border-b-0 lg:border-r">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.imageUrl}
                            alt={item.title || `Custom showcase item ${index + 1}`}
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        ) : (
                          <div className="px-6 text-center">
                            <Images className="mx-auto size-9 text-blue-200" />
                            <p className="mt-3 text-sm font-medium text-zinc-600">
                              Upload a preview image
                            </p>
                            <p className="mt-1 text-xs text-zinc-400">
                              JPG, PNG, WebP, GIF, or SVG up to 8 MB
                            </p>
                          </div>
                        )}
                        <label
                          className={cn(
                            "absolute bottom-3 left-3 inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white/95 px-3 text-xs font-semibold text-zinc-700 shadow-sm backdrop-blur transition-colors hover:border-blue-200 hover:text-[#00357B]",
                            uploading && "cursor-wait opacity-70",
                          )}
                        >
                          {uploading ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Upload className="size-3.5" />
                          )}
                          {uploading
                            ? "Uploading..."
                            : item.imageUrl
                              ? "Replace image"
                              : "Upload image"}
                          <input
                            type="file"
                            accept={BUILDER_IMAGE_ACCEPT}
                            className="sr-only"
                            disabled={uploading}
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              event.target.value = "";
                              if (file) void uploadCustomItemImage(item.key, file);
                            }}
                          />
                        </label>
                      </div>

                      <div className="p-4 sm:p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#00357B]">
                            <Tag className="size-3.5" /> Custom item {index + 1}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="-mr-2 -mt-2 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                            disabled={uploading}
                            onClick={() =>
                              setCustomItems((current) =>
                                current.filter(
                                  (customItem) => customItem.key !== item.key,
                                ),
                              )
                            }
                          >
                            <Trash2 className="size-3.5" /> Remove
                          </Button>
                        </div>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <label className="text-xs font-medium text-zinc-600">
                            Category name
                            <Input
                              value={item.category}
                              maxLength={60}
                              className="mt-1.5"
                              placeholder="Booth setup"
                              onChange={(event) =>
                                updateCustomItem(item.key, {
                                  category: event.target.value,
                                })
                              }
                            />
                          </label>
                          <label className="text-xs font-medium text-zinc-600">
                            Item title
                            <Input
                              value={item.title}
                              maxLength={120}
                              className="mt-1.5"
                              placeholder="Compact cafe corner setup"
                              onChange={(event) =>
                                updateCustomItem(item.key, {
                                  title: event.target.value,
                                })
                              }
                            />
                          </label>
                          <label className="text-xs font-medium text-zinc-600 sm:col-span-2">
                            Description
                            <Textarea
                              value={item.description}
                              maxLength={400}
                              className="mt-1.5 min-h-24 resize-y"
                              placeholder="Explain what the partner should notice from this reference."
                              onChange={(event) =>
                                updateCustomItem(item.key, {
                                  description: event.target.value,
                                })
                              }
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 grid min-h-36 place-items-center rounded-2xl border border-dashed border-blue-200 bg-white/70 px-5 text-center">
              <div>
                <Images className="mx-auto size-8 text-blue-200" />
                <p className="mt-3 text-sm font-medium text-zinc-700">
                  No custom categories yet
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Add one when the partner needs references beyond frames and themes.
                </p>
              </div>
            </div>
          )}
        </section>

        <SelectionSection
          icon={Palette}
          title="Themes"
          description="Select kiosk layouts that help the partner understand the full booth experience."
          selectedCount={themeIds.length}
          search={themeSearch}
          searchPlaceholder="Search themes"
          onSearchChange={setThemeSearch}
        >
          {visibleLayouts.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visibleLayouts.map((layout) => {
                const selected = themeIds.includes(layout.id);
                return (
                  <button
                    type="button"
                    key={layout.id}
                    aria-pressed={selected}
                    className={cn(
                      "relative overflow-hidden rounded-2xl border bg-white text-left transition-[border-color,box-shadow,transform] hover:-translate-y-0.5",
                      selected
                        ? "border-[#00357B] ring-2 ring-[#00357B]/10"
                        : "border-zinc-200 hover:border-zinc-300 hover:shadow-md",
                    )}
                    onClick={() => toggleId(layout.id, themeIds, setThemeIds)}
                  >
                    <div className="grid min-h-40 place-items-center bg-zinc-100 p-4">
                      <ThemeThumbnail schema={layout.schema} className="shadow-sm" />
                    </div>
                    <div className="flex items-center justify-between gap-3 p-3">
                      <p className="truncate text-sm font-semibold">{layout.name}</p>
                      <Badge variant={layout.is_active ? "success" : "secondary"}>
                        {layout.is_active ? "Active" : layout.status}
                      </Badge>
                    </div>
                    <SelectionMark selected={selected} />
                  </button>
                );
              })}
            </div>
          ) : (
            <SelectionEmpty message="No themes match this search." />
          )}
        </SelectionSection>

        {error ? (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-zinc-100 bg-white pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving || uploadingItemKeys.length > 0}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {showcase ? "Save changes" : "Create showcase"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

type EditableCustomItem = ShowcaseCustomItemInput & { key: string };

function SelectionSection({
  icon: Icon,
  title,
  description,
  selectedCount,
  search,
  searchPlaceholder,
  onSearchChange,
  children,
}: {
  icon: typeof Frame;
  title: string;
  description: string;
  selectedCount: number;
  search: string;
  searchPlaceholder: string;
  onSearchChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/70 p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-[#00357B] shadow-sm ring-1 ring-zinc-200">
            <Icon className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{title}</h3>
              <Badge className="border-blue-100 bg-blue-50 text-[#00357B]">
                {selectedCount} selected
              </Badge>
            </div>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-zinc-500">
              {description}
            </p>
          </div>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <Input
            value={search}
            className="pl-9"
            placeholder={searchPlaceholder}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SelectionMark({ selected }: { selected: boolean }) {
  return (
    <span
      className={cn(
        "absolute right-3 top-3 grid size-7 place-items-center rounded-full border shadow-sm transition-colors",
        selected
          ? "border-[#00357B] bg-[#00357B] text-white"
          : "border-zinc-200 bg-white/90 text-transparent",
      )}
    >
      <Check className="size-4" />
    </span>
  );
}

function SelectionEmpty({ message }: { message: string }) {
  return (
    <div className="grid min-h-32 place-items-center rounded-2xl border border-dashed border-zinc-200 bg-white px-5 text-center text-sm text-zinc-500">
      {message}
    </div>
  );
}
