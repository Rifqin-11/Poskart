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
import { useEffect, useSyncExternalStore, useState } from "react";
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
  MoreHorizontal,
  Power,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAppConfig,
  useAssets,
  useBooths,
  useDeleteTemplate,
  useDashboardData,
  usePricing,
  useSaveAppConfig,
  useTemplates,
  useTenants,
  useTransactions,
  useUpdateTemplate,
} from "@/hooks/use-admin-data";
import { formatCurrency } from "@/lib/utils";
import type { Template } from "@/types/template";

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

  const openAdd = () => router.push("/templates/builder/new");
  const openEdit = (template: Template) => router.push(`/templates/builder/${template.id}`);

  const handleDelete = (t: Template) => {
    if (!confirm(`Delete "${t.name}"? This cannot be undone.`)) return;
    deleteTemplate.mutate(t.id, {
      onSuccess: () => toast.success("Template deleted"),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Delete failed"),
    });
  };

  const handleSetDefault = (t: Template) => {
    updateTemplate.mutate(
      { id: t.id, patch: { isDefault: true } },
      {
        onSuccess: () => toast.success(`"${t.name}" set as default template`),
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed"),
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
            <div className="text-sm font-medium text-zinc-500">No templates yet</div>
            <div className="mt-1 text-xs text-zinc-400">Create your first frame template for the Flutter app.</div>
            <Button className="mt-4" onClick={openAdd}>Add template</Button>
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
                    <Boxes className="size-10" style={{ color: template.accentColor }} />
                  )}
                  {template.isDefault ? (
                    <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-zinc-700 shadow">
                      <Star className="size-2.5 fill-yellow-400 text-yellow-400" /> Default
                    </span>
                  ) : null}
                </div>

                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-base font-semibold text-zinc-950">{template.name}</h2>
                    <Badge variant={template.status === "published" ? "success" : "secondary"}>
                      {template.status}
                    </Badge>
                  </div>
                  {template.tagline ? (
                    <p className="line-clamp-2 text-sm text-zinc-500">{template.tagline}</p>
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
                    <span className="capitalize">{template.category}</span>
                    <span>{template.frameLayout ? "Custom layout" : "Default layout"}</span>
                  </div>
                </div>

                <div className="flex gap-2">
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
                  <Button variant="outline" size="sm" className="flex-1 justify-center px-2" onClick={() => openEdit(template)}>
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
        </div>
      )}
    </div>
  );
}

