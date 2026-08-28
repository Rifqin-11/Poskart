"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { showErrorToast, toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { ImageUploadDropzone } from "@/components/ui/image-upload-dropzone";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { FrameTemplateBuilder } from "@/features/admin/templates/frame-template-builder";
import { bakeFrameLayoutColorKeyAssets } from "@/features/builder/utils/bake-color-key-assets";
import {
  useAssignTemplateToDevices,
  useCreateTemplate,
  useFrameCategories,
  useTemplates,
  useUpdateTemplate,
} from "@/features/admin/templates/use-templates";
import { useBooths } from "@/features/admin/devices/use-devices";
import {
  BUILDER_IMAGE_ACCEPT,
  getBuilderImageValidationError,
  uploadBuilderImage,
} from "@/lib/services/storage-service";
import { getUserFacingErrorMessage } from "@/lib/errors/user-facing-error";
import {
  assertFrameHasPhotoSlot,
  countUsableFramePhotoSlots,
  FRAME_PHOTO_SLOT_REQUIRED_MESSAGE,
} from "@/lib/builder/frame-layout-validation";
import { cn } from "@/lib/utils";
import { useBuilderStore } from "@/stores/builder-store";
import type { FrameLayout } from "@/types/frame-template";
import type { TemplateFormValues } from "@/types/template";
import { ApplyFrameToDevicesDialog } from "@/features/admin/templates/components/apply-frame-to-devices-dialog";

type ImageDimensions = {
  width: number;
  height: number;
};

const ACCENT_PRESETS = [
  "#C4121A",
  "#2D3F8F",
  "#F5F1E8",
  "#1B1B1B",
  "#F6C9C9",
  "#B8C7E5",
];

const DEFAULT_FORM: TemplateFormValues = {
  name: "",
  category: "frame",
  status: "published",
  tagline: "",
  photoCount: 0,
  accentColor: "#C4121A",
  frameCategoryId: "",
  frameImageUrl: "",
  isDefault: false,
  printLengthMm: 150,
  frameLayout: null,
};

function getFrameBackgroundImageUrl(layout: FrameLayout) {
  const background =
    layout.nodes.find((node) => node.id === "frame-background") ??
    layout.nodes.find((node) => node.type === "background");
  const value = background?.props.src ?? background?.props.url;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readImageDimensions(file: File): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
        reject(new Error("Unable to read image dimensions."));
        return;
      }
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to read image dimensions."));
    };
    image.src = objectUrl;
  });
}

