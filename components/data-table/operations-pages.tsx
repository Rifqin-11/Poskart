"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
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
  ImagePlus,
  Plus,
  Power,
  Printer,
  Timer,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Store,
  Trash2,
  Users,
  Wrench,
} from "lucide-react";
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
import { FrameTemplateTester } from "@/components/templates/frame-template-tester";
import {
  useAppConfig,
  useAssets,
  useBooths,
  useCreateAsset,
  useCreateBooth,
  useCreatePricing,
  useCreateTenant,
  useDashboardData,
  useDeleteAsset,
  useDeleteBooth,
  useDeletePricing,
  useDeleteTemplate,
  useDeleteTenant,
  useFailedPrintsByBooth,
  useLayoutSchemas,
  useRetryPrint,
  usePricing,
  useSaveAppConfig,
  useTemplates,
  useTenants,
  useTransactions,
  useUpdateAsset,
  useUpdateBooth,
  useUpdatePricing,
  useUpdateTemplate,
  useUpdateTenant,
} from "@/hooks/use-admin-data";
import type {
  AssetInput,
  AssetItem,
  BoothInput,
  PricingProductInput,
  TenantInput,
} from "@/lib/services/admin-service";
import { uploadLibraryAsset } from "@/lib/services/storage-service";
import { formatCurrency } from "@/lib/utils";
import type { Booth } from "@/types/booth";
import type { PricingProduct } from "@/types/pricing";
import type { Template } from "@/types/template";
import type { Tenant } from "@/types/tenant";

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

