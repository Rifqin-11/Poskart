"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CloudUpload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FrameTemplateBuilder } from "@/features/admin/templates/frame-template-builder";
import {
  useCreateTemplate,
  useTemplates,
  useUpdateTemplate,
} from "@/features/admin/templates/use-templates";
import { uploadBuilderImage } from "@/lib/services/storage-service";
import { cn } from "@/lib/utils";
import { useBuilderStore } from "@/stores/builder-store";
import type { FrameLayout } from "@/types/frame-template";
import type { TemplateFormValues } from "@/types/template";

const ACCENT_PRESETS = ["#C4121A", "#2D3F8F", "#F5F1E8", "#1B1B1B", "#F6C9C9", "#B8C7E5"];

const DEFAULT_FORM: TemplateFormValues = {
  name: "",
  category: "frame",
  status: "published",
  tagline: "",
  photoCount: 0,
  accentColor: "#C4121A",
  frameImageUrl: "",
  isDefault: false,
  frameLayout: null,
};

function countPhotoSlots(layout: FrameLayout) {
  return layout.nodes.filter((node) => node.type === "photo-slot").length;
}

export function TemplateBuilderWorkspace({ templateId }: { templateId: string }) {
  const router = useRouter();
  const isNew = templateId === "new";
  const { data: templates = [], isLoading } = useTemplates();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const template = isNew ? null : templates.find((item) => item.id === templateId);
  const [form, setForm] = useState<TemplateFormValues>(DEFAULT_FORM);
  const [hydratedTemplateId, setHydratedTemplateId] = useState(isNew ? "new" : "");
  const [uploading, setUploading] = useState(false);
  const builderFullView = useBuilderStore((s) => s.builderFullView);
  const setBuilderFullView = useBuilderStore((s) => s.setBuilderFullView);

  useEffect(() => {
    if (isNew) return;
    if (!template) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setForm({
        name: template.name,
        category: template.category,
        status: template.status,
        tagline: template.tagline ?? "",
        photoCount: template.photoCount,
        accentColor: template.accentColor,
        frameImageUrl: template.frameImageUrl ?? "",
        isDefault: template.isDefault,
        frameLayout: template.frameLayout ?? null,
      });
      setHydratedTemplateId(template.id);
    });
    return () => {
      cancelled = true;
    };
  }, [isNew, template]);

  if (!isNew && isLoading) {
    return <Skeleton className="h-[760px]" />;
  }

  if (!isNew && !template) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-sm font-medium text-zinc-500">Template not found</div>
          <Button className="mt-4" variant="outline" onClick={() => router.push("/templates")}>
            Back to templates
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!isNew && hydratedTemplateId !== templateId) {
    return <Skeleton className="h-[760px]" />;
  }

  const patch = <K extends keyof TemplateFormValues>(key: K, value: TemplateFormValues[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleUpload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const image = await uploadBuilderImage(file);
      patch("frameImageUrl", image.url);
      toast.success("Frame image uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (layout: FrameLayout) => {
    const payload = {
      ...form,
      status: "published", // Always publish when saving from builder
      photoCount: countPhotoSlots(layout),
      frameLayout: layout,
    };

    if (!payload.name.trim()) {
      toast.error("Template name is required");
      return;
    }

    try {
      if (isNew) {
        await createTemplate.mutateAsync(payload);
        toast.success("Template created");
      } else {
        await updateTemplate.mutateAsync({ id: templateId, patch: payload });
        toast.success("Template updated");
      }
      setBuilderFullView(false);
      router.push("/templates");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    }
  };

  const saving = createTemplate.isPending || updateTemplate.isPending;
  const detailsPanel = (
    <section className="space-y-3 rounded-lg border border-zinc-200 p-3">
      <div>
        <div className="text-sm font-semibold">Template details</div>
        <div className="text-xs text-zinc-500">{isNew ? "Create frame template" : `Edit ${template?.name}`}</div>
      </div>
      <Button
        variant="ghost"
        className="-ml-2 h-8"
        onClick={() => {
          setBuilderFullView(false);
          router.push("/templates");
        }}
      >
        <ArrowLeft className="size-4" />
        Back
      </Button>
      <label className="block text-xs font-medium text-zinc-600">
        Template name
        <Input
          className="mt-1"
          value={form.name}
          placeholder="Classic Postcard"
          onChange={(event) => patch("name", event.target.value)}
        />
      </label>
      <label className="block text-xs font-medium text-zinc-600">
        Tagline
        <Input
          className="mt-1"
          value={form.tagline}
          placeholder="Timeless and elegant"
          onChange={(event) => patch("tagline", event.target.value)}
        />
      </label>
      <div className="space-y-2">
        <div className="text-xs font-medium text-zinc-600">Accent color</div>
        <div className="flex flex-wrap gap-2">
          {ACCENT_PRESETS.map((color) => (
            <button
              key={color}
              type="button"
              className={cn(
                "size-7 rounded-full border-2",
                form.accentColor === color ? "scale-110 border-zinc-950" : "border-zinc-200",
              )}
              style={{ background: color }}
              onClick={() => patch("accentColor", color)}
            />
          ))}
        </div>
        <div className="grid grid-cols-[42px_1fr] gap-2">
          <Input className="h-9 p-1" type="color" value={form.accentColor} onChange={(event) => patch("accentColor", event.target.value)} />
          <Input value={form.accentColor} onChange={(event) => patch("accentColor", event.target.value)} />
        </div>
      </div>

      <label className="block text-xs font-medium text-zinc-600">
        Frame image URL
        <Input
          className="mt-1"
          value={form.frameImageUrl}
          placeholder="https://..."
          onChange={(event) => patch("frameImageUrl", event.target.value)}
        />
      </label>
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-200 p-3 text-sm font-medium text-zinc-600 hover:border-zinc-400">
        <CloudUpload className="size-4 text-zinc-400" />
        {uploading ? "Uploading..." : "Upload frame image"}
        <input
          className="sr-only"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          disabled={uploading}
          onChange={(event) => handleUpload(event.target.files?.[0])}
        />
      </label>
    </section>
  );

  return (
    <div
      className={cn(
        "overflow-hidden",
        builderFullView
          ? "fixed inset-0 z-[100]"
          : "-mx-4 -my-6 lg:-mx-8",
      )}
      style={{ height: builderFullView ? "100vh" : "calc(100vh - 4rem)" }}
    >
      <FrameTemplateBuilder
        presentation="embedded"
        resetKey={templateId}
        initialLayout={form.frameLayout ?? null}
        templateName={form.name}
        frameImageUrl={form.frameImageUrl}
        onClose={() => {
          setBuilderFullView(false);
          router.push("/templates");
        }}
        onSave={handleSave}
        saveLabel={saving ? "Saving..." : isNew ? "Create template" : "Save template"}
        detailsPanel={detailsPanel}
      />
    </div>
  );
}