export function TemplateBuilderWorkspace({
  templateId,
}: {
  templateId: string;
}) {
  const router = useRouter();
  const isNew = templateId === "new";
  const {
    data: devices = [],
    isLoading: devicesLoading,
  } = useBooths({ enabled: isNew });
  const {
    data: templates = [],
    isLoading,
    error: templatesError,
    refetch: refetchTemplates,
  } = useTemplates();
  const { data: frameCategories = [] } = useFrameCategories();
  const assignTemplateToDevices = useAssignTemplateToDevices();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const template = isNew
    ? null
    : templates.find((item) => item.id === templateId);
  const [form, setForm] = useState<TemplateFormValues>(DEFAULT_FORM);
  const [hydratedTemplateId, setHydratedTemplateId] = useState(
    isNew ? "new" : "",
  );
  const [uploadedImageDimensions, setUploadedImageDimensions] =
    useState<ImageDimensions | null>(null);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [createdFrameId, setCreatedFrameId] = useState<string | null>(null);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const builderFullView = useBuilderStore((s) => s.builderFullView);
  const setBuilderFullView = useBuilderStore((s) => s.setBuilderFullView);

  useEffect(() => {
    setBuilderFullView(true);
    return () => {
      setBuilderFullView(false);
    };
  }, [setBuilderFullView]);

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
        frameCategoryId: template.frameCategoryId ?? "",
        frameImageUrl: template.frameImageUrl ?? "",
        isDefault: template.isDefault,
        printLengthMm: template.printLengthMm,
        frameLayout: template.frameLayout ?? null,
      });
      setUploadedImageDimensions(null);
      setHydratedTemplateId(template.id);
    });
    return () => {
      cancelled = true;
    };
  }, [isNew, template]);

  if (!isNew && isLoading) {
    return <Skeleton className="h-[760px]" />;
  }

  if (!isNew && templatesError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-sm font-medium text-zinc-700">
            Data frame belum dapat dimuat.
          </div>
          <p className="mt-2 text-sm text-zinc-500">
            Periksa koneksi Anda lalu coba lagi.
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => void refetchTemplates()}
          >
            Coba lagi
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!isNew && !template) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-sm font-medium text-zinc-500">
            Template not found
          </div>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => router.push("/templates")}
          >
            Back to templates
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!isNew && hydratedTemplateId !== templateId) {
    return <Skeleton className="h-[760px]" />;
  }

  const patch = <K extends keyof TemplateFormValues>(
    key: K,
    value: TemplateFormValues[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleUpload = async (file: File) => {
    const validationError = getBuilderImageValidationError(file);
    if (validationError) throw new Error(validationError);
    const dimensions = await readImageDimensions(file);
    const image = await uploadBuilderImage(file);
    patch("frameImageUrl", image.url);
    setUploadedImageDimensions(dimensions);
    toast.success(
      `Frame image uploaded. Canvas adjusted to ${dimensions.width} × ${dimensions.height}px.`,
    );
  };

  const handleSave = async (layout: FrameLayout) => {
    assertFrameHasPhotoSlot(layout);
    const photoSlotCount = countUsableFramePhotoSlots(layout);
    const bakedLayout = await bakeFrameLayoutColorKeyAssets(layout);
    const payload = {
      ...form,
      status: "published" as const, // Always publish when saving from builder
      photoCount: photoSlotCount,
      frameImageUrl: getFrameBackgroundImageUrl(bakedLayout) ?? form.frameImageUrl,
      frameLayout: bakedLayout,
    };

    if (!payload.name.trim()) {
      toast.error("Frame name is required");
      return;
    }

    try {
      if (isNew) {
        const newTemplateId = await createTemplate.mutateAsync(payload);
        setCreatedFrameId(newTemplateId);
        setSelectedDeviceIds([]);
        setApplyDialogOpen(true);
        toast.success("Frame berhasil dibuat");
      } else {
        await updateTemplate.mutateAsync({ id: templateId, patch: payload });
        toast.success("Template updated");
        router.push("/templates");
      }
    } catch (error) {
      const message = getUserFacingErrorMessage(
        error,
        "Frame tidak dapat disimpan saat ini. Coba lagi.",
      );
      if (message !== FRAME_PHOTO_SLOT_REQUIRED_MESSAGE) {
        showErrorToast(
          "Frame tidak dapat disimpan",
          error,
          "Frame tidak dapat disimpan saat ini. Coba lagi.",
        );
      }
      throw error;
    }
  };

  const saving = createTemplate.isPending || updateTemplate.isPending;

  const toggleDeviceSelection = (deviceId: string) => {
    setSelectedDeviceIds((current) =>
      current.includes(deviceId)
        ? current.filter((id) => id !== deviceId)
        : [...current, deviceId],
    );
  };

  const toggleAllDevices = () => {
    setSelectedDeviceIds((current) =>
      current.length === devices.length
        ? []
        : devices.map((device) => device.id),
    );
  };

  const finishFrameCreation = () => {
    setApplyDialogOpen(false);
    setCreatedFrameId(null);
    setSelectedDeviceIds([]);
    router.push("/templates");
  };

  const applyFrameToDevices = async () => {
    if (!createdFrameId || selectedDeviceIds.length === 0) return;

    try {
      await assignTemplateToDevices.mutateAsync({
        templateId: createdFrameId,
        deviceIds: selectedDeviceIds,
      });
      toast.success(
        "Frame diterapkan ke " + selectedDeviceIds.length + " device",
      );
      finishFrameCreation();
    } catch (error) {
      showErrorToast(
        "Frame gagal diterapkan ke devices",
        error,
        "Frame gagal diterapkan ke devices. Coba lagi.",
      );
    }
  };
  const detailsPanel = (
    <section className="space-y-3 rounded-lg border border-zinc-200 p-3">
      <div>
        <div className="text-sm font-semibold">Frame details</div>
        <div className="text-xs text-zinc-500">
          {isNew ? "Create frame" : `Edit ${template?.name}`}
        </div>
      </div>
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
      <label className="block text-xs font-medium text-zinc-600">
        Frame category
        <Select
          className="mt-1"
          value={form.frameCategoryId}
          onChange={(event) => patch("frameCategoryId", event.target.value)}
        >
          <option value="">No category — show without category tab</option>
          {frameCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
        <span className="mt-1 block text-[10px] leading-4 text-zinc-400">
          Category tabs appear in Flutter only when at least one assigned frame
          uses a category.
        </span>
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
                form.accentColor === color
                  ? "scale-110 border-zinc-950"
                  : "border-zinc-200",
              )}
              style={{ background: color }}
              onClick={() => patch("accentColor", color)}
            />
          ))}
        </div>
        <div className="grid grid-cols-[42px_1fr] gap-2">
          <Input
            className="h-9 p-1"
            type="color"
            value={form.accentColor}
            onChange={(event) => patch("accentColor", event.target.value)}
          />
          <Input
            value={form.accentColor}
            onChange={(event) => patch("accentColor", event.target.value)}
          />
        </div>
      </div>

      <label className="block text-xs font-medium text-zinc-600">
        Print length (mm)
        <Input
          className="mt-1"
          type="number"
          min={20}
          max={1000}
          value={form.printLengthMm}
          onChange={(event) =>
            patch("printLengthMm", Number(event.target.value) || 150)
          }
        />
        <span className="mt-1 block text-[10px] font-normal text-zinc-400">
          Kertas yang dipakai satu cetak, tanpa feed printer.
        </span>
      </label>
      <label className="block text-xs font-medium text-zinc-600">
        Frame image URL
        <Input
          className="mt-1"
          value={form.frameImageUrl}
          placeholder="https://..."
          onChange={(event) => {
            setUploadedImageDimensions(null);
            patch("frameImageUrl", event.target.value);
          }}
        />
      </label>
      <ImageUploadDropzone
        accept={BUILDER_IMAGE_ACCEPT}
        label="Drop frame image here"
        helperText="JPG, PNG, WebP, GIF, or SVG · max 8 MB"
        validate={getBuilderImageValidationError}
        onUpload={handleUpload}
      />
    </section>
  );

  return (
    <div
      className={cn(
        "overflow-hidden",
        builderFullView ? "fixed inset-0 z-[100]" : "-mx-4 -my-6 lg:-mx-8",
      )}
      style={{ height: builderFullView ? "100vh" : "calc(100vh - 4rem)" }}
    >
      <FrameTemplateBuilder
        presentation="embedded"
        resetKey={templateId}
        initialLayout={form.frameLayout ?? null}
        templateName={form.name}
        frameImageUrl={form.frameImageUrl}
        frameImageDimensions={uploadedImageDimensions}
        onClose={() => router.push("/templates")}
        onSave={handleSave}
        saveLabel={
          saving ? "Saving..." : isNew ? "Create frame" : "Save frame"
        }
        detailsPanel={detailsPanel}
      />
      <ApplyFrameToDevicesDialog
        open={applyDialogOpen}
        frameName={form.name}
        devices={devices}
        isLoading={devicesLoading}
        selectedDeviceIds={selectedDeviceIds}
        isApplying={assignTemplateToDevices.isPending}
        onToggleDevice={toggleDeviceSelection}
        onToggleAll={toggleAllDevices}
        onSkip={finishFrameCreation}
        onApply={() => void applyFrameToDevices()}
      />
    </div>
  );
}