export function TemplateManagement() {
  const router = useRouter();
  const { data = [] } = useTemplates();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const [testTemplate, setTestTemplate] = useState<Template | null>(null);

  const openAdd = () => router.push("/templates/builder/new");
  const openEdit = (template: Template) =>
    router.push(`/templates/builder/${template.id}`);

  const handleDelete = (t: Template) => {
    if (!confirm(`Delete "${t.name}"? This cannot be undone.`)) return;
    deleteTemplate.mutate(t.id, {
      onSuccess: () => toast.success("Template deleted"),
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : "Delete failed"),
    });
  };

  const handleSetDefault = (t: Template) => {
    updateTemplate.mutate(
      { id: t.id, patch: { isDefault: true } },
      {
        onSuccess: () => toast.success(`"${t.name}" set as default template`),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Failed"),
      },
    );
  };

  return (
    <div>
      <PageHeader
        title="Template Management"
        description="Frame templates for the Flutter photobooth picker screen."
        action={
          <Button onClick={openAdd}>
            <CloudUpload className="size-4" /> Add template
          </Button>
        }
      />

      {data.length === 0 ? (
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
        <div className="grid max-w-5xl gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((template) => (
            <Card key={template.id} className="group overflow-hidden">
              <CardContent className="space-y-4 p-4">
                <div
                  className="relative mx-auto flex aspect-[8/12] h-48 w-32 shrink-0 items-center justify-center overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm"
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
                  {template.isDefault ? (
                    <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-zinc-700 shadow">
                      <Star className="size-2.5 fill-yellow-400 text-yellow-400" />{" "}
                      Default
                    </span>
                  ) : null}
                </div>

                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-base font-semibold text-zinc-950">
                      {template.name}
                    </h2>
                    <Badge
                      variant={
                        template.status === "published"
                          ? "success"
                          : "secondary"
                      }
                    >
                      {template.status}
                    </Badge>
                  </div>
                  {template.tagline ? (
                    <p className="line-clamp-2 text-sm text-zinc-500">
                      {template.tagline}
                    </p>
                  ) : (
                    <p className="text-sm text-zinc-400">
                      No tagline configured.
                    </p>
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
                    <span className="capitalize">{template.category}</span>
                    <span>
                      {template.frameLayout
                        ? "Custom layout"
                        : "Default layout"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {!template.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 justify-center px-2"
                      onClick={() => handleSetDefault(template)}
                    >
                      <Check className="size-3.5" /> Set default
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 justify-center px-2"
                    onClick={() => setTestTemplate(template)}
                  >
                    <ImagePlus className="size-3.5" /> Test
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 justify-center px-2"
                    onClick={() => openEdit(template)}
                  >
                    <Edit2 className="size-3.5" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-center px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => handleDelete(template)}
                  >
                    <Trash2 className="size-3.5" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {testTemplate ? (
            <FrameTemplateTester
              template={testTemplate}
              open
              onOpenChange={(open) => {
                if (!open) setTestTemplate(null);
              }}
            />
          ) : null}
        </div>
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
    if (!confirm(`Delete package "${product.name}"?`)) return;
    deletePricing.mutate(product.id, {
      onSuccess: () => toast.success("Package deleted"),
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : "Delete failed"),
    });
  };

  return (
    <div>
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

export function TransactionsMonitoring() {
  const { data = [] } = useTransactions();

  return (
    <div>
      <PageHeader
        title="Transaction & QRIS Monitoring"
        description="Track live payments, failed logs, manual verification, retry, and refund tools."
        action={
          <Button variant="outline">
            <SlidersHorizontal className="size-4" /> Filters
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <div className="grid gap-3 md:grid-cols-4">
            <Input placeholder="Search transaction" />
            <Select defaultValue="all">
              <option value="all">All booths</option>
              <option>Booth 01</option>
            </Select>
            <Select defaultValue="all">
              <option value="all">All locations</option>
              <option>PVJ Bandung</option>
            </Select>
            <Select defaultValue="all">
              <option value="all">All status</option>
              <option>Paid</option>
              <option>Failed</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Booth</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-mono text-xs">
                    {transaction.id}
                  </TableCell>
                  <TableCell>{transaction.booth}</TableCell>
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
                  </TableCell>
                </TableRow>
              ))}
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
  sessionCountdownSeconds: null,
  paymentCountdownSeconds: null,
};

export function BoothManagement() {
  const { data = [], refetch } = useBooths();
  const { data: layouts = [] } = useLayoutSchemas();
  const createBooth = useCreateBooth();
  const updateBooth = useUpdateBooth();
  const deleteBooth = useDeleteBooth();
  const [editing, setEditing] = useState<Booth | null>(null);
  const [creating, setCreating] = useState(false);
  const [assignFor, setAssignFor] = useState<Booth | null>(null);
  const [failedFor, setFailedFor] = useState<Booth | null>(null);

  const handleDelete = (booth: Booth) => {
    if (!confirm(`Delete booth "${booth.name}"?`)) return;
    deleteBooth.mutate(booth.id, {
      onSuccess: () => toast.success("Booth deleted"),
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : "Delete failed"),
    });
  };

  const assignTheme = (booth: Booth, themeName: string) => {
    updateBooth.mutate(
      { id: booth.id, patch: { theme: themeName } },
      {
        onSuccess: () => {
          toast.success(`Assigned "${themeName}" to ${booth.name}`);
          setAssignFor(null);
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Failed"),
      },
    );
  };

  return (
    <div>
      <PageHeader
        title="Booth Device Management"
        description="Monitor kiosk health, app versions, sync, remote actions, and assigned profiles."
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
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" /> Add booth
            </Button>
          </div>
        }
      />
      <div className="grid gap-4 xl:grid-cols-2">
        {data.map((booth) => (
          <Card key={booth.id}>
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle>{booth.name}</CardTitle>
                <CardDescription>
                  {booth.location} · {booth.appVersion}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    booth.status === "online"
                      ? "success"
                      : booth.status === "maintenance"
                        ? "warning"
                        : "destructive"
                  }
                >
                  {booth.status}
                </Badge>
                <DropdownMenu
                  items={[
                    { label: "Edit", onClick: () => setEditing(booth) },
                    {
                      label: "Delete",
                      destructive: true,
                      onClick: () => handleDelete(booth),
                    },
                  ]}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-md bg-zinc-50 p-3">
                  <Battery className="mb-2 size-4" />
                  {booth.battery}% battery
                </div>
                <div className="rounded-md bg-zinc-50 p-3">
                  <BadgeCheck className="mb-2 size-4" />
                  {booth.lastSync}
                </div>
                <div className="rounded-md bg-zinc-50 p-3">
                  <Store className="mb-2 size-4" />
                  {booth.pricingProfile}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 rounded-md bg-zinc-50 p-3 text-xs text-zinc-600">
                <div className="flex items-center gap-1.5">
                  <Timer className="size-3.5 text-zinc-400" />
                  <span>
                    Session:{" "}
                    <span className="font-semibold text-zinc-800">
                      {booth.sessionCountdownSeconds
                        ? `${booth.sessionCountdownSeconds}s`
                        : "default"}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Timer className="size-3.5 text-zinc-400" />
                  <span>
                    Payment:{" "}
                    <span className="font-semibold text-zinc-800">
                      {booth.paymentCountdownSeconds
                        ? `${booth.paymentCountdownSeconds}s`
                        : "default"}
                    </span>
                  </span>
                </div>
                <div className="col-span-2 flex items-center gap-1.5">
                  <span className="text-zinc-500">Theme:</span>
                  <span className="font-medium text-zinc-700">
                    {booth.theme || "—"}
                  </span>
                </div>
              </div>
              <Progress value={booth.battery} />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.message(`${booth.name} restart queued`)}
                >
                  <Power className="size-4" /> Restart
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    toast.message(`${booth.name} remote refresh queued`)
                  }
                >
                  <RotateCcw className="size-4" /> Remote refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFailedFor(booth)}
                >
                  <Printer className="size-4" /> Failed prints
                </Button>
                <Button size="sm" onClick={() => setAssignFor(booth)}>
                  Assign theme
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
                No booths yet
              </div>
              <Button className="mt-3" onClick={() => setCreating(true)}>
                <Plus className="size-4" /> Add booth
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {creating ? (
        <BoothFormDialog
          title="Add booth"
          initial={EMPTY_BOOTH}
          submitting={createBooth.isPending}
          onClose={() => setCreating(false)}
          onSubmit={(values) => {
            createBooth.mutate(values, {
              onSuccess: () => {
                toast.success("Booth created");
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
          submitting={updateBooth.isPending}
          onClose={() => setEditing(null)}
          onSubmit={(values) => {
            updateBooth.mutate(
              { id: editing.id, patch: values },
              {
                onSuccess: () => {
                  toast.success("Booth updated");
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
          booth={failedFor}
          onClose={() => setFailedFor(null)}
        />
      ) : null}
      {assignFor ? (
        <Dialog
          open
          onOpenChange={(o) => !o && setAssignFor(null)}
          title={`Assign theme to ${assignFor.name}`}
        >
          {layouts.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No themes saved yet. Open the Visual Builder to create one.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {layouts.map((layout) => {
                const isCurrent = assignFor.theme === layout.name;
                return (
                  <li
                    key={layout.id}
                    className="flex items-center justify-between py-2"
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
        </Dialog>
      ) : null}
    </div>
  );
}

function BoothFormDialog({
  title,
  initial,
  submitting,
  onClose,
  onSubmit,
}: {
  title: string;
  initial: BoothInput | Booth;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: BoothInput) => void;
}) {
  const [form, setForm] = useState<BoothInput>(() => {
    const { id: _ignored, ...rest } = initial as Booth;
    void _ignored;
    return rest as BoothInput;
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={title}>
      <form
        className="grid gap-3 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.name.trim() || !form.location.trim()) {
            toast.error("Name and location are required");
            return;
          }
          onSubmit(form);
        }}
      >
        <label className="block text-xs font-medium text-zinc-600">
          Name
          <Input
            className="mt-1"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Booth 01"
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
              setForm({ ...form, status: e.target.value as Booth["status"] })
            }
          >
            <option value="online">online</option>
            <option value="offline">offline</option>
            <option value="maintenance">maintenance</option>
          </Select>
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Battery: {form.battery}%
          <Slider
            min={0}
            max={100}
            value={form.battery}
            onChange={(e) =>
              setForm({ ...form, battery: Number(e.target.value) })
            }
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          App version
          <Input
            className="mt-1"
            value={form.appVersion}
            onChange={(e) => setForm({ ...form, appVersion: e.target.value })}
          />
        </label>
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
          <Input
            className="mt-1"
            value={form.theme}
            onChange={(e) => setForm({ ...form, theme: e.target.value })}
            placeholder="Default"
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Template
          <Input
            className="mt-1"
            value={form.template}
            onChange={(e) => setForm({ ...form, template: e.target.value })}
            placeholder="Frame Classic"
          />
        </label>
        <label className="md:col-span-2 block text-xs font-medium text-zinc-600">
          Pricing profile
          <Input
            className="mt-1"
            value={form.pricingProfile}
            onChange={(e) =>
              setForm({ ...form, pricingProfile: e.target.value })
            }
            placeholder="Standard"
          />
        </label>
        <div className="md:col-span-2 mt-1 rounded-md border border-dashed border-zinc-200 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <Timer className="size-3.5" /> Countdown overrides (optional)
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-xs font-medium text-zinc-600">
              Session countdown (seconds)
              <Input
                className="mt-1"
                type="number"
                min={30}
                max={1800}
                placeholder="e.g. 300 (5 min) — leave empty for global default"
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
                className="mt-1"
                type="number"
                min={10}
                max={600}
                placeholder="e.g. 60 — leave empty to use global default"
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

function FailedPrintsDialog({
  booth,
  onClose,
}: {
  booth: Booth;
  onClose: () => void;
}) {
  const { data = [], isLoading, refetch } = useFailedPrintsByBooth(booth.name);
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
      title={`Failed prints — ${booth.name}`}
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
    if (!confirm(`Delete asset "${asset.name}"?`)) return;
    deleteAsset.mutate(
      { id: asset.id, storagePath: asset.storage_path ?? undefined },
      {
        onSuccess: () => toast.success("Asset deleted"),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Delete failed"),
      },
    );
  };

  return (
    <div>
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
  const chartsMounted = useClientMounted();
  const weekly = data?.weeklyChart ?? [];
  const monthly = data?.monthlyChart ?? [];

  return (
    <div>
      <PageHeader
        title="Analytics & Statistics"
        description="Revenue, growth, booth performance, downloads, peak hours, and conversion."
        action={
          <Button variant="outline">
            <Download className="size-4" /> Download CSV
          </Button>
        }
      />
      <div className="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Monthly growth", "+22.1%"],
          ["Best location", "PVJ Bandung"],
          ["Conversion rate", "71.8%"],
          ["Average transaction", "Rp 9.8K"],
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
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Transaction growth</CardTitle>
            <CardDescription>Weekly volume.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {chartsMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weekly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="transactions"
                    stroke="#18181b"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="downloads"
                    stroke="#ef4444"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Revenue chart</CardTitle>
            <CardDescription>Monthly performance.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {chartsMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis dataKey="label" />
                  <YAxis
                    tickFormatter={(value) => `${Number(value) / 1000000}jt`}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                  <Bar dataKey="revenue" fill="#18181b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const PLAN_OPTIONS: Tenant["plan"][] = [
  "Monthly",
  "3 Months",
  "1 Year",
  "Starter",
  "Growth",
  "Enterprise",
];
const TENANT_STATUS: Tenant["status"][] = ["active", "trial", "paused"];
const EMPTY_TENANT: TenantInput = {
  name: "",
  plan: "Monthly",
  status: "trial",
  booths: 0,
  users: 1,
  renewalDate: new Date().toISOString().slice(0, 10),
};

export function TenantManagement() {
  const { data = [] } = useTenants();
  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant();
  const deleteTenant = useDeleteTenant();
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [creating, setCreating] = useState(false);

  const handleDelete = (tenant: Tenant) => {
    if (!confirm(`Delete tenant "${tenant.name}"?`)) return;
    deleteTenant.mutate(tenant.id, {
      onSuccess: () => toast.success("Tenant deleted"),
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : "Delete failed"),
    });
  };

  return (
    <div>
      <PageHeader
        title="User & Tenant Management"
        description="Multi-tenant SaaS controls for booths, themes, subscriptions, and permissions."
        action={
          <Button onClick={() => setCreating(true)}>
            <Users className="size-4" /> Create tenant
          </Button>
        }
      />
      <Card>
        <CardContent className="pt-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Booths</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Renewal</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">{tenant.name}</TableCell>
                  <TableCell>{tenant.plan}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        tenant.status === "active"
                          ? "success"
                          : tenant.status === "trial"
                            ? "warning"
                            : "secondary"
                      }
                    >
                      {tenant.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{tenant.booths}</TableCell>
                  <TableCell>{tenant.users}</TableCell>
                  <TableCell>{tenant.renewalDate}</TableCell>
                  <TableCell>
                    <DropdownMenu
                      items={[
                        { label: "Edit", onClick: () => setEditing(tenant) },
                        {
                          label: "Delete",
                          destructive: true,
                          onClick: () => handleDelete(tenant),
                        },
                      ]}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-sm text-zinc-400"
                  >
                    No tenants yet. Click <strong>Create tenant</strong>.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {creating ? (
        <TenantFormDialog
          title="Create tenant"
          initial={EMPTY_TENANT}
          submitting={createTenant.isPending}
          onClose={() => setCreating(false)}
          onSubmit={(values) => {
            createTenant.mutate(values, {
              onSuccess: () => {
                toast.success("Tenant created");
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
          submitting={updateTenant.isPending}
          onClose={() => setEditing(null)}
          onSubmit={(values) => {
            updateTenant.mutate(
              { id: editing.id, patch: values },
              {
                onSuccess: () => {
                  toast.success("Tenant updated");
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

function TenantFormDialog({
  title,
  initial,
  submitting,
  onClose,
  onSubmit,
}: {
  title: string;
  initial: TenantInput | Tenant;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: TenantInput) => void;
}) {
  const [form, setForm] = useState<TenantInput>(() => {
    const { id: _ignored, ...rest } = initial as Tenant;
    void _ignored;
    return rest as TenantInput;
  });

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
            placeholder="PT Photo Booth Indonesia"
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Plan
          <Select
            className="mt-1"
            value={form.plan}
            onChange={(e) =>
              setForm({ ...form, plan: e.target.value as Tenant["plan"] })
            }
          >
            {PLAN_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Status
          <Select
            className="mt-1"
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value as Tenant["status"] })
            }
          >
            {TENANT_STATUS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Booths
          <Input
            className="mt-1"
            type="number"
            min={0}
            value={form.booths}
            onChange={(e) =>
              setForm({ ...form, booths: Number(e.target.value) })
            }
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Users
          <Input
            className="mt-1"
            type="number"
            min={1}
            value={form.users}
            onChange={(e) =>
              setForm({ ...form, users: Number(e.target.value) })
            }
          />
        </label>
        <label className="md:col-span-2 block text-xs font-medium text-zinc-600">
          Renewal date
          <Input
            className="mt-1"
            type="date"
            value={form.renewalDate}
            onChange={(e) => setForm({ ...form, renewalDate: e.target.value })}
          />
        </label>
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
  // Booth
  printer_name: string;
  booth_timeout_seconds: number;
  // Media
  download_expiry_hours: number;
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
  printer_name: "POSKART-THERMAL-01",
  booth_timeout_seconds: 90,
  download_expiry_hours: 72,
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
        printer_name: config.printer_name ?? "POSKART-THERMAL-01",
        booth_timeout_seconds: config.booth_timeout_seconds ?? 90,
        download_expiry_hours: config.download_expiry_hours ?? 72,
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
        printer_name: form.printer_name,
        booth_timeout_seconds: form.booth_timeout_seconds,
        download_expiry_hours: form.download_expiry_hours,
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
    <div>
      <PageHeader
        title="Settings & Configuration"
        description="Global controls for QRIS, printer, timers, watermark, and Flutter kiosk behavior."
        action={
          <Button
            onClick={() => void handleSave()}
            disabled={saveConfig.isPending}
          >
            <ShieldCheck className="size-4" />
            {saveConfig.isPending ? "Saving…" : "Save settings"}
          </Button>
        }
      />
      <Tabs defaultValue="payment">
        <TabsList>
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="booth">Booth</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="flutter">Flutter Config</TabsTrigger>
        </TabsList>
        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle>QRIS provider</CardTitle>
              <CardDescription>
                Sandbox-ready provider keys and callbacks.
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
        <TabsContent value="booth">
          <Card>
            <CardHeader>
              <CardTitle>Booth behavior</CardTitle>
              <CardDescription>
                Timeouts, printers, and return timers.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <label className="block text-xs font-medium text-zinc-600">
                Printer name
                <Input
                  className="mt-1"
                  value={form.printer_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, printer_name: e.target.value }))
                  }
                />
              </label>
              <label className="block text-xs font-medium text-zinc-600">
                Booth timeout (seconds)
                <Input
                  className="mt-1"
                  type="number"
                  min={10}
                  max={600}
                  value={form.booth_timeout_seconds}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      booth_timeout_seconds: Number(e.target.value),
                    }))
                  }
                />
              </label>
              <label className="block text-xs font-medium text-zinc-600">
                Auto-return (seconds)
                <Input
                  className="mt-1"
                  type="number"
                  min={3}
                  max={60}
                  value={form.auto_return_duration_seconds}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      auto_return_duration_seconds: Number(e.target.value),
                    }))
                  }
                />
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
            <CardContent className="grid gap-3 md:grid-cols-3">
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
