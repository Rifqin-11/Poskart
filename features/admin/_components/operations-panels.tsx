"use client";

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
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BadgeCheck,
  Battery,
  Boxes,
  Check,
  CloudUpload,
  CreditCard,
  Download,
  Edit2,
  Folder,
  Grid2X2,
  GripVertical,
  ImagePlus,
  LockKeyhole,
  List,
  Plus,
  Power,
  Printer,
  Timer,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  Trash2,
  Users,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FrameTemplateTester } from "@/features/admin/templates/frame-template-tester";
import { SubscriptionDialog } from "@/features/billing/subscription/subscription-dialog";
import { useDashboardData } from "@/features/admin/dashboard/use-dashboard";
import {
  useBooths,
  useCreateBooth,
  useDeleteBooth,
  useUpdateBooth,
} from "@/features/admin/devices/use-devices";
import {
  useCreatePricing,
  useDeletePricing,
  usePricing,
  useSubscriptionPlans,
  useUpdatePricing,
  useUpdateSubscriptionPlan,
} from "@/features/admin/pricing/use-pricing";
import {
  useDeleteTemplate,
  useReorderTemplates,
  useTemplates,
} from "@/features/admin/templates/use-templates";
import {
  useTransactions,
  useUpdateTransaction,
  useDeleteTransaction,
  useDeleteTransactions,
} from "@/features/admin/transactions/use-transactions";
import { useLayoutSchemas } from "@/features/admin/layout/use-layout";
import {
  useAssets,
  useCreateAsset,
  useDeleteAsset,
  useUpdateAsset,
} from "@/features/admin/assets/use-assets";
import {
  useFailedPrintsByBooth,
  useRetryPrint,
} from "@/features/admin/transactions/use-transactions";
import {
  useAppConfig,
  useSaveAppConfig,
} from "@/features/admin/settings/use-settings";
import {
  useCreateTenant,
  useDeleteTenant,
  useProfiles,
  useTenants,
  useUpdateTenant,
  useUpdateProfile,
} from "@/features/admin/superadmin/use-superadmin";
import {
  useDeleteInvitation,
  useInviteUser,
  useRemoveMember,
  useTenantDetails,
  useTenantInvitations,
  useTenantMembers,
  useUpdateTenantName,
} from "@/features/admin/organization/use-organization";
import { useSubscriptionStatus } from "@/features/admin/subscription/use-subscription";
import { createClient } from "@/lib/supabase/client";
import { pricingPlans } from "@/lib/constants/business";
import type {
  AssetInput,
  AssetItem,
  BoothInput,
  PricingProductInput,
  TenantInput,
} from "@/server/admin/_shared/admin-repository";
import { uploadLibraryAsset } from "@/lib/services/storage-service";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";
import type { Device } from "@/types/device";
import type { PricingProduct, SubscriptionPlan } from "@/types/pricing";
import type { Template } from "@/types/template";
import type { Organization } from "@/types/organization";
import type { Transaction } from "@/types/transaction";

type AdminUserProfile = {
  id: string;
  email: string;
  role: string;
  created_at: string;
  organizationId: string | null;
  organizationName: string | null;
  memberRole: string | null;
};

type OrganizationMemberRow = {
  id: string;
  email: string;
  role: string;
  created_at: string;
};

type OrganizationInvitationRow = {
  id: string;
  email: string;
  created_at: string;
};

const EMPTY_TEMPLATES: Template[] = [];

function useClientMounted() {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}

function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-zinc-500">{description}</p>
      </div>
      {action}
    </div>
  );
}

