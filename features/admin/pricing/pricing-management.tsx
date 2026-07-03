"use client";

import { useState } from "react";
import { CreditCard, Edit2, Trash2 } from "lucide-react";
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
};

export function PricingManagement() {
  const { data = [] } = usePricing();
  const createPricing = useCreatePricing();
  const { isReadOnly } = usePermission();
  const updatePricing = useUpdatePricing();
  const deletePricing = useDeletePricing();
  const [editing, setEditing] = useState<PricingProduct | null>(null);
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const confirmDelete = useConfirmDialog();
  const paginatedProducts = data.slice((page - 1) * pageSize, page * pageSize);

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
      title: "Delete package?",
      description: `Delete package "${product.name}"?`,
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: () => {
        deletePricing.mutate(product.id, {
          onSuccess: () => toast.success("Package deleted"),
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
        description="Configure packages, promos, QR download, Live Photo, multi-slot GIF, and print limits."
        action={
          <Button disabled={isReadOnly("pricing")} onClick={() => setCreating(true)}>
            <CreditCard className="size-4" /> Add package
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Pricing profiles</CardTitle>
          <CardDescription>
            Supabase-backed products for POSKART kiosk packages.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Promo</TableHead>
                <TableHead>Print limit</TableHead>
                <TableHead>QR Download</TableHead>
                <TableHead>Live Photo</TableHead>
                <TableHead>GIF</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{formatCurrency(product.price)}</TableCell>
                  <TableCell>
                    {product.promoPrice
                      ? formatCurrency(product.promoPrice)
                      : "-"}
                  </TableCell>
                  <TableCell>{product.printLimit}</TableCell>
                  <TableCell>
                    <Switch
                      checked={product.qrisDownload}
                      disabled={isReadOnly("pricing")}
                      onCheckedChange={(v) =>
                        handleToggle(product, "qrisDownload", v)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={product.livePhotoEnabled}
                      disabled={isReadOnly("pricing")}
                      onCheckedChange={(v) =>
                        handleToggle(product, "livePhotoEnabled", v)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={product.gifEnabled}
                      disabled={isReadOnly("pricing")}
                      onCheckedChange={(v) =>
                        handleToggle(product, "gifEnabled", v)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={product.active}
                      disabled={isReadOnly("pricing")}
                      onCheckedChange={(v) =>
                        handleToggle(product, "active", v)
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={isReadOnly("pricing")}
                        onClick={() => setEditing(product)}
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        disabled={isReadOnly("pricing")}
                        onClick={() => handleDelete(product)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="py-8 text-center text-sm text-zinc-400"
                  >
                    No packages yet. Click <strong>Add package</strong> to
                    create one.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          <TablePagination
            page={page}
            pageSize={pageSize}
            totalItems={data.length}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>

      {creating ? (
        <PricingFormDialog
          title="Add package"
          initial={EMPTY_PRICING}
          submitting={createPricing.isPending}
          onClose={() => setCreating(false)}
          onSubmit={(values) => {
            createPricing.mutate(values, {
              onSuccess: () => {
                toast.success("Package created");
                setCreating(false);
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
                  toast.success("Package updated");
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
