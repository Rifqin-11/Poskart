"use client";

import { useMemo, useState } from "react";
import { CloudUpload, Folder, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/features/admin/_components/page-header";
import {
  useAssets,
  useCreateAsset,
  useDeleteAsset,
  useUpdateAsset,
} from "@/features/admin/assets/use-assets";
import type {
  AssetInput,
  AssetItem,
} from "@/server/admin/_shared/admin-types";

import { AssetUploadDialog, AssetEditDialog } from "./_components/asset-form-dialog";

const EMPTY_ASSET: AssetInput = {
  name: "",
  folder: "Logos",
  tag: "brand",
  version: "v1",
  size: "0 KB",
  url: null,
  storage_path: null,
};

export function AssetLibrary() {
  const { data = [] } = useAssets();
  const assetsList = data as AssetItem[];
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();
  const [search, setSearch] = useState("");
  const [folderFilter, setFolderFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [editing, setEditing] = useState<AssetItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const confirmDelete = useConfirmDialog();

  const folders = useMemo(
    () => Array.from(new Set(assetsList.map((a) => a.folder))).sort(),
    [assetsList],
  );
  const tags = useMemo(
    () => Array.from(new Set(assetsList.map((a) => a.tag))).sort(),
    [assetsList],
  );

  const filtered = useMemo(
    () =>
      assetsList.filter((a) => {
        const matchSearch =
          search.trim() === "" ||
          a.name.toLowerCase().includes(search.toLowerCase()) ||
          a.folder.toLowerCase().includes(search.toLowerCase());
        const matchFolder = folderFilter === "all" || a.folder === folderFilter;
        const matchTag = tagFilter === "all" || a.tag === tagFilter;
        return matchSearch && matchFolder && matchTag;
      }),
    [assetsList, search, folderFilter, tagFilter],
  );

  const handleDelete = (asset: AssetItem) => {
    confirmDelete.confirm({
      title: "Delete asset?",
      description: `Delete asset "${asset.name}"?`,
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: () => {
        deleteAsset.mutate(
          { id: asset.id, storagePath: asset.storage_path ?? undefined },
          {
            onSuccess: () => toast.success("Asset deleted"),
            onError: (err) =>
              toast.error(err instanceof Error ? err.message : "Delete failed"),
          },
        );
      },
    });
  };

  return (
    <div>
      {confirmDelete.dialog}
      <PageHeader
        title="Media & Asset Library"
        description="Organize logos, backgrounds, stamps, decorative elements, and receipt assets."
        action={
          <Button onClick={() => setUploading(true)}>
            <CloudUpload className="size-4" /> Upload assets
          </Button>
        }
      />
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px_220px]">
        <Input
          placeholder="Search assets"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          value={folderFilter}
          onChange={(e) => setFolderFilter(e.target.value)}
        >
          <option value="all">All folders</option>
          {folders.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </Select>
        <Select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
        >
          <option value="all">All tags</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {filtered.map((asset) => (
          <Card key={asset.id} className="overflow-hidden">
            <CardHeader>
              <div className="relative mb-3 grid h-36 place-items-center overflow-hidden rounded-md bg-zinc-100">
                {asset.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={asset.url}
                    alt={asset.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Folder className="size-9 text-zinc-400" />
                )}
              </div>
              <CardTitle>{asset.name}</CardTitle>
              <CardDescription>
                {asset.folder} · {asset.size}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="secondary">{asset.tag}</Badge>
                <span className="text-xs text-zinc-500">{asset.version}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setEditing(asset)}
                >
                  <Edit2 className="size-3.5" /> Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => handleDelete(asset)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 ? (
          <Card className="md:col-span-2 xl:col-span-4">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Folder className="mb-3 size-8 text-zinc-300" />
              <div className="text-sm font-medium text-zinc-500">
                No assets match your filters
              </div>
              <Button className="mt-3" onClick={() => setUploading(true)}>
                <CloudUpload className="size-4" /> Upload first asset
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {uploading ? (
        <AssetUploadDialog
          initial={EMPTY_ASSET}
          submitting={createAsset.isPending}
          onClose={() => setUploading(false)}
          onSubmit={(values) => {
            createAsset.mutate(values, {
              onSuccess: () => {
                toast.success("Asset uploaded");
                setUploading(false);
              },
              onError: (err) =>
                toast.error(
                  err instanceof Error ? err.message : "Upload failed",
                ),
            });
          }}
        />
      ) : null}
      {editing ? (
        <AssetEditDialog
          asset={editing}
          submitting={updateAsset.isPending}
          onClose={() => setEditing(null)}
          onSubmit={(patch) => {
            updateAsset.mutate(
              { id: editing.id, patch },
              {
                onSuccess: () => {
                  toast.success("Asset updated");
                  setEditing(null);
                },
                onError: (err) =>
                  toast.error(
                    err instanceof Error ? err.message : "Update failed",
                  ),
              },
            );
          }}
        />
      ) : null}
    </div>
  );
}
