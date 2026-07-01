"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { uploadLibraryAsset } from "@/lib/services/storage-service";
import type {
  AssetInput,
  AssetItem,
} from "@/features/admin/assets/api";

type AssetUploadDialogProps = {
  initial: AssetInput;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: AssetInput) => void;
};

export function AssetUploadDialog({
  initial,
  submitting,
  onClose,
  onSubmit,
}: AssetUploadDialogProps) {
  const [form, setForm] = useState<AssetInput>(initial);
  const [file, setFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const handleFile = (f: File) => {
    setFile(f);
    setForm((current) => ({
      ...current,
      name: current.name || f.name,
      size:
        f.size >= 1024 * 1024
          ? `${(f.size / 1024 / 1024).toFixed(1)} MB`
          : `${Math.max(1, Math.round(f.size / 1024))} KB`,
    }));
  };

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    let url = form.url ?? null;
    let storagePath = form.storage_path ?? null;
    let size = form.size;

    if (file) {
      setUploadingFile(true);
      try {
        const result = await uploadLibraryAsset(file);
        url = result.url;
        storagePath = result.path;
        size = result.size;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
        setUploadingFile(false);
        return;
      }
      setUploadingFile(false);
    }

    onSubmit({ ...form, url, storage_path: storagePath, size });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Upload asset">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <div className="grid h-40 place-items-center overflow-hidden rounded-lg border border-dashed border-zinc-300 bg-zinc-50">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt=""
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="text-xs text-zinc-400">No file selected</div>
            )}
          </div>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            className="mt-2 block w-full text-xs"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </div>
        <label className="block text-xs font-medium text-zinc-600">
          Name
          <Input
            className="mt-1"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Folder
          <Input
            className="mt-1"
            value={form.folder}
            onChange={(e) => setForm({ ...form, folder: e.target.value })}
            placeholder="Logos"
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Tag
          <Input
            className="mt-1"
            value={form.tag}
            onChange={(e) => setForm({ ...form, tag: e.target.value })}
            placeholder="brand"
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Version
          <Input
            className="mt-1"
            value={form.version}
            onChange={(e) => setForm({ ...form, version: e.target.value })}
            placeholder="v1"
          />
        </label>
        <div className="md:col-span-2 flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={submitting || uploadingFile}
            onClick={() => void submit()}
          >
            {uploadingFile ? "Uploading…" : submitting ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

type AssetEditDialogProps = {
  asset: AssetItem;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (patch: Partial<AssetInput>) => void;
};

export function AssetEditDialog({
  asset,
  submitting,
  onClose,
  onSubmit,
}: AssetEditDialogProps) {
  const [form, setForm] = useState({
    name: asset.name,
    folder: asset.folder,
    tag: asset.tag,
    version: asset.version,
  });
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    const patch: Partial<AssetInput> = { ...form };

    if (replaceFile) {
      setUploadingFile(true);
      try {
        const result = await uploadLibraryAsset(replaceFile);
        patch.url = result.url;
        patch.storage_path = result.path;
        patch.size = result.size;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
        setUploadingFile(false);
        return;
      }
      setUploadingFile(false);
    }
    onSubmit(patch);
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Edit ${asset.name}`}
    >
      <div className="grid gap-3 md:grid-cols-2">
        {asset.url ? (
          <div className="md:col-span-2 grid h-32 place-items-center overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset.url}
              alt={asset.name}
              className="h-full object-contain"
            />
          </div>
        ) : null}
        <label className="block text-xs font-medium text-zinc-600">
          Name
          <Input
            className="mt-1"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Folder
          <Input
            className="mt-1"
            value={form.folder}
            onChange={(e) => setForm({ ...form, folder: e.target.value })}
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Tag
          <Input
            className="mt-1"
            value={form.tag}
            onChange={(e) => setForm({ ...form, tag: e.target.value })}
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Version
          <Input
            className="mt-1"
            value={form.version}
            onChange={(e) => setForm({ ...form, version: e.target.value })}
          />
        </label>
        <label className="md:col-span-2 block text-xs font-medium text-zinc-600">
          Replace file (optional)
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            className="mt-1 block w-full text-xs"
            onChange={(e) => setReplaceFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <div className="md:col-span-2 flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={submitting || uploadingFile}
            onClick={() => void submit()}
          >
            {uploadingFile ? "Uploading…" : submitting ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