export function PricingManagement() {
  const { data = [] } = usePricing();

  return (
    <div>
      <PageHeader
        title="Pricing & Product Management"
        description="Configure packages, promos, QR download, GIF options, and print limits."
        action={<Button><CreditCard className="size-4" /> Add package</Button>}
      />
      <Card>
        <CardHeader>
          <CardTitle>Pricing profiles</CardTitle>
          <CardDescription>Supabase-backed products for POSKART kiosk packages.</CardDescription>
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
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{formatCurrency(product.price)}</TableCell>
                  <TableCell>{product.promoPrice ? formatCurrency(product.promoPrice) : "-"}</TableCell>
                  <TableCell>{product.printLimit}</TableCell>
                  <TableCell><Switch checked={product.qrisDownload} /></TableCell>
                  <TableCell><Switch checked={product.gifEnabled} /></TableCell>
                  <TableCell><Badge variant={product.active ? "success" : "secondary"}>{product.active ? "Active" : "Inactive"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export function TransactionsMonitoring() {
  const { data = [] } = useTransactions();

  return (
    <div>
      <PageHeader
        title="Transaction & QRIS Monitoring"
        description="Track live payments, failed logs, manual verification, retry, and refund tools."
        action={<Button variant="outline"><SlidersHorizontal className="size-4" /> Filters</Button>}
      />
      <Card>
        <CardHeader>
          <div className="grid gap-3 md:grid-cols-4">
            <Input placeholder="Search transaction" />
            <Select defaultValue="all"><option value="all">All booths</option><option>Booth 01</option></Select>
            <Select defaultValue="all"><option value="all">All locations</option><option>PVJ Bandung</option></Select>
            <Select defaultValue="all"><option value="all">All status</option><option>Paid</option><option>Failed</option></Select>
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
                  <TableCell className="font-mono text-xs">{transaction.id}</TableCell>
                  <TableCell>{transaction.booth}</TableCell>
                  <TableCell>{transaction.location}</TableCell>
                  <TableCell>{transaction.packageName}</TableCell>
                  <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                  <TableCell>
                    <Badge variant={transaction.status === "paid" ? "success" : transaction.status === "pending" ? "warning" : "destructive"}>{transaction.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu
                      items={[
                        { label: "Manual verify", onClick: () => toast.success("Payment verified") },
                        { label: "Retry QRIS", onClick: () => toast.message("Retry sent") },
                        { label: "Refund", destructive: true, onClick: () => toast.error("Refund queued") },
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

export function BoothManagement() {
  const { data = [] } = useBooths();

  return (
    <div>
      <PageHeader
        title="Booth Device Management"
        description="Monitor kiosk health, app versions, sync, remote actions, and assigned profiles."
        action={<Button><RefreshCw className="size-4" /> Refresh network</Button>}
      />
      <div className="grid gap-4 xl:grid-cols-2">
        {data.map((booth) => (
          <Card key={booth.id}>
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle>{booth.name}</CardTitle>
                <CardDescription>{booth.location} · {booth.appVersion}</CardDescription>
              </div>
              <Badge variant={booth.status === "online" ? "success" : booth.status === "maintenance" ? "warning" : "destructive"}>{booth.status}</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-md bg-zinc-50 p-3"><Battery className="mb-2 size-4" />{booth.battery}% battery</div>
                <div className="rounded-md bg-zinc-50 p-3"><BadgeCheck className="mb-2 size-4" />{booth.lastSync}</div>
                <div className="rounded-md bg-zinc-50 p-3"><Store className="mb-2 size-4" />{booth.pricingProfile}</div>
              </div>
              <Progress value={booth.battery} />
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => toast.message(`${booth.name} restart queued`)}><Power className="size-4" /> Restart</Button>
                <Button variant="outline" size="sm"><RotateCcw className="size-4" /> Remote refresh</Button>
                <Button size="sm">Assign theme</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function AssetLibrary() {
  const { data = [] } = useAssets();

  return (
    <div>
      <PageHeader
        title="Media & Asset Library"
        description="Organize logos, backgrounds, stamps, decorative elements, and receipt assets."
        action={<Button><CloudUpload className="size-4" /> Upload assets</Button>}
      />
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px_220px]">
        <Input placeholder="Search assets" />
        <Select defaultValue="all"><option value="all">All folders</option><option>Logos</option><option>Frames</option></Select>
        <Select defaultValue="all"><option value="all">All tags</option><option>brand</option><option>stamp</option></Select>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.map((asset) => (
          <Card key={asset.id}>
            <CardHeader>
              <div className="mb-3 grid h-36 place-items-center rounded-md bg-zinc-100">
                <Folder className="size-9 text-zinc-400" />
              </div>
              <CardTitle>{asset.name}</CardTitle>
              <CardDescription>{asset.folder} · {asset.size}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <Badge variant="secondary">{asset.tag}</Badge>
              <span className="text-xs text-zinc-500">{asset.version}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
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
        action={<Button variant="outline"><Download className="size-4" /> Download CSV</Button>}
      />
      <div className="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Monthly growth", "+22.1%"],
          ["Best location", "PVJ Bandung"],
          ["Conversion rate", "71.8%"],
          ["Average transaction", "Rp 9.8K"],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardHeader><CardTitle className="text-xs text-zinc-500">{label}</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">{value}</CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Transaction growth</CardTitle><CardDescription>Weekly volume.</CardDescription></CardHeader>
          <CardContent className="h-80">
            {chartsMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weekly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="transactions" stroke="#18181b" strokeWidth={2} />
                  <Line type="monotone" dataKey="downloads" stroke="#ef4444" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Revenue chart</CardTitle><CardDescription>Monthly performance.</CardDescription></CardHeader>
          <CardContent className="h-80">
            {chartsMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis dataKey="label" />
                  <YAxis tickFormatter={(value) => `${Number(value) / 1000000}jt`} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
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

export function TenantManagement() {
  const { data = [] } = useTenants();

  return (
    <div>
      <PageHeader
        title="User & Tenant Management"
        description="Multi-tenant SaaS controls for booths, themes, subscriptions, and permissions."
        action={<Button><Users className="size-4" /> Create tenant</Button>}
      />
      <Card>
        <CardContent className="pt-5">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Tenant</TableHead><TableHead>Plan</TableHead><TableHead>Status</TableHead><TableHead>Booths</TableHead><TableHead>Users</TableHead><TableHead>Renewal</TableHead><TableHead /></TableRow>
            </TableHeader>
            <TableBody>
              {data.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">{tenant.name}</TableCell>
                  <TableCell>{tenant.plan}</TableCell>
                  <TableCell><Badge variant={tenant.status === "active" ? "success" : tenant.status === "trial" ? "warning" : "secondary"}>{tenant.status}</Badge></TableCell>
                  <TableCell>{tenant.booths}</TableCell>
                  <TableCell>{tenant.users}</TableCell>
                  <TableCell>{tenant.renewalDate}</TableCell>
                  <TableCell><Button variant="ghost" size="icon"><MoreHorizontal /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export function SettingsPanel() {
  const { data: config } = useAppConfig();
  const saveConfig = useSaveAppConfig();
  const { data: templates = [] } = useTemplates();

  const [form, setForm] = useState({
    merchant_name: "",
    qris_payload_prefix: "",
    share_base_url: "",
    countdown_duration_seconds: 3,
    flash_duration_ms: 220,
    auto_return_duration_seconds: 8,
    default_template_id: "",
  });

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
      });
    });
    return () => {
      cancelled = true;
    };
  }, [config]);

  const handleSaveFlutterConfig = async () => {
    try {
      await saveConfig.mutateAsync({
        ...form,
        default_template_id: form.default_template_id || null,
      });
      toast.success("Flutter config saved to Supabase");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    }
  };

  return (
    <div>
      <PageHeader
        title="Settings & Configuration"
        description="Global controls for QRIS, printer, timers, watermark, and Flutter kiosk behavior."
        action={<Button><ShieldCheck className="size-4" /> Save settings</Button>}
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
          <Card><CardHeader><CardTitle>QRIS provider</CardTitle><CardDescription>Sandbox-ready provider keys and callbacks.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2"><Input placeholder="Provider merchant ID" /><Input placeholder="Webhook secret" /><Switch checked /> <span className="text-sm">Auto retry failed QRIS payment</span></CardContent></Card>
        </TabsContent>
        <TabsContent value="booth">
          <Card><CardHeader><CardTitle>Booth behavior</CardTitle><CardDescription>Timeouts, printers, and return timers.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-3"><Input placeholder="Printer name" defaultValue="POSKART-THERMAL-01" /><Input placeholder="Booth timeout" defaultValue="90 seconds" /><Input placeholder="Auto-return timer" defaultValue="12 seconds" /></CardContent></Card>
        </TabsContent>
        <TabsContent value="media">
          <Card><CardHeader><CardTitle>Download policy</CardTitle><CardDescription>Expiration, watermark, and storage provider.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-3"><Input defaultValue="72 hours" /><Input defaultValue="Supabase Storage" /><Switch checked /> <span className="text-sm">Watermark enabled</span></CardContent></Card>
        </TabsContent>
        <TabsContent value="system">
          <Card><CardHeader><CardTitle>Maintenance mode</CardTitle><CardDescription>Pause public kiosk sessions during maintenance.</CardDescription></CardHeader><CardContent className="flex items-center gap-3"><Wrench className="size-4" /><Switch /> <span className="text-sm">Maintenance mode disabled</span></CardContent></Card>
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
                    <code className="rounded bg-zinc-100 px-1 text-xs">/api/flutter-config</code>.
                  </CardDescription>
                </div>
                <Button onClick={handleSaveFlutterConfig} disabled={saveConfig.isPending}>
                  {saveConfig.isPending ? "Saving…" : "Save to Supabase"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Merchant & URLs */}
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Merchant & URLs</div>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block text-xs font-medium text-zinc-600">
                    Merchant name
                    <Input
                      className="mt-1"
                      placeholder="POSKART"
                      value={form.merchant_name}
                      onChange={(e) => setForm((f) => ({ ...f, merchant_name: e.target.value }))}
                    />
                  </label>
                  <label className="block text-xs font-medium text-zinc-600">
                    QRIS payload prefix
                    <Input
                      className="mt-1"
                      placeholder="qris://poskart/pay"
                      value={form.qris_payload_prefix}
                      onChange={(e) => setForm((f) => ({ ...f, qris_payload_prefix: e.target.value }))}
                    />
                  </label>
                </div>
                <label className="block text-xs font-medium text-zinc-600">
                  Share base URL
                  <Input
                    className="mt-1"
                    placeholder="https://poskart.app/s"
                    value={form.share_base_url}
                    onChange={(e) => setForm((f) => ({ ...f, share_base_url: e.target.value }))}
                  />
                </label>
              </div>

              {/* Timers */}
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Timers</div>
                <label className="block text-xs font-medium text-zinc-600">
                  Countdown before photo: {form.countdown_duration_seconds}s
                  <Slider
                    min={1}
                    max={10}
                    step={1}
                    value={form.countdown_duration_seconds}
                    onChange={(e) => setForm((f) => ({ ...f, countdown_duration_seconds: Number(e.target.value) }))}
                  />
                </label>
                <label className="block text-xs font-medium text-zinc-600">
                  Flash duration: {form.flash_duration_ms}ms
                  <Slider
                    min={50}
                    max={1000}
                    step={10}
                    value={form.flash_duration_ms}
                    onChange={(e) => setForm((f) => ({ ...f, flash_duration_ms: Number(e.target.value) }))}
                  />
                </label>
                <label className="block text-xs font-medium text-zinc-600">
                  Auto-return to landing: {form.auto_return_duration_seconds}s
                  <Slider
                    min={3}
                    max={30}
                    step={1}
                    value={form.auto_return_duration_seconds}
                    onChange={(e) => setForm((f) => ({ ...f, auto_return_duration_seconds: Number(e.target.value) }))}
                  />
                </label>
              </div>

              {/* Default template */}
              <label className="block text-xs font-medium text-zinc-600">
                Default template (pre-selected in Flutter picker)
                <Select
                  className="mt-1"
                  value={form.default_template_id}
                  onChange={(e) => setForm((f) => ({ ...f, default_template_id: e.target.value }))}
                >
                  <option value="">— None —</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </Select>
              </label>

              {/* Config preview */}
              <div className="rounded-lg bg-zinc-950 p-4">
                <div className="mb-2 text-xs font-medium text-zinc-400">Live config preview (from Supabase)</div>
                <pre className="overflow-x-auto text-xs text-zinc-200">
                  {JSON.stringify(
                    {
                      merchantName: form.merchant_name,
                      qrisPayloadPrefix: form.qris_payload_prefix,
                      shareBaseUrl: form.share_base_url,
                      countdownDurationSeconds: form.countdown_duration_seconds,
                      flashDurationMs: form.flash_duration_ms,
                      autoReturnDurationSeconds: form.auto_return_duration_seconds,
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