function SortableTemplateCard({
  template,
  viewMode,
  onDelete,
  onEdit,
  onTest,
}: {
  template: Template;
  viewMode: "grid" | "list";
  onDelete: (template: Template) => void;
  onEdit: (template: Template) => void;
  onTest: (template: Template) => void;
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: template.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
      }}
      className={cn(isDragging && "opacity-70")}
    >
      <Card className="group h-full overflow-hidden">
        <CardContent
          className={cn(
            "p-4",
            viewMode === "grid"
              ? "space-y-4"
              : "grid grid-cols-[auto_96px_minmax(0,1fr)_auto] items-center gap-4",
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-zinc-400">
              Urutan {template.displayOrder + 1}
            </span>
            <button
              type="button"
              className="flex size-9 cursor-grab touch-none items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 active:cursor-grabbing"
              title="Geser untuk mengubah urutan"
              aria-label={`Ubah urutan ${template.name}`}
              {...attributes}
              {...listeners}
            >
              <GripVertical className="size-4" />
            </button>
          </div>

          <div
            className={cn(
              "relative mx-auto flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm",
              viewMode === "grid" ? "aspect-[8/12] h-48 w-32" : "h-28 w-20",
            )}
            style={{ backgroundColor: `${template.accentColor}14` }}
          >
            {template.frameImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={template.frameImageUrl}
                alt={template.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <Boxes
                className="size-10"
                style={{ color: template.accentColor }}
              />
            )}
          </div>

          <div className="min-w-0 space-y-3">
            <h2 className="truncate text-base font-semibold text-zinc-950">
              {template.name}
            </h2>
            {template.tagline ? (
              <p className="line-clamp-2 text-sm text-zinc-500">
                {template.tagline}
              </p>
            ) : (
              <p className="text-sm text-zinc-400">No tagline configured.</p>
            )}
            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span
                  className="size-3 rounded-full border border-zinc-200"
                  style={{ background: template.accentColor }}
                />
                {template.accentColor}
              </span>
              <span>{template.photoCount} photos</span>
              <span>
                {template.usageCount.toLocaleString("id-ID")} kali digunakan
              </span>
              <span>
                {template.frameLayout ? "Custom layout" : "Default layout"}
              </span>
            </div>
          </div>

          <div
            className={cn(
              "flex gap-2",
              viewMode === "grid" ? "flex-wrap" : "flex-col",
            )}
          >
            <Button
              variant="outline"
              size="sm"
              className="flex-1 justify-center px-2"
              onClick={() => onTest(template)}
            >
              <ImagePlus className="size-3.5" /> Test
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 justify-center px-2"
              onClick={() => onEdit(template)}
            >
              <Edit2 className="size-3.5" /> Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="justify-center px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => onDelete(template)}
            >
              <Trash2 className="size-3.5" /> Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

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
    setOrderedTemplates(data);
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
                "max-w-5xl gap-4",
                viewMode === "grid"
                  ? "grid md:grid-cols-2 xl:grid-cols-3"
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

const EMPTY_PRICING: PricingProductInput = {
  name: "",
  price: 0,
  promoPrice: undefined,
  printLimit: 1,
  qrisDownload: true,
  gifEnabled: false,
  active: true,
};

export function PricingManagement() {
  const { data = [] } = usePricing();
  const createPricing = useCreatePricing();
  const updatePricing = useUpdatePricing();
  const deletePricing = useDeletePricing();
  const [editing, setEditing] = useState<PricingProduct | null>(null);
  const [creating, setCreating] = useState(false);
  const confirmDelete = useConfirmDialog();

  const handleToggle = (
    product: PricingProduct,
    field: "qrisDownload" | "gifEnabled" | "active",
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
        description="Configure packages, promos, QR download, GIF options, and print limits."
        action={
          <Button onClick={() => setCreating(true)}>
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
                <TableHead>GIF</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((product) => (
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
                      onCheckedChange={(v) =>
                        handleToggle(product, "qrisDownload", v)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={product.gifEnabled}
                      onCheckedChange={(v) =>
                        handleToggle(product, "gifEnabled", v)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={product.active}
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
                        onClick={() => setEditing(product)}
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
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
                    colSpan={8}
                    className="py-8 text-center text-sm text-zinc-400"
                  >
                    No packages yet. Click <strong>Add package</strong> to
                    create one.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
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

function PricingFormDialog({
  title,
  initial,
  submitting,
  onClose,
  onSubmit,
}: {
  title: string;
  initial: PricingProductInput;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: PricingProductInput) => void;
}) {
  const [form, setForm] = useState<PricingProductInput>(initial);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={title}>
      <form
        className="grid gap-3 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.name.trim()) {
            toast.error("Name is required");
            return;
          }
          onSubmit(form);
        }}
      >
        <label className="md:col-span-2 block text-xs font-medium text-zinc-600">
          Name
          <Input
            className="mt-1"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Bronze package"
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Price (IDR)
          <Input
            className="mt-1"
            type="number"
            min={0}
            value={form.price}
            onChange={(e) =>
              setForm({ ...form, price: Number(e.target.value) })
            }
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Promo price (IDR, optional)
          <Input
            className="mt-1"
            type="number"
            min={0}
            value={form.promoPrice ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                promoPrice:
                  e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Print limit
          <Input
            className="mt-1"
            type="number"
            min={1}
            max={20}
            value={form.printLimit}
            onChange={(e) =>
              setForm({ ...form, printLimit: Number(e.target.value) })
            }
          />
        </label>
        <div className="flex flex-wrap items-center gap-6 md:col-span-2">
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <Switch
              checked={form.qrisDownload}
              onCheckedChange={(v) => setForm({ ...form, qrisDownload: v })}
            />
            QR download
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <Switch
              checked={form.gifEnabled}
              onCheckedChange={(v) => setForm({ ...form, gifEnabled: v })}
            />
            GIF enabled
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <Switch
              checked={form.active}
              onCheckedChange={(v) => setForm({ ...form, active: v })}
            />
            Active
          </label>
        </div>
        <div className="md:col-span-2 flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

type TransactionEditForm = {
  booth: string;
  location: string;
  customer: string;
  package_name: string;
  amount: string;
  status: "paid" | "pending" | "failed" | "refunded";
  provider: "QRIS" | "Cash";
};

export function TransactionsMonitoring() {
  const { data = [] } = useTransactions();
  const updateTransaction = useUpdateTransaction();
  const deleteTransaction = useDeleteTransaction();
  const deleteTransactions = useDeleteTransactions();
  const confirmDelete = useConfirmDialog();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editForm, setEditForm] = useState<TransactionEditForm>({
    booth: "",
    location: "",
    customer: "",
    package_name: "",
    amount: "0",
    status: "paid",
    provider: "QRIS",
  });

  const filtered = data.filter((t: Transaction) => {
    const matchSearch =
      !search ||
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.device.toLowerCase().includes(search.toLowerCase()) ||
      t.customer.toLowerCase().includes(search.toLowerCase()) ||
      t.packageName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  function openEdit(t: Transaction) {
    setEditing(t);
    setEditForm({
      booth: t.device,
      location: t.location,
      customer: t.customer,
      package_name: t.packageName,
      amount: String(t.amount),
      status: t.status,
      provider: t.provider,
    });
  }

  async function handleSaveEdit() {
    if (!editing) return;
    await updateTransaction.mutateAsync({
      id: editing.id,
      patch: {
        booth: editForm.booth,
        location: editForm.location,
        customer: editForm.customer,
        package_name: editForm.package_name,
        amount: Number(editForm.amount),
        status: editForm.status,
        provider: editForm.provider,
      },
    });
    toast.success("Transaction updated");
    setEditing(null);
  }

  async function handleDelete(id: string) {
    await deleteTransaction.mutateAsync(id);
    toast.success("Transaction deleted");
    setSelectedIds((prev) => prev.filter((item) => item !== id));
    setDeletingId(null);
  }

  function handleDeleteSelected() {
    confirmDelete.confirm({
      title: "Hapus transaksi terpilih?",
      description: `Apakah Anda yakin ingin menghapus ${selectedIds.length} transaksi yang dipilih? Data tidak dapat dikembalikan.`,
      confirmLabel: "Hapus Semua",
      destructive: true,
      onConfirm: async () => {
        try {
          await deleteTransactions.mutateAsync(selectedIds);
          toast.success(`${selectedIds.length} transaksi berhasil dihapus`);
          setSelectedIds([]);
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : "Gagal menghapus transaksi",
          );
        }
      },
    });
  }

  return (
    <div>
      {confirmDelete.dialog}
      <PageHeader
        title="Transaction & QRIS Monitoring"
        description="Track live payments, failed logs, manual verification, retry, and refund tools."
        action={
          <Button variant="outline">
            <SlidersHorizontal className="size-4" /> Filters
          </Button>
        }
      />

      {/* Edit Dialog */}
      <Dialog
        open={Boolean(editing)}
        title="Edit Transaction"
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <div className="space-y-4">
          <p className="text-xs text-zinc-500 font-mono">{editing?.id}</p>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-xs font-medium text-zinc-600">
              Device / Booth
              <Input
                className="mt-1"
                value={editForm.booth}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, booth: e.target.value }))
                }
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Location
              <Input
                className="mt-1"
                value={editForm.location}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, location: e.target.value }))
                }
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Customer
              <Input
                className="mt-1"
                value={editForm.customer}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, customer: e.target.value }))
                }
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Package name
              <Input
                className="mt-1"
                value={editForm.package_name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, package_name: e.target.value }))
                }
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Amount (Rp)
              <Input
                className="mt-1"
                type="number"
                min={0}
                value={editForm.amount}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, amount: e.target.value }))
                }
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Provider
              <select
                className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                value={editForm.provider}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    provider: e.target.value as "QRIS" | "Cash",
                  }))
                }
              >
                <option value="QRIS">QRIS</option>
                <option value="Cash">Cash</option>
              </select>
            </label>
            <label className="block text-xs font-medium text-zinc-600 md:col-span-2">
              Status
              <select
                className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                value={editForm.status}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    status: e.target.value as
                      | "paid"
                      | "pending"
                      | "failed"
                      | "refunded",
                  }))
                }
              >
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleSaveEdit()}
              disabled={updateTransaction.isPending}
            >
              {updateTransaction.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 gap-3 max-w-xl">
              <Input
                placeholder="Search by ID, device, customer…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All status</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </Select>
            </div>
            <div className="text-xs text-zinc-500 flex items-center gap-4">
              <span>
                {filtered.length} of {data.length} transactions
              </span>
              {selectedIds.length > 0 && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-1.5 animate-in fade-in duration-200"
                >
                  <Trash2 className="size-3.5" /> Hapus Terpilih (
                  {selectedIds.length})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-950 accent-zinc-900 cursor-pointer"
                    checked={
                      filtered.length > 0 &&
                      filtered.every((t) => selectedIds.includes(t.id))
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds((prev) => {
                          const newIds = [...prev];
                          filtered.forEach((t) => {
                            if (!newIds.includes(t.id)) newIds.push(t.id);
                          });
                          return newIds;
                        });
                      } else {
                        setSelectedIds((prev) =>
                          prev.filter(
                            (id) => !filtered.some((t) => t.id === id),
                          ),
                        );
                      }
                    }}
                    aria-label="Pilih semua transaksi"
                  />
                </TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Tanggal & Jam</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((transaction: Transaction) => (
                <TableRow
                  key={transaction.id}
                  className={
                    selectedIds.includes(transaction.id) ? "bg-zinc-50/60" : ""
                  }
                >
                  <TableCell className="w-12">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-950 accent-zinc-900 cursor-pointer"
                      checked={selectedIds.includes(transaction.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds((prev) => [...prev, transaction.id]);
                        } else {
                          setSelectedIds((prev) =>
                            prev.filter((id) => id !== transaction.id),
                          );
                        }
                      }}
                      aria-label={`Pilih transaksi ${transaction.id.slice(0, 8)}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {transaction.id}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-zinc-600">
                    {formatDateTime(transaction.createdAtRaw)}
                  </TableCell>
                  <TableCell>{transaction.device}</TableCell>
                  <TableCell>{transaction.location}</TableCell>
                  <TableCell>{transaction.packageName}</TableCell>
                  <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        transaction.status === "paid"
                          ? "success"
                          : transaction.status === "pending"
                            ? "warning"
                            : "destructive"
                      }
                    >
                      {transaction.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {deletingId === transaction.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500">Delete?</span>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={deleteTransaction.isPending}
                          onClick={() => void handleDelete(transaction.id)}
                        >
                          {deleteTransaction.isPending ? "…" : "Yes"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeletingId(null)}
                        >
                          No
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(transaction)}
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => setDeletingId(transaction.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                        <DropdownMenu
                          items={[
                            {
                              label: "Manual verify",
                              onClick: () => toast.success("Payment verified"),
                            },
                            {
                              label: "Retry QRIS",
                              onClick: () => toast.message("Retry sent"),
                            },
                            {
                              label: "Refund",
                              destructive: true,
                              onClick: () => toast.error("Refund queued"),
                            },
                          ]}
                        />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-10 text-center text-sm text-zinc-400"
                  >
                    No transactions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

const EMPTY_BOOTH: BoothInput = {
  name: "",
  location: "",
  status: "online",
  battery: 100,
  appVersion: "1.0.0",
  lastSync: "just now",
  theme: "",
  template: "",
  pricingProfile: "Standard",
  frameTemplates: [],
  pricingProfiles: ["Standard"],
  sessionCountdownSeconds: null,
  paymentCountdownSeconds: null,
};

type DeviceFormOptions = {
  themes: string[];
  frameTemplates: string[];
  pricingProfiles: string[];
};

export function BoothManagement() {
  const { data = [], refetch } = useBooths();
  const { data: subscriptionStatus } = useSubscriptionStatus();
  const { data: layouts = [] } = useLayoutSchemas();
  const { data: templates = [] } = useTemplates();
  const { data: pricingProducts = [] } = usePricing();
  const createBooth = useCreateBooth();
  const updateBooth = useUpdateBooth();
  const deleteBooth = useDeleteBooth();
  const [editing, setEditing] = useState<Device | null>(null);
  const [creating, setCreating] = useState(false);
  const [assignFor, setAssignFor] = useState<Device | null>(null);
  const [failedFor, setFailedFor] = useState<Device | null>(null);
  const confirmDelete = useConfirmDialog();
  const deviceLimit = subscriptionStatus?.deviceLimit ?? 1;
  const usedDevices = data.length;
  const remainingDevices = Math.max(0, deviceLimit - usedDevices);
  const deviceUsagePercent =
    deviceLimit > 0 ? Math.min(100, (usedDevices / deviceLimit) * 100) : 0;
  const deviceLimitReached = remainingDevices <= 0;

  const deviceFormOptions = useMemo<DeviceFormOptions>(
    () => ({
      themes: layouts.map((layout) => layout.name).filter(Boolean),
      frameTemplates: templates
        .filter((template) => template.category === "frame")
        .map((template) => template.name)
        .filter(Boolean),
      pricingProfiles: pricingProducts
        .filter((product) => product.active)
        .map((product) => product.name)
        .filter(Boolean),
    }),
    [layouts, pricingProducts, templates],
  );

  const handleDelete = (device: Device) => {
    confirmDelete.confirm({
      title: "Delete device?",
      description: `Delete device "${device.name}"?`,
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: () => {
        deleteBooth.mutate(device.id, {
          onSuccess: () => toast.success("Device deleted"),
          onError: (err) =>
            toast.error(err instanceof Error ? err.message : "Delete failed"),
        });
      },
    });
  };

  const assignTheme = (device: Device, themeName: string) => {
    updateBooth.mutate(
      { id: device.id, patch: { theme: themeName } },
      {
        onSuccess: () => {
          toast.success(`Assigned "${themeName}" to ${device.name}`);
          setAssignFor(null);
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Failed"),
      },
    );
  };

  const updateDeviceAssignments = (
    device: Device,
    patch: Pick<Partial<BoothInput>, "frameTemplates" | "pricingProfiles">,
    successMessage: string,
  ) => {
    updateBooth.mutate(
      { id: device.id, patch },
      {
        onSuccess: () => {
          toast.success(successMessage);
          setAssignFor((current) =>
            current?.id === device.id ? { ...current, ...patch } : current,
          );
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Update failed"),
      },
    );
  };

  return (
    <div>
      {confirmDelete.dialog}
      <PageHeader
        title="Device Management"
        description="Configure kiosk theme, frame template, pricing package, countdowns, sync status, and remote actions."
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                void refetch();
                toast.message("Refreshing network…");
              }}
            >
              <RefreshCw className="size-4" /> Refresh network
            </Button>
            <Button
              onClick={() => setCreating(true)}
              disabled={deviceLimitReached}
              title={deviceLimitReached ? "Device limit reached" : "Add device"}
            >
              <Plus className="size-4" /> Add device
            </Button>
          </div>
        }
      />
      <Card className="mb-6">
        <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="text-sm font-semibold text-zinc-950">
              Device capacity
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              {usedDevices} of {deviceLimit} device{deviceLimit > 1 ? "s" : ""}{" "}
              used.{" "}
              <span
                className={
                  deviceLimitReached
                    ? "font-medium text-red-600"
                    : "font-medium text-emerald-700"
                }
              >
                {deviceLimitReached
                  ? "No device slots remaining."
                  : `${remainingDevices} device${remainingDevices > 1 ? "s" : ""} available.`}
              </span>
            </p>
            <Progress value={deviceUsagePercent} className="mt-4" />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
              <div className="text-lg font-semibold text-zinc-950">
                {usedDevices}
              </div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                Used
              </div>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
              <div className="text-lg font-semibold text-zinc-950">
                {deviceLimit}
              </div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                Allowed
              </div>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
              <div
                className={cn(
                  "text-lg font-semibold",
                  deviceLimitReached ? "text-red-600" : "text-emerald-700",
                )}
              >
                {remainingDevices}
              </div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                Available
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        {data.map((device) => (
          <Card key={device.id}>
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle>{device.name}</CardTitle>
                <CardDescription>
                  {device.location} · {device.appVersion}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    device.status === "online"
                      ? "success"
                      : device.status === "maintenance"
                        ? "warning"
                        : "destructive"
                  }
                >
                  {device.status}
                </Badge>
                <DropdownMenu
                  items={[
                    { label: "Edit", onClick: () => setEditing(device) },
                    {
                      label: "Delete",
                      destructive: true,
                      onClick: () => handleDelete(device),
                    },
                  ]}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-md bg-zinc-50 p-3">
                  <Battery className="mb-2 size-4" />
                  {device.battery}% battery
                </div>
                <div className="rounded-md bg-zinc-50 p-3">
                  <BadgeCheck className="mb-2 size-4" />
                  {device.lastSync}
                </div>
                <div className="rounded-md bg-zinc-50 p-3">
                  <Store className="mb-2 size-4" />
                  {formatAssignmentList(device.pricingProfiles)}
                </div>
              </div>
              <div className="grid gap-2 rounded-md bg-zinc-50 p-3 text-xs text-zinc-600 sm:grid-cols-2">
                <div className="flex items-center gap-1.5">
                  <Timer className="size-3.5 text-zinc-400" />
                  <span>
                    Session:{" "}
                    <span className="font-semibold text-zinc-800">
                      {device.sessionCountdownSeconds
                        ? `${device.sessionCountdownSeconds}s`
                        : "default"}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Timer className="size-3.5 text-zinc-400" />
                  <span>
                    Payment:{" "}
                    <span className="font-semibold text-zinc-800">
                      {device.paymentCountdownSeconds
                        ? `${device.paymentCountdownSeconds}s`
                        : "default"}
                    </span>
                  </span>
                </div>
                <div className="col-span-2 flex items-center gap-1.5">
                  <span className="text-zinc-500">Theme:</span>
                  <span className="font-medium text-zinc-700">
                    {device.theme || "—"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-500">Frame:</span>
                  <span className="font-medium text-zinc-700">
                    {formatAssignmentList(device.frameTemplates)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-500">Price:</span>
                  <span className="font-medium text-zinc-700">
                    {formatAssignmentList(device.pricingProfiles)}
                  </span>
                </div>
              </div>
              <Progress value={device.battery} />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.message(`${device.name} restart queued`)}
                >
                  <Power className="size-4" /> Restart
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.message(`${device.name} sync queued`)}
                >
                  <RotateCcw className="size-4" /> Sync
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFailedFor(device)}
                >
                  <Printer className="size-4" /> Failed prints
                </Button>
                <Button size="sm" onClick={() => setAssignFor(device)}>
                  <SlidersHorizontal className="size-4" /> Configure
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {data.length === 0 ? (
          <Card className="xl:col-span-2">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Store className="mb-3 size-8 text-zinc-300" />
              <div className="text-sm font-medium text-zinc-500">
                No devices yet
              </div>
              <Button className="mt-3" onClick={() => setCreating(true)}>
                <Plus className="size-4" /> Add device
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {creating ? (
        <BoothFormDialog
          title="Add device"
          initial={EMPTY_BOOTH}
          options={deviceFormOptions}
          submitting={createBooth.isPending}
          onClose={() => setCreating(false)}
          onSubmit={(values) => {
            createBooth.mutate(values, {
              onSuccess: () => {
                toast.success("Device created");
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
        <BoothFormDialog
          title={`Edit ${editing.name}`}
          initial={editing}
          options={deviceFormOptions}
          submitting={updateBooth.isPending}
          onClose={() => setEditing(null)}
          onSubmit={(values) => {
            const {
              battery: _battery,
              appVersion: _appVersion,
              ...editableValues
            } = values;
            void _battery;
            void _appVersion;
            updateBooth.mutate(
              { id: editing.id, patch: editableValues },
              {
                onSuccess: () => {
                  toast.success("Device updated");
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
      {failedFor ? (
        <FailedPrintsDialog
          device={failedFor}
          onClose={() => setFailedFor(null)}
        />
      ) : null}
      {assignFor ? (
        <Dialog
          open
          onOpenChange={(o) => !o && setAssignFor(null)}
          title={`Configure ${assignFor.name}`}
          className="max-w-5xl"
        >
          <div className="max-h-[74vh] space-y-5 overflow-y-auto pr-2">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Theme / layout
              </div>
              {layouts.length === 0 ? (
                <p className="rounded-md border border-dashed border-zinc-200 p-3 text-sm text-zinc-500">
                  No builder themes saved yet. Open the Visual Builder to create
                  one.
                </p>
              ) : (
                <ul className="grid max-h-80 gap-2 overflow-y-auto rounded-md border border-zinc-200 bg-zinc-50 p-2 md:grid-cols-2">
                  {layouts.map((layout) => {
                    const isCurrent = assignFor.theme === layout.name;
                    return (
                      <li
                        key={layout.id}
                        className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 bg-white p-3"
                      >
                        <div>
                          <div className="text-sm font-medium text-zinc-800">
                            {layout.name}
                          </div>
                          <div className="text-xs text-zinc-400">
                            {layout.status}
                            {layout.is_active ? " · live" : ""}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={isCurrent ? "outline" : "default"}
                          disabled={isCurrent || updateBooth.isPending}
                          onClick={() => assignTheme(assignFor, layout.name)}
                        >
                          {isCurrent ? "Assigned" : "Assign"}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <DeviceMultiSelect
                label="Frame templates"
                values={assignFor.frameTemplates}
                emptyLabel="No frame templates yet"
                options={deviceFormOptions.frameTemplates}
                onChange={(values) =>
                  updateDeviceAssignments(
                    assignFor,
                    { frameTemplates: values },
                    "Frame templates updated",
                  )
                }
              />
              <DeviceMultiSelect
                label="Pricing packages"
                values={assignFor.pricingProfiles}
                emptyLabel="No active pricing packages yet"
                options={deviceFormOptions.pricingProfiles}
                onChange={(values) =>
                  updateDeviceAssignments(
                    assignFor,
                    { pricingProfiles: values },
                    "Pricing packages updated",
                  )
                }
              />
            </div>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}

function BoothFormDialog({
  title,
  initial,
  options,
  submitting,
  onClose,
  onSubmit,
}: {
  title: string;
  initial: BoothInput | Device;
  options: DeviceFormOptions;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: BoothInput) => void;
}) {
  const [form, setForm] = useState<BoothInput>(() => {
    const { id: _ignored, ...rest } = initial as Device;
    void _ignored;
    return {
      ...rest,
      frameTemplates: normalizeStringList(rest.frameTemplates, rest.template),
      pricingProfiles: normalizeStringList(
        rest.pricingProfiles,
        rest.pricingProfile,
      ),
    } as BoothInput;
  });

  // Modern Hardware & Printer State Mockups
  const [printerConn, setPrinterConn] = useState("usb");
  const [paperWidth, setPaperWidth] = useState("80mm");
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [density, setDensity] = useState(8);
  const [sharpness, setSharpness] = useState(5);
  const [mirrorCamera, setMirrorCamera] = useState(true);
  const [resolution, setResolution] = useState("1080p");
  const [debugLogs, setDebugLogs] = useState(false);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={title}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.name.trim() || !form.location.trim()) {
            toast.error("Name and location are required");
            return;
          }
          onSubmit(form);
        }}
      >
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="mb-4 grid w-full grid-cols-3">
            <TabsTrigger value="general">General & Content</TabsTrigger>
            <TabsTrigger value="timers">Session & Timers</TabsTrigger>
            <TabsTrigger value="hardware">Hardware & Printer</TabsTrigger>
          </TabsList>

          {/* TAB 1: GENERAL & CONTENT */}
          <TabsContent
            value="general"
            className="grid gap-3 md:grid-cols-2 min-h-[340px]"
          >
            <label className="block text-xs font-medium text-zinc-600">
              Name
              <Input
                className="mt-1"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Device 01"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Location
              <Input
                className="mt-1"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="PVJ Bandung"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Status
              <Select
                className="mt-1"
                value={form.status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.value as Device["status"],
                  })
                }
              >
                <option value="online">online</option>
                <option value="offline">offline</option>
                <option value="maintenance">maintenance</option>
              </Select>
            </label>
            <div className="block text-xs font-medium text-zinc-600">
              App version
              <div className="mt-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-700">
                {form.appVersion || "Waiting for device sync"}
              </div>
              <p className="mt-1 text-[10px] font-normal text-zinc-400">
                App version is reported by the kiosk device and cannot be edited
                manually.
              </p>
            </div>
            <label className="block text-xs font-medium text-zinc-600">
              Last sync
              <Input
                className="mt-1"
                value={form.lastSync}
                onChange={(e) => setForm({ ...form, lastSync: e.target.value })}
                placeholder="5 minutes ago"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Theme
              <Select
                className="mt-1"
                value={form.theme}
                onChange={(e) => setForm({ ...form, theme: e.target.value })}
              >
                <option value="">Use default theme</option>
                {includeCurrentOption(options.themes, form.theme).map(
                  (theme) => (
                    <option key={theme} value={theme}>
                      {theme}
                    </option>
                  ),
                )}
              </Select>
            </label>
            <div className="block text-xs font-medium text-zinc-600">
              Frame templates
              <DeviceMultiSelect
                className="mt-1"
                values={form.frameTemplates}
                emptyLabel="No frame templates yet"
                options={includeCurrentOptions(
                  options.frameTemplates,
                  form.frameTemplates,
                )}
                onChange={(values) =>
                  setForm({
                    ...form,
                    frameTemplates: values,
                    template: values[0] ?? "",
                  })
                }
              />
            </div>
            <div className="md:col-span-2 block text-xs font-medium text-zinc-600">
              Pricing packages
              <DeviceMultiSelect
                className="mt-1"
                values={form.pricingProfiles}
                emptyLabel="No active pricing packages yet"
                options={includeCurrentOptions(
                  options.pricingProfiles,
                  form.pricingProfiles,
                )}
                onChange={(values) =>
                  setForm({
                    ...form,
                    pricingProfiles: values,
                    pricingProfile: values[0] ?? "",
                  })
                }
              />
            </div>
          </TabsContent>

          {/* TAB 2: SESSION & TIMERS */}
          <TabsContent value="timers" className="space-y-4 min-h-[340px]">
            <div className="rounded-md border border-dashed border-zinc-200 p-3 bg-zinc-50/50">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <Timer className="size-3.5" /> Countdown overrides (optional)
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block text-xs font-medium text-zinc-600">
                  Session countdown (seconds)
                  <Input
                    className="mt-1 bg-white"
                    type="number"
                    min={30}
                    max={1800}
                    placeholder="e.g. 300 (5 min) — leave empty for default"
                    value={form.sessionCountdownSeconds ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        sessionCountdownSeconds:
                          e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                  <span className="mt-1 block text-[10px] text-zinc-400">
                    30s – 30min · total time for template → thanks flow
                  </span>
                </label>
                <label className="block text-xs font-medium text-zinc-600">
                  Payment countdown (seconds)
                  <Input
                    className="mt-1 bg-white"
                    type="number"
                    min={10}
                    max={600}
                    placeholder="e.g. 60 — leave empty to use default"
                    value={form.paymentCountdownSeconds ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        paymentCountdownSeconds:
                          e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </label>
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: HARDWARE & PRINTER */}
          <TabsContent
            value="hardware"
            className="space-y-4 min-h-[340px] max-h-[420px] overflow-y-auto pr-1"
          >
            {/* PRINTER SETTINGS SECTION */}
            <div className="rounded-lg border border-zinc-200 p-3 bg-zinc-50/30">
              <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                <Printer className="size-3.5" /> Printer Parameters
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block text-xs font-medium text-zinc-600">
                  Connection Mode
                  <Select
                    className="mt-1"
                    value={printerConn}
                    onChange={(e) => setPrinterConn(e.target.value)}
                  >
                    <option value="usb">USB OTG Cable (Direct)</option>
                    <option value="bluetooth">Bluetooth (Wireless)</option>
                    <option value="wifi">Network (TCP/IP socket)</option>
                  </Select>
                </label>

                <label className="block text-xs font-medium text-zinc-600">
                  Paper Size Width
                  <Select
                    className="mt-1"
                    value={paperWidth}
                    onChange={(e) => setPaperWidth(e.target.value)}
                  >
                    <option value="80mm">80mm Paper width (Premium)</option>
                    <option value="58mm">58mm Paper width (Standard)</option>
                  </Select>
                </label>

                <div className="md:col-span-2 grid gap-3 md:grid-cols-2 border-t border-zinc-100 pt-3 mt-1">
                  <label className="block text-xs font-medium text-zinc-600">
                    Brightness: {brightness > 0 ? `+${brightness}` : brightness}
                    %
                    <Slider
                      min={-50}
                      max={50}
                      value={brightness}
                      onChange={(e) => setBrightness(Number(e.target.value))}
                    />
                  </label>

                  <label className="block text-xs font-medium text-zinc-600">
                    Contrast: {contrast > 0 ? `+${contrast}` : contrast}%
                    <Slider
                      min={-50}
                      max={50}
                      value={contrast}
                      onChange={(e) => setContrast(Number(e.target.value))}
                    />
                  </label>

                  <label className="block text-xs font-medium text-zinc-600">
                    Density (Darkness): {density}
                    <Slider
                      min={1}
                      max={15}
                      value={density}
                      onChange={(e) => setDensity(Number(e.target.value))}
                    />
                  </label>

                  <label className="block text-xs font-medium text-zinc-600">
                    Sharpness: {sharpness}
                    <Slider
                      min={0}
                      max={10}
                      value={sharpness}
                      onChange={(e) => setSharpness(Number(e.target.value))}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* CAMERA OPTIONS SECTION */}
            <div className="rounded-lg border border-zinc-200 p-3 bg-zinc-50/30">
              <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                <SlidersHorizontal className="size-3.5" /> Camera & Diagnostics
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex items-center justify-between gap-3 rounded-md border border-zinc-100 bg-white p-2.5">
                  <div>
                    <span className="block text-xs font-medium text-zinc-700">
                      Mirror Camera Feed
                    </span>
                    <span className="block text-[10px] text-zinc-400">
                      Flips user selfie live view
                    </span>
                  </div>
                  <Switch
                    checked={mirrorCamera}
                    onCheckedChange={setMirrorCamera}
                  />
                </label>

                <label className="block text-xs font-medium text-zinc-600">
                  Target Live View Resolution
                  <Select
                    className="mt-1"
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                  >
                    <option value="720p">HD (720p @ 30fps)</option>
                    <option value="1080p">Full HD (1080p @ 30fps)</option>
                    <option value="4k">Ultra HD (4K @ 15fps)</option>
                  </Select>
                </label>

                <label className="flex items-center justify-between gap-3 rounded-md border border-zinc-100 bg-white p-2.5 md:col-span-2">
                  <div>
                    <span className="block text-xs font-medium text-zinc-700">
                      Enable Diagnostics Debug Mode
                    </span>
                    <span className="block text-[10px] text-zinc-400">
                      Prints verbose connection errors on Kiosk UI
                    </span>
                  </div>
                  <Switch checked={debugLogs} onCheckedChange={setDebugLogs} />
                </label>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100 mt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function includeCurrentOption(options: string[], currentValue?: string | null) {
  if (!currentValue || options.includes(currentValue)) return options;
  return [currentValue, ...options];
}

function getSubscriptionPlanOptions(plans: SubscriptionPlan[]) {
  const normalizedPlans =
    plans.length > 0
      ? plans
      : pricingPlans.map((plan) => ({
          id: plan.id,
          name: plan.name,
          durationMonths: plan.durationMonths,
          basePrice: plan.amount,
          includedDevices: plan.includedDevices,
        }));

  return [
    { id: "free", label: "Free Account", description: "1 device" },
    ...normalizedPlans.map((plan) => ({
      id: plan.id,
      label: plan.name,
      description: `${plan.durationMonths} month${plan.durationMonths > 1 ? "s" : ""} · ${formatCurrency(plan.basePrice)} · ${plan.includedDevices} device${plan.includedDevices > 1 ? "s" : ""} included`,
    })),
  ];
}

function includeCurrentOptions(
  options: string[],
  currentValues?: string[] | null,
) {
  const values = normalizeStringList(currentValues);
  return [...values.filter((value) => !options.includes(value)), ...options];
}

function normalizeStringList(
  values?: string[] | null,
  fallback?: string | null,
) {
  const list = Array.isArray(values)
    ? values.map((value) => value.trim()).filter(Boolean)
    : [];
  if (list.length > 0) return Array.from(new Set(list));
  return fallback?.trim() ? [fallback.trim()] : [];
}

function formatAssignmentList(
  values?: string[] | null,
  fallback?: string | null,
) {
  const list = normalizeStringList(values, fallback);
  if (list.length === 0) return "—";
  if (list.length <= 2) return list.join(", ");
  return `${list.slice(0, 2).join(", ")} +${list.length - 2}`;
}

function DeviceMultiSelect({
  label,
  values,
  emptyLabel,
  options,
  className,
  onChange,
}: {
  label?: string;
  values: string[];
  emptyLabel: string;
  options: string[];
  className?: string;
  onChange: (values: string[]) => void;
}) {
  const selectedValues = normalizeStringList(values);
  const normalizedOptions = includeCurrentOptions(options, selectedValues);

  const toggleValue = (option: string) => {
    if (selectedValues.includes(option)) {
      onChange(selectedValues.filter((value) => value !== option));
      return;
    }
    onChange([...selectedValues, option]);
  };

  return (
    <div className={cn("block text-xs font-medium text-zinc-600", className)}>
      {label ? <div>{label}</div> : null}
      <div className="mt-1 max-h-48 overflow-y-auto rounded-md border border-zinc-200 bg-white p-1.5 shadow-sm">
        {normalizedOptions.length === 0 ? (
          <div className="px-2 py-1.5 text-xs font-normal text-zinc-400">
            {emptyLabel}
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {normalizedOptions.map((option) => {
              const selected = selectedValues.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleValue(option)}
                  className={cn(
                    "inline-flex min-h-8 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                    selected
                      ? "border-zinc-950 bg-zinc-950 text-white"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400 hover:text-zinc-950",
                  )}
                >
                  {selected ? <Check className="size-3.5" /> : null}
                  {option}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {selectedValues.length > 0 ? (
        <div className="mt-1 text-[10px] font-normal text-zinc-400">
          {selectedValues.length} selected
        </div>
      ) : null}
    </div>
  );
}

function FailedPrintsDialog({
  device,
  onClose,
}: {
  device: Device;
  onClose: () => void;
}) {
  const { data = [], isLoading, refetch } = useFailedPrintsByBooth(device.name);
  const retry = useRetryPrint();

  const handleRetry = (transactionId: string) => {
    retry.mutate(transactionId, {
      onSuccess: () => {
        toast.success("Reprint queued");
        void refetch();
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : "Reprint failed"),
    });
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Failed prints — ${device.name}`}
    >
      {isLoading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-zinc-500">
          <Printer className="size-6 text-zinc-300" />
          No failed or pending prints right now.
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-zinc-500">
                    {tx.id}
                  </span>
                  <Badge
                    variant={
                      tx.printStatus === "failed"
                        ? "destructive"
                        : tx.printStatus === "reprinting"
                          ? "warning"
                          : "secondary"
                    }
                  >
                    {tx.printStatus}
                  </Badge>
                  <span className="text-[11px] text-zinc-400">
                    attempts: {tx.printAttempts}
                  </span>
                </div>
                <div className="mt-1 truncate text-sm font-medium text-zinc-800">
                  {tx.packageName} · {formatCurrency(tx.amount)}
                </div>
                <div className="text-[11px] text-zinc-500">
                  {tx.createdAt}
                  {tx.printLastError ? ` · ${tx.printLastError}` : ""}
                </div>
              </div>
              <Button
                size="sm"
                disabled={retry.isPending || tx.printStatus === "reprinting"}
                onClick={() => handleRetry(tx.id)}
              >
                <Printer className="size-3.5" />
                {tx.printStatus === "reprinting" ? "Queued…" : "Reprint"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </Dialog>
  );
}

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
    () => Array.from(new Set(data.map((a) => a.folder))).sort(),
    [data],
  );
  const tags = useMemo(
    () => Array.from(new Set(data.map((a) => a.tag))).sort(),
    [data],
  );

  const filtered = useMemo(
    () =>
      data.filter((a) => {
        const matchSearch =
          search.trim() === "" ||
          a.name.toLowerCase().includes(search.toLowerCase()) ||
          a.folder.toLowerCase().includes(search.toLowerCase());
        const matchFolder = folderFilter === "all" || a.folder === folderFilter;
        const matchTag = tagFilter === "all" || a.tag === tagFilter;
        return matchSearch && matchFolder && matchTag;
      }),
    [data, search, folderFilter, tagFilter],
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

function AssetUploadDialog({
  initial,
  submitting,
  onClose,
  onSubmit,
}: {
  initial: AssetInput;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: AssetInput) => void;
}) {
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

function AssetEditDialog({
  asset,
  submitting,
  onClose,
  onSubmit,
}: {
  asset: AssetItem;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (patch: Partial<AssetInput>) => void;
}) {
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

export function AnalyticsDashboard() {
  const { data } = useDashboardData();
  const router = useRouter();
  const chartsMounted = useClientMounted();
  const posSummary = data?.posSummary;
  const dailySales = posSummary?.dailySales ?? [];
  const topPackages = posSummary?.topPackages ?? [];
  const paymentBreakdown = posSummary?.paymentBreakdown ?? [];
  const recentSales = posSummary?.recentSales ?? [];
  const totalRevenue = posSummary?.totalRevenue ?? 0;
  const totalTransactions = posSummary?.totalTransactions ?? 0;
  const totalPrints = posSummary?.totalPrints ?? 0;
  const averageTransaction = posSummary?.averageTransaction ?? 0;

  return (
    <div>
      <PageHeader
        title="POS Kasir Insights"
        description="Ringkasan penjualan, paket, metode pembayaran, dan print dari transaksi POS Kasir."
        action={
          <Button variant="outline" onClick={() => router.push("/pos")}>
            <Download className="size-4" /> Buka POS Kasir
          </Button>
        }
      />
      <div className="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total pendapatan", formatCurrency(totalRevenue)],
          ["Total transaksi", totalTransactions.toLocaleString("id-ID")],
          ["Total print", totalPrints.toLocaleString("id-ID")],
          ["Rata-rata transaksi", formatCurrency(averageTransaction)],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardHeader>
              <CardTitle className="text-xs text-zinc-500">{label}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {value}
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Penjualan 7 hari</CardTitle>
            <CardDescription>
              Omzet harian dari transaksi POS Kasir.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {chartsMounted && dailySales.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailySales}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis dataKey="label" />
                  <YAxis
                    tickFormatter={(value) => `${Number(value) / 1000}rb`}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                  <Bar dataKey="revenue" fill="#18181b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50 text-center text-sm text-zinc-500">
                Belum ada data penjualan POS.
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Metode pembayaran</CardTitle>
            <CardDescription>Cash dan QRIS dari transaksi POS.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {paymentBreakdown.length > 0 ? (
              paymentBreakdown.map((payment) => (
                <div
                  key={payment.method}
                  className="rounded-lg border border-zinc-100 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{payment.method}</div>
                    <Badge variant="outline">
                      {payment.transactions} transaksi
                    </Badge>
                  </div>
                  <div className="mt-2 text-2xl font-semibold">
                    {formatCurrency(payment.revenue)}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
                Belum ada metode pembayaran tercatat.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Paket terlaris</CardTitle>
            <CardDescription>
              Paket print dengan kontribusi pendapatan terbesar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topPackages.length > 0 ? (
              topPackages.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between rounded-lg border border-zinc-100 p-3"
                >
                  <div>
                    <div className="text-sm font-medium">{item.name}</div>
                    <div className="text-xs text-zinc-500">
                      {item.transactions} transaksi · {item.prints} print
                    </div>
                  </div>
                  <div className="text-right text-sm font-semibold">
                    {formatCurrency(item.revenue)}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
                Paket akan muncul setelah transaksi POS tersimpan.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transaksi terbaru</CardTitle>
            <CardDescription>
              Data terakhir yang masuk dari POS Kasir.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentSales.length > 0 ? (
              recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-100 p-3"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {sale.packageName}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {sale.printCount} print · {sale.paymentMethod} ·{" "}
                      {sale.createdAt}
                    </div>
                  </div>
                  <div className="text-right text-sm font-semibold">
                    {formatCurrency(sale.amount)}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
                Belum ada transaksi POS.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const EMPTY_TENANT: TenantInput = {
  name: "",
  plan: "Free",
  status: "active",
  devices: 0,
  users: 1,
  renewalDate: new Date().toISOString().slice(0, 10),
  planId: "free",
  subscriptionStatus: "free",
  subscriptionExpiresAt: null,
  deviceLimit: 1,
};

export function TenantManagement() {
  const { data = [] } = useTenants();
  const { data: profiles = [], isLoading: isLoadingProfiles } = useProfiles();
  const { data: subscriptionPlans = [] } = useSubscriptionPlans();
  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant();
  const deleteTenant = useDeleteTenant();
  const updateProfile = useUpdateProfile();

  const [editing, setEditing] = useState<Organization | null>(null);
  const [editingProfile, setEditingProfile] = useState<AdminUserProfile | null>(
    null,
  );
  const [creating, setCreating] = useState(false);
  const confirmDelete = useConfirmDialog();

  const handleDelete = (organization: Organization) => {
    confirmDelete.confirm({
      title: "Delete organization?",
      description: `Delete organization "${organization.name}"?`,
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: () => {
        deleteTenant.mutate(organization.id, {
          onSuccess: () => toast.success("Organization deleted"),
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
        title="Super Admin Dashboard"
        description="Multi-organization SaaS controls and registered user accounts."
        action={
          <Button onClick={() => setCreating(true)}>
            <Users className="size-4" /> Create organization
          </Button>
        }
      />
      <Tabs defaultValue="organizations">
        <TabsList className="mb-4">
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="users">Registered Users</TabsTrigger>
          <TabsTrigger value="saas-pricing">SaaS Pricing</TabsTrigger>
          <TabsTrigger value="payment-gateway">Payment Gateway</TabsTrigger>
        </TabsList>
        <TabsContent value="organizations">
          <Card>
            <CardContent className="pt-5">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Subscription Status</TableHead>
                    <TableHead>Org Status</TableHead>
                    <TableHead>Devices</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Renewal / Expiration</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((organization) => (
                    <TableRow key={organization.id}>
                      <TableCell className="font-medium">
                        {organization.name}
                      </TableCell>
                      <TableCell>{organization.plan}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            organization.subscriptionStatus === "active"
                              ? "success"
                              : organization.subscriptionStatus ===
                                    "trialing" ||
                                  organization.subscriptionStatus === "trial"
                                ? "warning"
                                : "secondary"
                          }
                        >
                          {organization.subscriptionStatus || "free"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            organization.status === "active"
                              ? "outline"
                              : "secondary"
                          }
                        >
                          {organization.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {organization.devices} / {organization.deviceLimit ?? 1}
                      </TableCell>
                      <TableCell>{organization.users}</TableCell>
                      <TableCell>
                        {organization.subscriptionExpiresAt
                          ? new Date(
                              organization.subscriptionExpiresAt,
                            ).toLocaleDateString()
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu
                          items={[
                            {
                              label: "Edit",
                              onClick: () => setEditing(organization),
                            },
                            {
                              label: "Delete",
                              destructive: true,
                              onClick: () => handleDelete(organization),
                            },
                          ]}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="py-8 text-center text-sm text-zinc-400"
                      >
                        No organizations yet. Click{" "}
                        <strong>Create organization</strong>.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Accounts</CardTitle>
              <CardDescription>
                All user accounts across the system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>System Role</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Joined At</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(profiles as AdminUserProfile[]).map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">
                        {profile.email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            profile.role === "admin" ? "warning" : "secondary"
                          }
                        >
                          {profile.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-zinc-600">
                        {profile.organizationName || "None"}
                      </TableCell>
                      <TableCell>
                        {new Date(profile.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingProfile(profile)}
                        >
                          Edit User
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {profiles.length === 0 && !isLoadingProfiles && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-zinc-500 py-8"
                      >
                        No users found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="saas-pricing">
          <SaasPricingManagement />
        </TabsContent>
        <TabsContent value="payment-gateway">
          <PaymentGatewayManagement />
        </TabsContent>
      </Tabs>

      {creating ? (
        <TenantFormDialog
          title="Create organization"
          initial={EMPTY_TENANT}
          subscriptionPlans={subscriptionPlans}
          submitting={createTenant.isPending}
          onClose={() => setCreating(false)}
          onSubmit={(values) => {
            createTenant.mutate(values, {
              onSuccess: () => {
                toast.success("Organization created");
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
        <TenantFormDialog
          title={`Edit ${editing.name}`}
          initial={editing}
          subscriptionPlans={subscriptionPlans}
          submitting={updateTenant.isPending}
          onClose={() => setEditing(null)}
          onSubmit={(values) => {
            updateTenant.mutate(
              { id: editing.id, patch: values },
              {
                onSuccess: () => {
                  toast.success("Organization updated");
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

      {editingProfile ? (
        <Dialog
          open
          onOpenChange={(o) => !o && setEditingProfile(null)}
          title={`Edit ${editingProfile.email}`}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                System Role
              </label>
              <Select
                className="mt-1"
                value={editingProfile.role}
                onChange={(e) =>
                  setEditingProfile({ ...editingProfile, role: e.target.value })
                }
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Organization
              </label>
              <Select
                className="mt-1"
                value={editingProfile.organizationId || ""}
                onChange={(e) =>
                  setEditingProfile({
                    ...editingProfile,
                    organizationId: e.target.value || null,
                  })
                }
              >
                <option value="">No Organization</option>
                {data.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100">
              <Button variant="outline" onClick={() => setEditingProfile(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  updateProfile.mutate(
                    {
                      id: editingProfile.id,
                      patch: { role: editingProfile.role },
                      organizationId: editingProfile.organizationId,
                    },
                    {
                      onSuccess: () => {
                        toast.success("User updated successfully");
                        setEditingProfile(null);
                      },
                      onError: (err) =>
                        toast.error(
                          err instanceof Error
                            ? err.message
                            : "Failed to update user",
                        ),
                    },
                  );
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}

type SubscriptionGatewayMode = "duitku" | "midtrans" | "both";

function PaymentGatewayManagement() {
  const [gateway, setGateway] = useState<SubscriptionGatewayMode>("duitku");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadGateway() {
      try {
        const response = await fetch("/api/admin/payment-gateway", {
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as {
          gateway?: SubscriptionGatewayMode;
          message?: string;
        } | null;

        if (!response.ok) {
          throw new Error(payload?.message ?? "Unable to load payment gateway");
        }

        if (!cancelled) {
          setGateway(payload?.gateway ?? "duitku");
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Unable to load payment gateway",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadGateway();

    return () => {
      cancelled = true;
    };
  }, []);

  const saveGateway = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/payment-gateway", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gateway }),
      });
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to save payment gateway");
      }

      toast.success("Subscription payment gateway updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const gatewayCards: Array<{
    value: SubscriptionGatewayMode;
    title: string;
    description: string;
    badge: string;
  }> = [
    {
      value: "duitku",
      title: "Duitku only",
      description: "Checkout hanya menampilkan dan memakai Duitku.",
      badge: "Active gateway",
    },
    {
      value: "midtrans",
      title: "Midtrans only",
      description: "Checkout hanya menampilkan dan memakai Midtrans Snap.",
      badge: "Alternative gateway",
    },
    {
      value: "both",
      title: "Duitku + Midtrans",
      description:
        "Checkout menampilkan kedua gateway sebagai pilihan pelanggan.",
      badge: "Alternative gateway",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription Payment Gateway</CardTitle>
        <CardDescription>
          Super Admin controls which payment gateway appears on the subscription
          checkout page.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 lg:grid-cols-3">
          {gatewayCards.map((item) => {
            const selected = gateway === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setGateway(item.value)}
                disabled={loading || saving}
                className={cn(
                  "rounded-lg border p-4 text-left transition",
                  selected
                    ? "border-zinc-950 bg-zinc-950 text-white shadow-sm"
                    : "border-zinc-200 bg-white text-zinc-950 hover:border-zinc-300",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="grid size-10 place-items-center rounded-md border border-current/15 bg-current/5">
                    <CreditCard className="size-5" />
                  </div>
                  {selected ? <Check className="size-5" /> : null}
                </div>
                <div className="mt-4 text-sm font-semibold">{item.title}</div>
                <div
                  className={cn(
                    "mt-2 text-xs leading-5",
                    selected ? "text-zinc-300" : "text-zinc-500",
                  )}
                >
                  {item.description}
                </div>
                <div
                  className={cn(
                    "mt-4 inline-flex rounded-full px-2 py-1 text-[11px] font-medium",
                    selected
                      ? "bg-white/10 text-white"
                      : "bg-zinc-100 text-zinc-600",
                  )}
                >
                  {item.badge}
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-600">
          Current checkout mode:{" "}
          <span className="font-medium text-zinc-950">
            {gateway === "both"
              ? "Duitku + Midtrans"
              : gateway === "midtrans"
                ? "Midtrans only"
                : "Duitku only"}
          </span>
          . Server-side checkout validation also follows this setting, so hidden
          gateways cannot be forced from the browser form.
        </div>

        <Button onClick={() => void saveGateway()} disabled={loading || saving}>
          <ShieldCheck className="size-4" />
          {saving ? "Saving..." : "Save gateway setting"}
        </Button>
      </CardContent>
    </Card>
  );
}

function SaasPricingManagement() {
  const { data: plans = [], isLoading } = useSubscriptionPlans();
  const updatePlan = useUpdateSubscriptionPlan();
  const [editing, setEditing] = useState<SubscriptionPlan | null>(null);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>SaaS Subscription Pricing</CardTitle>
          <CardDescription>
            Manage public subscription prices, durations, included devices, and
            additional device add-on pricing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Base price</TableHead>
                <TableHead>Included</TableHead>
                <TableHead>Add-on</TableHead>
                <TableHead>Public</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell>
                    <div className="font-medium">{plan.name}</div>
                    <div className="text-xs text-zinc-400">{plan.id}</div>
                  </TableCell>
                  <TableCell>
                    {plan.durationMonths} month
                    {plan.durationMonths > 1 ? "s" : ""}
                  </TableCell>
                  <TableCell>{formatCurrency(plan.basePrice)}</TableCell>
                  <TableCell>
                    {plan.includedDevices} device
                    {plan.includedDevices > 1 ? "s" : ""}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(plan.additionalDevicePriceMonthly)}
                    /device/month
                  </TableCell>
                  <TableCell>
                    <Badge variant={plan.isPublic ? "success" : "secondary"}>
                      {plan.isPublic ? "Public" : "Hidden"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditing(plan)}
                    >
                      <Edit2 className="size-4" /> Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {plans.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-sm text-zinc-400"
                  >
                    {isLoading
                      ? "Loading subscription plans..."
                      : "No subscription plans found."}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editing ? (
        <SubscriptionPlanDialog
          plan={editing}
          submitting={updatePlan.isPending}
          onClose={() => setEditing(null)}
          onSubmit={(values) => {
            updatePlan.mutate(
              { id: editing.id, values },
              {
                onSuccess: () => {
                  toast.success("SaaS pricing updated");
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

function SubscriptionPlanDialog({
  plan,
  submitting,
  onClose,
  onSubmit,
}: {
  plan: SubscriptionPlan;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: {
    name: string;
    durationMonths: number;
    basePrice: number;
    includedDevices: number;
    additionalDevicePriceMonthly: number;
    isPublic: boolean;
  }) => void;
}) {
  const [form, setForm] = useState({
    name: plan.name,
    durationMonths: plan.durationMonths,
    basePrice: plan.basePrice,
    includedDevices: plan.includedDevices,
    additionalDevicePriceMonthly: plan.additionalDevicePriceMonthly,
    isPublic: plan.isPublic,
  });

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Edit ${plan.name}`}
    >
      <form
        className="grid gap-3 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!form.name.trim()) {
            toast.error("Plan name is required");
            return;
          }
          if (form.durationMonths < 1 || form.includedDevices < 1) {
            toast.error("Duration and included devices must be at least 1");
            return;
          }
          onSubmit(form);
        }}
      >
        <label className="md:col-span-2 block text-xs font-medium text-zinc-600">
          Plan name
          <Input
            className="mt-1"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Duration months
          <Input
            className="mt-1"
            type="number"
            min={1}
            value={form.durationMonths}
            onChange={(event) =>
              setForm({
                ...form,
                durationMonths: Math.max(1, Number(event.target.value) || 1),
              })
            }
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Base price (IDR)
          <Input
            className="mt-1"
            type="number"
            min={0}
            step={1000}
            value={form.basePrice}
            onChange={(event) =>
              setForm({
                ...form,
                basePrice: Math.max(0, Number(event.target.value) || 0),
              })
            }
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Included devices
          <Input
            className="mt-1"
            type="number"
            min={1}
            value={form.includedDevices}
            onChange={(event) =>
              setForm({
                ...form,
                includedDevices: Math.max(1, Number(event.target.value) || 1),
              })
            }
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Additional device price/month
          <Input
            className="mt-1"
            type="number"
            min={0}
            step={1000}
            value={form.additionalDevicePriceMonthly}
            onChange={(event) =>
              setForm({
                ...form,
                additionalDevicePriceMonthly: Math.max(
                  0,
                  Number(event.target.value) || 0,
                ),
              })
            }
          />
        </label>
        <div className="md:col-span-2 flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <div>
            <div className="text-sm font-medium text-zinc-800">Public plan</div>
            <div className="text-xs leading-5 text-zinc-500">
              Hidden plans stay in database but should not be shown in public
              checkout flows.
            </div>
          </div>
          <Switch
            checked={form.isPublic}
            onCheckedChange={(checked) =>
              setForm({ ...form, isPublic: checked })
            }
          />
        </div>
        <div className="md:col-span-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs leading-5 text-zinc-500">
          Preview: {formatCurrency(form.basePrice)} for {form.durationMonths}{" "}
          month
          {form.durationMonths > 1 ? "s" : ""}, includes {form.includedDevices}{" "}
          device
          {form.includedDevices > 1 ? "s" : ""}. Extra devices cost{" "}
          {formatCurrency(form.additionalDevicePriceMonthly)}/device/month.
        </div>
        <div className="md:col-span-2 flex justify-end gap-2 border-t border-zinc-100 pt-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Save pricing"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function TenantFormDialog({
  title,
  initial,
  subscriptionPlans,
  submitting,
  onClose,
  onSubmit,
}: {
  title: string;
  initial: TenantInput | Organization;
  subscriptionPlans: SubscriptionPlan[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: TenantInput) => void;
}) {
  const [form, setForm] = useState<TenantInput>(() => {
    const { id: _ignored, ...rest } = initial as Organization;
    void _ignored;
    return {
      name: rest.name || "",
      plan: rest.plan || "Free",
      status: rest.status || "active",
      devices: rest.devices || 0,
      users: rest.users || 1,
      renewalDate: rest.renewalDate || new Date().toISOString().slice(0, 10),
      planId: rest.planId || "free",
      subscriptionStatus: rest.subscriptionStatus || "free",
      subscriptionExpiresAt: rest.subscriptionExpiresAt || null,
      deviceLimit: rest.deviceLimit || 1,
    } as TenantInput;
  });
  const selectedSubscriptionPlan = subscriptionPlans.find(
    (plan) => plan.id === form.planId,
  );
  const fallbackPlan = pricingPlans.find((plan) => plan.id === form.planId);
  const includedDeviceCount =
    selectedSubscriptionPlan?.includedDevices ??
    fallbackPlan?.includedDevices ??
    1;
  const planOptions = getSubscriptionPlanOptions(subscriptionPlans);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={title}>
      <form
        className="grid gap-3 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.name.trim()) {
            toast.error("Name is required");
            return;
          }
          if ((form.deviceLimit ?? 1) < 1) {
            toast.error("Device limit must be at least 1");
            return;
          }
          if ((form.devices ?? 0) > (form.deviceLimit ?? 1)) {
            toast.error("Device limit cannot be lower than existing devices");
            return;
          }
          onSubmit(form);
        }}
      >
        <label className="md:col-span-2 block text-xs font-medium text-zinc-600">
          Organization Name
          <Input
            className="mt-1"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="PT Photo Device Indonesia"
          />
        </label>

        <label className="block text-xs font-medium text-zinc-600">
          Subscription Plan
          <Select
            className="mt-1"
            value={form.planId || "free"}
            onChange={(e) => {
              const val = e.target.value;
              const selected =
                subscriptionPlans.find((plan) => plan.id === val) ??
                pricingPlans.find((plan) => plan.id === val);
              const includedDevices = selected?.includedDevices ?? 1;
              setForm({
                ...form,
                planId: val,
                plan: val === "free" ? "Free" : (selected?.name ?? "Free"),
                subscriptionStatus:
                  val === "free"
                    ? "free"
                    : form.subscriptionStatus === "free"
                      ? "active"
                      : form.subscriptionStatus,
                deviceLimit: Math.max(includedDevices, form.devices ?? 0),
              });
            }}
          >
            {planOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label} ({option.description})
              </option>
            ))}
          </Select>
        </label>

        <label className="block text-xs font-medium text-zinc-600">
          Subscription Status
          <Select
            className="mt-1"
            value={form.subscriptionStatus || "free"}
            onChange={(e) =>
              setForm({ ...form, subscriptionStatus: e.target.value })
            }
          >
            <option value="free">Free</option>
            <option value="active">Active</option>
            <option value="trialing">Trialing</option>
            <option value="past_due">Past Due</option>
            <option value="canceled">Canceled</option>
          </Select>
        </label>

        <label className="block text-xs font-medium text-zinc-600">
          Workspace Status (Platform level)
          <Select
            className="mt-1"
            value={form.status}
            onChange={(e) =>
              setForm({
                ...form,
                status: e.target.value as Organization["status"],
              })
            }
          >
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="paused">Paused</option>
          </Select>
        </label>

        <label className="block text-xs font-medium text-zinc-600">
          Subscription Expiry Date
          <Input
            className="mt-1"
            type="date"
            value={
              form.subscriptionExpiresAt
                ? new Date(form.subscriptionExpiresAt)
                    .toISOString()
                    .slice(0, 10)
                : ""
            }
            onChange={(e) =>
              setForm({
                ...form,
                subscriptionExpiresAt: e.target.value
                  ? new Date(e.target.value).toISOString()
                  : null,
              })
            }
          />
        </label>

        <label className="block text-xs font-medium text-zinc-600">
          Paid Device Limit
          <Input
            className="mt-1"
            type="number"
            min={1}
            value={form.deviceLimit ?? 1}
            onChange={(e) =>
              setForm({
                ...form,
                deviceLimit: Math.max(1, Number(e.target.value) || 1),
              })
            }
          />
        </label>

        <div className="md:col-span-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-[11px] leading-5 text-zinc-500">
          {selectedSubscriptionPlan
            ? `${selectedSubscriptionPlan.name} includes ${includedDeviceCount} device${includedDeviceCount > 1 ? "s" : ""}. `
            : "Free Account includes 1 device. "}
          Additional devices are billed at Rp 50K/device/month and should be
          reflected in this paid device limit.
        </div>

        <div className="md:col-span-2 flex justify-end gap-2 pt-2 border-t border-zinc-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

type SettingsForm = {
  // Flutter operational
  merchant_name: string;
  qris_payload_prefix: string;
  share_base_url: string;
  countdown_duration_seconds: number;
  flash_duration_ms: number;
  auto_return_duration_seconds: number;
  default_template_id: string;
  // Payment
  qris_provider_merchant_id: string;
  qris_webhook_secret: string;
  qris_auto_retry: boolean;
  subscription_payment_gateway: SubscriptionGatewayMode;
  // Device
  printer_name: string;
  booth_timeout_seconds: number;
  // Media
  download_expiry_hours: number;
  gallery_retention_days: number;
  storage_provider: string;
  watermark_enabled: boolean;
  // System
  maintenance_mode: boolean;
};

const DEFAULT_SETTINGS_FORM: SettingsForm = {
  merchant_name: "",
  qris_payload_prefix: "",
  share_base_url: "",
  countdown_duration_seconds: 3,
  flash_duration_ms: 220,
  auto_return_duration_seconds: 8,
  default_template_id: "",
  qris_provider_merchant_id: "",
  qris_webhook_secret: "",
  qris_auto_retry: true,
  subscription_payment_gateway: "duitku",
  printer_name: "POSKART-THERMAL-01",
  booth_timeout_seconds: 90,
  download_expiry_hours: 72,
  gallery_retention_days: 30,
  storage_provider: "Supabase Storage",
  watermark_enabled: true,
  maintenance_mode: false,
};

export function SettingsPanel() {
  const { data: config } = useAppConfig();
  const saveConfig = useSaveAppConfig();
  const { data: templates = [] } = useTemplates();

  const [form, setForm] = useState<SettingsForm>(DEFAULT_SETTINGS_FORM);

  // Populate form when config loads from Supabase
  useEffect(() => {
    if (!config) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setForm({
        merchant_name: config.merchant_name,
        qris_payload_prefix: config.qris_payload_prefix,
        share_base_url: config.share_base_url,
        countdown_duration_seconds: config.countdown_duration_seconds,
        flash_duration_ms: config.flash_duration_ms,
        auto_return_duration_seconds: config.auto_return_duration_seconds,
        default_template_id: config.default_template_id ?? "",
        qris_provider_merchant_id: config.qris_provider_merchant_id ?? "",
        qris_webhook_secret: config.qris_webhook_secret ?? "",
        qris_auto_retry: config.qris_auto_retry ?? true,
        subscription_payment_gateway:
          config.subscription_payment_gateway ?? "duitku",
        printer_name: config.printer_name ?? "POSKART-THERMAL-01",
        booth_timeout_seconds: config.booth_timeout_seconds ?? 90,
        download_expiry_hours: config.download_expiry_hours ?? 72,
        gallery_retention_days: config.gallery_retention_days ?? 30,
        storage_provider: config.storage_provider ?? "Supabase Storage",
        watermark_enabled: config.watermark_enabled ?? true,
        maintenance_mode: config.maintenance_mode ?? false,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [config]);

  const handleSave = async () => {
    try {
      await saveConfig.mutateAsync({
        merchant_name: form.merchant_name,
        qris_payload_prefix: form.qris_payload_prefix,
        share_base_url: form.share_base_url,
        countdown_duration_seconds: form.countdown_duration_seconds,
        flash_duration_ms: form.flash_duration_ms,
        auto_return_duration_seconds: form.auto_return_duration_seconds,
        default_template_id: form.default_template_id || null,
        qris_provider_merchant_id: form.qris_provider_merchant_id,
        qris_webhook_secret: form.qris_webhook_secret,
        qris_auto_retry: form.qris_auto_retry,
        subscription_payment_gateway: form.subscription_payment_gateway,
        printer_name: form.printer_name,
        booth_timeout_seconds: form.booth_timeout_seconds,
        download_expiry_hours: form.download_expiry_hours,
        gallery_retention_days: form.gallery_retention_days,
        storage_provider: form.storage_provider,
        watermark_enabled: form.watermark_enabled,
        maintenance_mode: form.maintenance_mode,
      });
      toast.success("Settings saved to Supabase");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardContent className="grid gap-0 p-0 lg:grid-cols-[1fr_360px]">
          <div className="p-6">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600">
              <ShieldCheck className="size-3.5 text-red-500" />
              Settings & Configuration
            </div>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-zinc-950">
              Control kiosk runtime, payment, media, and system behavior.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600">
              Global settings are stored in Supabase and consumed by POSKART
              dashboard, QRIS/payment flows, and Flutter kiosk startup config.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button
                onClick={() => void handleSave()}
                disabled={saveConfig.isPending}
              >
                <ShieldCheck className="size-4" />
                {saveConfig.isPending ? "Saving..." : "Save settings"}
              </Button>
              <Button variant="outline" disabled>
                API: /api/flutter-config
              </Button>
            </div>
          </div>
          <div className="grid gap-3 border-t border-zinc-200 bg-zinc-50 p-5 sm:grid-cols-2 lg:border-l lg:border-t-0">
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <CreditCard className="mb-3 size-4 text-zinc-500" />
              <div className="text-xs text-zinc-500">Payment retry</div>
              <div className="mt-1 text-sm font-semibold text-zinc-950">
                {form.qris_auto_retry ? "Enabled" : "Disabled"}
              </div>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <Printer className="mb-3 size-4 text-zinc-500" />
              <div className="text-xs text-zinc-500">Printer</div>
              <div className="mt-1 truncate text-sm font-semibold text-zinc-950">
                {form.printer_name}
              </div>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <Timer className="mb-3 size-4 text-zinc-500" />
              <div className="text-xs text-zinc-500">Auto-return</div>
              <div className="mt-1 text-sm font-semibold text-zinc-950">
                {form.auto_return_duration_seconds}s
              </div>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <Wrench className="mb-3 size-4 text-zinc-500" />
              <div className="text-xs text-zinc-500">Maintenance</div>
              <div className="mt-1 text-sm font-semibold text-zinc-950">
                {form.maintenance_mode ? "Enabled" : "Disabled"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="payment">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="flutter">Flutter Config</TabsTrigger>
        </TabsList>
        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle>QRIS provider</CardTitle>
              <CardDescription>
                Provider keys and callbacks for QRIS payment operations.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <label className="block text-xs font-medium text-zinc-600 md:col-span-1">
                Provider merchant ID
                <Input
                  className="mt-1"
                  placeholder="MID-12345"
                  value={form.qris_provider_merchant_id}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      qris_provider_merchant_id: e.target.value,
                    }))
                  }
                />
              </label>
              <label className="block text-xs font-medium text-zinc-600 md:col-span-1">
                Webhook secret
                <Input
                  className="mt-1"
                  placeholder="••••••••"
                  type="password"
                  value={form.qris_webhook_secret}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      qris_webhook_secret: e.target.value,
                    }))
                  }
                />
              </label>
              <label className="md:col-span-2 flex items-center gap-2 text-sm text-zinc-700">
                <Switch
                  checked={form.qris_auto_retry}
                  onCheckedChange={(v) =>
                    setForm((f) => ({ ...f, qris_auto_retry: v }))
                  }
                />
                Auto retry failed QRIS payment
              </label>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="media">
          <Card>
            <CardHeader>
              <CardTitle>Download policy</CardTitle>
              <CardDescription>
                Expiration, watermark, and storage provider.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <label className="block text-xs font-medium text-zinc-600">
                Download expiry (hours)
                <Input
                  className="mt-1"
                  type="number"
                  min={1}
                  max={720}
                  value={form.download_expiry_hours}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      download_expiry_hours: Number(e.target.value),
                    }))
                  }
                />
              </label>
              <label className="block text-xs font-medium text-zinc-600">
                Gallery retention (days)
                <Input
                  className="mt-1"
                  type="number"
                  min={1}
                  max={365}
                  value={form.gallery_retention_days}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      gallery_retention_days: Number(e.target.value),
                    }))
                  }
                />
              </label>
              <label className="block text-xs font-medium text-zinc-600">
                Storage provider
                <Input
                  className="mt-1"
                  value={form.storage_provider}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, storage_provider: e.target.value }))
                  }
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <Switch
                  checked={form.watermark_enabled}
                  onCheckedChange={(v) =>
                    setForm((f) => ({ ...f, watermark_enabled: v }))
                  }
                />
                Watermark enabled
              </label>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance mode</CardTitle>
              <CardDescription>
                Pause public kiosk sessions during maintenance.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              <Wrench className="size-4" />
              <Switch
                checked={form.maintenance_mode}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, maintenance_mode: v }))
                }
              />
              <span className="text-sm">
                Maintenance mode{" "}
                {form.maintenance_mode ? "enabled" : "disabled"}
              </span>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Flutter Config tab — operational settings read by Flutter at startup */}
        <TabsContent value="flutter" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Flutter Kiosk Config</CardTitle>
                  <CardDescription>
                    Settings read by the Flutter app at startup via{" "}
                    <code className="rounded bg-zinc-100 px-1 text-xs">
                      /api/flutter-config
                    </code>
                    .
                  </CardDescription>
                </div>
                <Button
                  onClick={() => void handleSave()}
                  disabled={saveConfig.isPending}
                >
                  {saveConfig.isPending ? "Saving…" : "Save to Supabase"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Merchant & URLs */}
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Merchant & URLs
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block text-xs font-medium text-zinc-600">
                    Merchant name
                    <Input
                      className="mt-1"
                      placeholder="POSKART"
                      value={form.merchant_name}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          merchant_name: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="block text-xs font-medium text-zinc-600">
                    QRIS payload prefix
                    <Input
                      className="mt-1"
                      placeholder="qris://poskart/pay"
                      value={form.qris_payload_prefix}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          qris_payload_prefix: e.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
                <label className="block text-xs font-medium text-zinc-600">
                  Share base URL
                  <Input
                    className="mt-1"
                    placeholder="https://poskart.app/s"
                    value={form.share_base_url}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, share_base_url: e.target.value }))
                    }
                  />
                </label>
              </div>

              {/* Timers */}
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Timers
                </div>
                <label className="block text-xs font-medium text-zinc-600">
                  Countdown before photo: {form.countdown_duration_seconds}s
                  <Slider
                    min={1}
                    max={10}
                    step={1}
                    value={form.countdown_duration_seconds}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        countdown_duration_seconds: Number(e.target.value),
                      }))
                    }
                  />
                </label>
                <label className="block text-xs font-medium text-zinc-600">
                  Flash duration: {form.flash_duration_ms}ms
                  <Slider
                    min={50}
                    max={1000}
                    step={10}
                    value={form.flash_duration_ms}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        flash_duration_ms: Number(e.target.value),
                      }))
                    }
                  />
                </label>
                <label className="block text-xs font-medium text-zinc-600">
                  Auto-return to landing: {form.auto_return_duration_seconds}s
                  <Slider
                    min={3}
                    max={30}
                    step={1}
                    value={form.auto_return_duration_seconds}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        auto_return_duration_seconds: Number(e.target.value),
                      }))
                    }
                  />
                </label>
              </div>

              {/* Default template */}
              <label className="block text-xs font-medium text-zinc-600">
                Default template (pre-selected in Flutter picker)
                <Select
                  className="mt-1"
                  value={form.default_template_id}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      default_template_id: e.target.value,
                    }))
                  }
                >
                  <option value="">— None —</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </label>

              {/* Config preview */}
              <div className="rounded-lg bg-zinc-950 p-4">
                <div className="mb-2 text-xs font-medium text-zinc-400">
                  Live config preview (from Supabase)
                </div>
                <pre className="overflow-x-auto text-xs text-zinc-200">
                  {JSON.stringify(
                    {
                      merchantName: form.merchant_name,
                      qrisPayloadPrefix: form.qris_payload_prefix,
                      shareBaseUrl: form.share_base_url,
                      countdownDurationSeconds: form.countdown_duration_seconds,
                      flashDurationMs: form.flash_duration_ms,
                      autoReturnDurationSeconds:
                        form.auto_return_duration_seconds,
                      defaultTemplateId: form.default_template_id || null,
                    },
                    null,
                    2,
                  )}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function OrganizationPanel() {
  const searchParams = useSearchParams();
  const subscriptionRequired = searchParams.get("subscription") === "required";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization Management"
        description="Manage your subscription plan, organization details, and team members."
      />
      <OrganizationSettings subscriptionRequired={subscriptionRequired} />
    </div>
  );
}

function OrganizationSettings({
  subscriptionRequired,
}: {
  subscriptionRequired: boolean;
}) {
  const { data: tenant, isLoading: isLoadingTenant } = useTenantDetails();
  const { data: members = [] } = useTenantMembers();
  const { data: invitations = [] } = useTenantInvitations();

  const updateName = useUpdateTenantName();
  const inviteUser = useInviteUser();
  const deleteInvitation = useDeleteInvitation();
  const removeMember = useRemoveMember();

  const [editedName, setEditedName] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [myEmail, setMyEmail] = useState("");
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] =
    useState(subscriptionRequired);
  const confirmRemove = useConfirmDialog();

  const supabase = createClient();
  useEffect(() => {
    supabase.auth
      .getUser()
      .then((res: { data: { user: { email?: string | null } | null } }) => {
        if (res.data?.user?.email) setMyEmail(res.data.user.email);
      });
  }, [supabase]);

  if (isLoadingTenant)
    return (
      <div className="p-8 text-center text-zinc-500">
        Loading organization details...
      </div>
    );

  const organizationName = editedName ?? tenant?.name ?? "";
  const planName = tenant?.plan_name ?? "Free Account";
  const subscriptionStatus = tenant?.subscription_status ?? "free";
  const expiresAt = tenant?.subscription_expires_at
    ? new Date(tenant.subscription_expires_at)
    : null;
  const isFreeAccount =
    (tenant?.plan_id ?? "free") === "free" ||
    subscriptionStatus === "free" ||
    !tenant?.subscription_is_active;
  const deviceLimit = tenant?.device_limit ?? 1;

  return (
    <div className="space-y-6">
      {confirmRemove.dialog}
      {subscriptionRequired ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="flex items-start gap-3">
            <LockKeyhole className="mt-0.5 size-4 shrink-0" />
            <div>
              <div className="font-semibold">Active subscription required</div>
              <p className="mt-1 leading-6">
                Theme, builder, template, devices, analytics, settings, and
                transaction tools are locked while this organization is on Free
                Account.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <Card className="overflow-hidden">
        <CardContent className="grid gap-0 p-0 lg:grid-cols-[1fr_380px]">
          <div className="p-6">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge variant={isFreeAccount ? "warning" : "success"}>
                {isFreeAccount ? "Free Account" : "Active subscription"}
              </Badge>
              <Badge variant="secondary">
                {deviceLimit} device{deviceLimit > 1 ? "s" : ""} allowed
              </Badge>
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-950">
              {organizationName || "POSKART Workspace"}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600">
              Manage workspace identity, subscription access, and team
              permissions from one place.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setSubscriptionDialogOpen(true)}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
              >
                <CreditCard className="size-4" />
                {isFreeAccount ? "View subscription plans" : "Manage billing"}
              </button>
              <div className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-600">
                Join code
                <span className="font-mono font-semibold tracking-[0.2em] text-zinc-950">
                  {tenant?.join_code ?? "PENDING"}
                </span>
              </div>
            </div>
          </div>
          <div className="grid gap-3 border-t border-zinc-200 bg-zinc-50 p-5 sm:grid-cols-2 lg:border-l lg:border-t-0">
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <CreditCard className="mb-3 size-4 text-zinc-500" />
              <div className="text-xs text-zinc-500">Plan</div>
              <div className="mt-1 text-sm font-semibold text-zinc-950">
                {planName}
              </div>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <ShieldCheck className="mb-3 size-4 text-zinc-500" />
              <div className="text-xs text-zinc-500">Status</div>
              <div className="mt-1 text-sm font-semibold capitalize text-zinc-950">
                {subscriptionStatus}
              </div>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <Store className="mb-3 size-4 text-zinc-500" />
              <div className="text-xs text-zinc-500">Device limit</div>
              <div className="mt-1 text-sm font-semibold text-zinc-950">
                {deviceLimit} device{deviceLimit > 1 ? "s" : ""}
              </div>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <Timer className="mb-3 size-4 text-zinc-500" />
              <div className="text-xs text-zinc-500">Expiry</div>
              <div className="mt-1 text-sm font-semibold text-zinc-950">
                {expiresAt ? expiresAt.toLocaleDateString() : "Not active"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-6 p-5 lg:grid-cols-[1fr_280px]">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle>Workspace settings</CardTitle>
                <CardDescription className="mt-1">
                  Update organization identity and keep the join code ready for
                  staff onboarding.
                </CardDescription>
              </div>
            </div>

            <div className="mt-6 flex max-w-xl items-end gap-3">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium text-zinc-500">
                  Organization Name
                </label>
                <Input
                  value={organizationName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder="My Organization"
                />
              </div>
              <Button
                disabled={
                  !organizationName.trim() ||
                  organizationName === tenant?.name ||
                  updateName.isPending
                }
                onClick={() => {
                  updateName.mutate(organizationName, {
                    onSuccess: () => {
                      toast.success("Organization name updated");
                      setEditedName(null);
                    },
                    onError: (err) =>
                      toast.error(
                        err instanceof Error
                          ? err.message
                          : "Failed to update name",
                      ),
                  });
                }}
              >
                {updateName.isPending ? "Saving..." : "Save"}
              </Button>
            </div>

            <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-3">
              <div className="text-xs font-medium text-zinc-500">
                Organization join code
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-sm font-semibold tracking-[0.24em] text-zinc-950">
                  {tenant?.join_code ?? "Pending"}
                </div>
                <div className="text-xs leading-5 text-zinc-500">
                  Share this code with staff so they can join this workspace
                  during onboarding.
                </div>
              </div>
            </div>
          </div>

          <div
            className={
              isFreeAccount
                ? "rounded-lg border border-amber-200 bg-amber-50 p-4"
                : "rounded-lg border border-zinc-200 bg-zinc-50 p-4"
            }
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              {isFreeAccount ? (
                <LockKeyhole className="size-4 text-amber-700" />
              ) : (
                <ShieldCheck className="size-4 text-emerald-700" />
              )}
              {isFreeAccount ? "Workspace locked" : "Workspace active"}
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              {isFreeAccount
                ? "Free Account can view dashboard and organization settings only. Activate a subscription to unlock builder, themes, templates, devices, analytics, transactions, and settings."
                : "This organization can use the POSKART operating tools according to the active subscription and paid device limit."}
            </p>
            <button
              type="button"
              onClick={() => setSubscriptionDialogOpen(true)}
              className="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-zinc-950 px-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
            >
              {isFreeAccount ? "View subscription plans" : "Manage billing"}
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            People with access to this organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="mb-5 flex max-w-md items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!inviteEmail.trim() || inviteEmail === myEmail) return;
              inviteUser.mutate(inviteEmail, {
                onSuccess: () => {
                  toast.success(`Invitation sent to ${inviteEmail}`);
                  setInviteEmail("");
                },
                onError: (err) =>
                  toast.error(
                    err instanceof Error
                      ? err.message
                      : "Failed to invite user",
                  ),
              });
            }}
          >
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-zinc-500">
                Invite Email
              </label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
              />
            </div>
            <Button
              disabled={
                !inviteEmail.trim() ||
                inviteEmail === myEmail ||
                inviteUser.isPending
              }
            >
              {inviteUser.isPending ? "Sending..." : "Invite"}
            </Button>
          </form>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User Email</TableHead>
                <TableHead>System Role</TableHead>
                <TableHead>Joined At</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(members as OrganizationMemberRow[]).map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">
                    {m.email}
                    {m.email === myEmail && (
                      <Badge variant="secondary" className="ml-2 text-[10px]">
                        You
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={m.role === "admin" ? "warning" : "secondary"}
                    >
                      {m.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-zinc-500">
                    {new Date(m.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={m.email === myEmail}
                      onClick={() => {
                        confirmRemove.confirm({
                          title: "Remove member?",
                          description: `Remove ${m.email} from organization?`,
                          confirmLabel: "Remove",
                          destructive: true,
                          onConfirm: () => {
                            removeMember.mutate(m.id, {
                              onSuccess: () => toast.success("Member removed"),
                              onError: (err) =>
                                toast.error(
                                  err instanceof Error
                                    ? err.message
                                    : "Failed to remove member",
                                ),
                            });
                          },
                        });
                      }}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {members.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-zinc-500 py-6"
                  >
                    No members found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {invitations.length > 0 && (
            <div className="pt-4 mt-4 border-t border-zinc-100">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Invited At</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(invitations as OrganizationInvitationRow[]).map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium text-zinc-600">
                        {inv.email}
                      </TableCell>
                      <TableCell className="text-zinc-500">
                        {new Date(inv.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            deleteInvitation.mutate(inv.id, {
                              onSuccess: () =>
                                toast.success("Invitation cancelled"),
                            });
                          }}
                        >
                          Cancel
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <SubscriptionDialog
        open={subscriptionDialogOpen}
        onOpenChange={setSubscriptionDialogOpen}
      />
    </div>
  );
}
