"use client";

import { useEffect, useState } from "react";
import { CloudUpload, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { uploadBuilderImage } from "@/lib/services/storage-service";
import { cn } from "@/lib/utils";
import type { Template, TemplateFormValues } from "@/types/template";

const PHOTO_COUNTS = [1, 2, 3, 4, 6, 8] as const;
const CATEGORIES = ["frame", "postcard", "receipt", "seasonal", "event"] as const;

const ACCENT_PRESETS = [
  { label: "Postal Red", value: "#C4121A" },
  { label: "Vintage Navy", value: "#2D3F8F" },
  { label: "Warm Cream", value: "#F5F1E8" },
  { label: "Ink Black", value: "#1B1B1B" },
  { label: "Tape Pink", value: "#F6C9C9" },
  { label: "Tape Blue", value: "#B8C7E5" },
];

const DEFAULT_FORM: TemplateFormValues = {
  name: "",
  category: "frame",
  status: "draft",
  tagline: "",
  photoCount: 4,
  accentColor: "#C4121A",
  frameImageUrl: "",
  isDefault: false,
};

export function TemplateFormSheet({
  open,
  template,
  onClose,
  onSave,
}: {
  open: boolean;
  template?: Template | null;
  onClose: () => void;
  onSave: (values: TemplateFormValues) => Promise<void>;
}) {
  const [form, setForm] = useState<TemplateFormValues>(DEFAULT_FORM);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (template) {
      setForm({
        name: template.name,
        category: template.category,
        status: template.status,
        tagline: template.tagline ?? "",
        photoCount: template.photoCount,
        accentColor: template.accentColor,
        frameImageUrl: template.frameImageUrl ?? "",
        isDefault: template.isDefault,
      });
    } else {
      setForm(DEFAULT_FORM);
    }
  }, [template, open]);

  if (!open) return null;

  const patch = <K extends keyof TemplateFormValues>(key: K, value: TemplateFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

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

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Template name is required");
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Sheet */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={template ? "Edit template" : "Add template"}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-zinc-200 bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 p-5">
          <div>
            <div className="text-base font-semibold">{template ? "Edit template" : "Add template"}</div>
            <div className="text-xs text-zinc-500">Frame template for the Flutter photobooth picker</div>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-zinc-100">
            <X className="size-4" />
          </button>
        </div>

        {/* Form body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* Basic info */}
          <section className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Basic info</div>
            <label className="block text-xs font-medium text-zinc-600">
              Template name *
              <Input
                className="mt-1"
                placeholder="e.g. Classic Postcard"
                value={form.name}
                onChange={(e) => patch("name", e.target.value)}
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Tagline
              <Input
                className="mt-1"
                placeholder="e.g. Timeless & elegant"
                value={form.tagline}
                onChange={(e) => patch("tagline", e.target.value)}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-medium text-zinc-600">
                Category
                <Select
                  className="mt-1"
                  value={form.category}
                  onChange={(e) => patch("category", e.target.value as TemplateFormValues["category"])}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
              </label>
              <label className="block text-xs font-medium text-zinc-600">
                Status
                <Select
                  className="mt-1"
                  value={form.status}
                  onChange={(e) => patch("status", e.target.value as TemplateFormValues["status"])}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </Select>
              </label>
            </div>
          </section>

          {/* Flutter config */}
          <section className="space-y-3 rounded-xl border border-zinc-100 bg-zinc-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Flutter template config</div>
            <label className="block text-xs font-medium text-zinc-600">
              Photos per session
              <Select
                className="mt-1"
                value={String(form.photoCount)}
                onChange={(e) => patch("photoCount", Number(e.target.value))}
              >
                {PHOTO_COUNTS.map((n) => (
                  <option key={n} value={String(n)}>{n} photo{n > 1 ? "s" : ""}</option>
                ))}
              </Select>
            </label>

            <div className="space-y-2">
              <div className="text-xs font-medium text-zinc-600">Accent color</div>
              <div className="flex flex-wrap gap-2">
                {ACCENT_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    title={p.label}
                    onClick={() => patch("accentColor", p.value)}
                    className={cn(
                      "size-7 rounded-full border-2 transition-all",
                      form.accentColor === p.value ? "border-zinc-950 scale-110" : "border-zinc-200",
                    )}
                    style={{ background: p.value }}
                  />
                ))}
              </div>
              <div className="grid grid-cols-[42px_1fr] gap-2">
                <Input
                  className="h-9 p-1"
                  type="color"
                  value={form.accentColor}
                  onChange={(e) => patch("accentColor", e.target.value)}
                />
                <Input
                  value={form.accentColor}
                  placeholder="#C4121A"
                  onChange={(e) => patch("accentColor", e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Frame image */}
          <section className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Frame image (optional)</div>
            {form.frameImageUrl ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.frameImageUrl}
                  alt="Frame preview"
                  className="h-36 w-full rounded-lg border border-zinc-200 object-cover"
                />
                <button
                  type="button"
                  onClick={() => patch("frameImageUrl", "")}
                  className="absolute right-2 top-2 rounded-full bg-white/90 p-1 shadow hover:bg-white"
                >
                  <X className="size-3" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-200 p-6 transition hover:border-zinc-400 hover:bg-zinc-50">
                <CloudUpload className="size-6 text-zinc-400" />
                <span className="text-xs text-zinc-500">
                  {uploading ? "Uploading…" : "Upload frame background image"}
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  disabled={uploading}
                  onChange={(e) => handleUpload(e.target.files?.[0])}
                />
              </label>
            )}
            <label className="block text-xs font-medium text-zinc-600">
              Or paste URL
              <Input
                className="mt-1"
                placeholder="https://..."
                value={form.frameImageUrl}
                onChange={(e) => patch("frameImageUrl", e.target.value)}
              />
            </label>
          </section>

          {/* Default toggle */}
          <label className="flex cursor-pointer items-center justify-between rounded-lg border border-zinc-100 p-4">
            <div>
              <div className="text-sm font-medium">Set as default template</div>
              <div className="text-xs text-zinc-500">Will be pre-selected when Flutter app opens</div>
            </div>
            <Switch
              checked={form.isDefault}
              onCheckedChange={(checked) => patch("isDefault", checked)}
            />
          </label>

          {/* Live preview swatch */}
          <section className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Preview</div>
            <div className="flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm">
              <div
                className="flex size-12 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                style={{ background: form.accentColor }}
              >
                {form.photoCount}×
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{form.name || "Template name"}</div>
                <div className="truncate text-xs text-zinc-500">{form.tagline || "Tagline will appear here"}</div>
                <div className="mt-1 flex gap-1">
                  <Badge variant={form.status === "published" ? "success" : "secondary"}>
                    {form.status}
                  </Badge>
                  {form.isDefault && <Badge variant="warning">Default</Badge>}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-zinc-100 p-5">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving || uploading}>
            {saving ? "Saving…" : template ? "Save changes" : "Create template"}
          </Button>
        </div>
      </aside>
    </>
  );
}
