"use client";

import { useState } from "react";
import { CalendarDays, Edit2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { PageHeader } from "@/features/admin/_components/page-header";
import {
  useCreatePricing,
  useDeletePricing,
  usePricing,
  useUpdatePricing,
} from "@/features/admin/pricing/use-pricing";
import { formatCurrency } from "@/lib/utils";
import { usePermission } from "@/features/admin/hooks/use-permission";
import type { PricingProduct, PricingProductInput } from "@/types/pricing";

import { PricingFormDialog } from "./_components/pricing-form-dialog";

const EMPTY_PRICING: PricingProductInput = {
  name: "",
  price: 0,
  promoPrice: undefined,
  printLimit: 1,
  qrisDownload: true,
  livePhotoEnabled: false,
  gifEnabled: false,
  active: true,
  accessMode: "paid",
  eventName: undefined,
  eventExpiresAt: undefined,
};

const EMPTY_EVENT: PricingProductInput = {
  ...EMPTY_PRICING,
  qrisDownload: false,
  accessMode: "event",
};

export function PricingManagement() {
  const { data = [] } = usePricing();
  const createPricing = useCreatePricing();
  const { isReadOnly } = usePermission();
  const updatePricing = useUpdatePricing();
  const deletePricing = useDeletePricing();
  const [editing, setEditing] = useState<PricingProduct | null>(null);
  const [creating, setCreating] = useState<PricingProductInput | null>(null);
  const confirmDelete = useConfirmDialog();

  const handleToggle = (
    product: PricingProduct,
    field: "qrisDownload" | "livePhotoEnabled" | "gifEnabled" | "active",
    value: boolean,
  ) => {
    updatePricing.mutate(
      { id: product.id, patch: { [field]: value } },
      {
        onSuccess: () => toast.success("Updated"),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Update failed"),
      },
    );
  };

  const handleDelete = (product: PricingProduct) => {
    confirmDelete.confirm({
      title: "Delete access?",
      description: `Delete "${product.name}"?`,
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: () => {
        deletePricing.mutate(product.id, {
          onSuccess: () => toast.success("Access deleted"),
          onError: (err) =>
            toast.error(err instanceof Error ? err.message : "Delete failed"),
        });
      },
    });
  };

  return (
    <div>
      {confirmDelete.dialog}
      <PageHeader
        title="Pricing & Product Management"
        description="Configure paid packages and event access for POSKART kiosks."
      />

      <div className="space-y-5">
        <Card className="border-slate-200 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Pilih jenis akses yang sesuai
            </CardTitle>
            <CardDescription>
              Pricing dan event memiliki alur yang berbeda di kiosk. Gunakan
              event hanya untuk sesi yang dibayarkan atau ditanggung oleh
              penyelenggara.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-medium text-white">
                  Berbayar
                </span>
                <p className="font-semibold text-slate-950">Pricing package</p>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                Pengunjung memilih paket, lalu melanjutkan ke pembayaran.
                Harga, promo, QR download, dan batas cetak dapat diatur untuk
                setiap paket.
              </p>
              <p className="mt-3 text-xs font-medium text-slate-600">
                Cocok untuk layanan photobooth reguler.
              </p>
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-[#00357B] px-2.5 py-1 text-xs font-medium text-white">
                  Gratis
                </span>
                <p className="font-semibold text-slate-950">Event access</p>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                Pengunjung langsung memulai sesi tanpa memilih paket atau
                melakukan pembayaran. Akses ini hanya berlaku pada device yang
                dialokasikan untuk event tersebut.
              </p>
              <p className="mt-3 text-xs font-medium text-slate-600">
                Cocok untuk acara yang ditanggung penyelenggara; nama dan masa
                berlaku event dapat diatur.
              </p>
            </div>
          </CardContent>
        </Card>

        <PricingTableCard
          title="Pricing packages"
          description="Paid packages with payment, print, and media settings."
          products={data.filter((product) => product.accessMode === "paid")}
          eventMode={false}
          readOnly={isReadOnly("pricing")}
          onAdd={() => setCreating({ ...EMPTY_PRICING })}
          onEdit={setEditing}
          onDelete={handleDelete}
          onToggle={handleToggle}
        />
        <PricingTableCard
          title="Event access"
          description="Complimentary sessions that skip package and payment selection on assigned kiosks."
          products={data.filter((product) => product.accessMode === "event")}
          eventMode
          readOnly={isReadOnly("pricing")}
          onAdd={() => setCreating({ ...EMPTY_EVENT })}
          onEdit={setEditing}
          onDelete={handleDelete}
          onToggle={handleToggle}
        />
      </div>

      {creating ? (
        <PricingFormDialog
          title={
            creating.accessMode === "event" ? "Add event access" : "Add package"
          }
          initial={creating}
          submitting={createPricing.isPending}
          onClose={() => setCreating(null)}
          onSubmit={(values) => {
            createPricing.mutate(values, {
              onSuccess: () => {
                toast.success(
                  values.accessMode === "event"
                    ? "Event access created"
                    : "Package created",
                );
                setCreating(null);
              },
              onError: (err) =>
                toast.error(
                  err instanceof Error ? err.message : "Create failed",
                ),
            });
          }}
        />
      ) : null}
      {editing ? (
        <PricingFormDialog
          title={`Edit ${editing.name}`}
          initial={editing}
          submitting={updatePricing.isPending}
          onClose={() => setEditing(null)}
          onSubmit={(values) => {
            updatePricing.mutate(
              { id: editing.id, patch: values },
              {
                onSuccess: () => {
                  toast.success("Access updated");
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

type PricingTableCardProps = {
  title: string;
  description: string;
  products: PricingProduct[];
  eventMode: boolean;
  readOnly: boolean;
  onAdd: () => void;
  onEdit: (product: PricingProduct) => void;
  onDelete: (product: PricingProduct) => void;
  onToggle: (
    product: PricingProduct,
    field: "qrisDownload" | "livePhotoEnabled" | "gifEnabled" | "active",
    value: boolean,
  ) => void;
};

function PricingTableCard({
  title,
  description,
  products,
  eventMode,
  readOnly,
  onAdd,
  onEdit,
  onDelete,
  onToggle,
}: PricingTableCardProps) {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(products.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleProducts = products.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button disabled={readOnly} onClick={onAdd}>
          {eventMode ? (
            <CalendarDays className="size-4" />
          ) : (
            <Plus className="size-4" />
          )}
          {eventMode ? "Add event" : "Add package"}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead>{eventMode ? "Event" : "Product"}</TableHead>
                {eventMode ? (
                  <TableHead>Expiry</TableHead>
                ) : (
                  <>
                    <TableHead>Price</TableHead>
                    <TableHead>Promo</TableHead>
                  </>
                )}
                <TableHead>Print limit</TableHead>
                {!eventMode ? <TableHead>QR Download</TableHead> : null}
                <TableHead>Live Photo</TableHead>
                <TableHead>GIF</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="font-medium">{product.name}</div>
                    {eventMode && product.eventName ? (
                      <div className="text-xs text-amber-700">
                        {product.eventName}
                      </div>
                    ) : null}
                  </TableCell>
                  {eventMode ? (
                    <TableCell className="text-sm text-zinc-500">
                      {formatExpiry(product.eventExpiresAt)}
                    </TableCell>
                  ) : (
                    <>
                      <TableCell>{formatCurrency(product.price)}</TableCell>
                      <TableCell>
                        {product.promoPrice
                          ? formatCurrency(product.promoPrice)
                          : "-"}
                      </TableCell>
                    </>
                  )}
                  <TableCell>{product.printLimit}</TableCell>
                  {!eventMode ? (
                    <TableCell>
                      <Switch
                        checked={product.qrisDownload}
                        disabled={readOnly}
                        onCheckedChange={(value) =>
                          onToggle(product, "qrisDownload", value)
                        }
                      />
                    </TableCell>
                  ) : null}
                  <TableCell>
                    <Switch
                      checked={product.livePhotoEnabled}
                      disabled={readOnly}
                      onCheckedChange={(value) =>
                        onToggle(product, "livePhotoEnabled", value)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={product.gifEnabled}
                      disabled={readOnly}
                      onCheckedChange={(value) =>
                        onToggle(product, "gifEnabled", value)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={product.active}
                      disabled={readOnly}
                      onCheckedChange={(value) =>
                        onToggle(product, "active", value)
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${product.name}`}
                        disabled={readOnly}
                        onClick={() => onEdit(product)}
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${product.name}`}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        disabled={readOnly}
                        onClick={() => onDelete(product)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {products.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={eventMode ? 7 : 8}
                    className="py-8 text-center text-sm text-zinc-400"
                  >
                    {eventMode
                      ? "No event access yet. Add an event to enable complimentary sessions."
                      : "No pricing packages yet. Add a package to enable paid sessions."}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
        <TablePagination
          page={currentPage}
          pageSize={pageSize}
          totalItems={products.length}
          onPageChange={setPage}
        />
      </CardContent>
    </Card>
  );
}

function formatExpiry(value?: string) {
  if (!value) return "No expiry";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
