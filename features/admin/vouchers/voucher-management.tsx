"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, Copy, Loader2, Plus, Ticket, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/features/admin/_components/page-header";
import { useBooths } from "@/features/admin/devices/use-devices";
import { usePermission } from "@/features/admin/hooks/use-permission";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { vouchersApi, type VoucherGenerationType } from "@/features/admin/vouchers/api";
import { cn } from "@/lib/utils";

type VoucherForm = {
  name: string;
  generationType: VoucherGenerationType;
  count: string;
  prefix: string;
  startNumber: string;
  reusableCode: string;
  validityDays: string;
  deviceIds: string[];
};

const initialForm: VoucherForm = {
  name: "",
  generationType: "random",
  count: "100",
  prefix: "PROMO",
  startNumber: "1",
  reusableCode: "",
  validityDays: "7",
  deviceIds: [],
};

export function VoucherManagement({
  initialOpen = false,
  initialCampaignId,
  initialCode,
}: {
  initialOpen?: boolean;
  initialCampaignId?: string;
  initialCode?: string;
}) {
  const { data: devices = [], isLoading: devicesLoading } = useBooths();
  const { isReadOnly } = usePermission();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(initialOpen);
  const confirmDelete = useConfirmDialog();
  const [form, setForm] = useState<VoucherForm>(initialForm);
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: adminQueryKeys.vouchers,
    queryFn: vouchersApi.getVoucherCampaigns,
  });
  const generate = useMutation({
    mutationFn: vouchersApi.generateVoucherCampaign,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.vouchers });
      toast.success(`${result.totalCodes} voucher berhasil dibuat dan dialokasikan.`);
      setOpen(false);
      setForm(initialForm);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Gagal membuat voucher."),
  });
  const deleteCampaign = useMutation({
    mutationFn: vouchersApi.deleteVoucherCampaign,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.vouchers });
      toast.success("Voucher campaign berhasil dihapus.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Gagal menghapus voucher campaign."),
  });

  const selectedDevices = useMemo(
    () => devices.filter((device) => form.deviceIds.includes(device.id)),
    [devices, form.deviceIds],
  );
  const allocationPreview = useMemo(() => {
    if (form.generationType === "reusable") return selectedDevices.map((device) => [device.id, 1]);
    const count = Math.max(0, Number.parseInt(form.count, 10) || 0);
    return selectedDevices.map((device, index) => [
      device.id,
      Math.floor(count / selectedDevices.length) + (index < count % selectedDevices.length ? 1 : 0),
    ]);
  }, [form.count, form.generationType, selectedDevices]);

  const update = (patch: Partial<VoucherForm>) => setForm((current) => ({ ...current, ...patch }));
  const toggleDevice = (id: string) => update({
    deviceIds: form.deviceIds.includes(id)
      ? form.deviceIds.filter((deviceId) => deviceId !== id)
      : [...form.deviceIds, id],
  });
  const submit = () => generate.mutate({
    name: form.name,
    generationType: form.generationType,
    count: Number.parseInt(form.count, 10),
    prefix: form.prefix,
    startNumber: Number.parseInt(form.startNumber, 10),
    reusableCode: form.reusableCode,
    validityDays: Number.parseInt(form.validityDays, 10),
    deviceIds: form.deviceIds,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vouchers"
        description="Generate voucher dan alokasikan langsung ke device agar tetap dapat digunakan offline."
        action={<Button disabled={isReadOnly("vouchers")} onClick={() => setOpen(true)}><Plus className="mr-2 size-4" />Generate voucher</Button>}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Campaigns" value={campaigns.length} />
        <Metric label="Voucher generated" value={campaigns.reduce((total, campaign) => total + campaign.totalCodes, 0)} />
        <Metric label="Assigned devices" value={new Set(campaigns.flatMap((campaign) => campaign.allocations.map((allocation) => allocation.deviceId))).size} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Voucher campaigns</CardTitle>
          <CardDescription>Voucher hanya akan tersedia pada device yang mendapat allocation.</CardDescription>
        </CardHeader>
        <CardContent>
          {campaignsLoading ? <div className="flex justify-center py-10"><Loader2 className="size-5 animate-spin text-zinc-400" /></div> : campaigns.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 px-5 py-12 text-center text-sm text-zinc-500">Belum ada voucher campaign.</div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {campaigns.map((campaign) => <CampaignRow key={campaign.id} campaign={campaign} deleting={deleteCampaign.isPending} readOnly={isReadOnly("vouchers")} highlighted={campaign.id === initialCampaignId} highlightedCode={campaign.id === initialCampaignId ? initialCode : undefined} onDelete={() => confirmDelete.confirm({
                title: "Hapus voucher campaign?",
                description: `Campaign “${campaign.name}”, seluruh kode voucher, dan allocation device akan dihapus. Voucher yang sudah tersimpan pada device offline baru hilang saat perangkat kembali sync.`,
                confirmLabel: "Hapus campaign",
                destructive: true,
                onConfirm: () => deleteCampaign.mutate(campaign.id),
              })} />)}
            </div>
          )}
        </CardContent>
      </Card>
      {confirmDelete.dialog}

      <Dialog open={open} onOpenChange={setOpen} title="Generate voucher" className="max-w-3xl">
        <div className="space-y-5">
          <Tabs defaultValue="random" value={form.generationType} onValueChange={(value) => update({ generationType: value as VoucherGenerationType })}>
            <TabsList className="w-full"><TabsTrigger className="flex-1" value="random">Random</TabsTrigger><TabsTrigger className="flex-1" value="sequential">Berurutan</TabsTrigger><TabsTrigger className="flex-1" value="reusable">Reusable</TabsTrigger></TabsList>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-medium text-zinc-600 sm:col-span-2">Nama campaign<Input className="mt-1" value={form.name} onChange={(event) => update({ name: event.target.value })} placeholder="Contoh: Promo MPLS 2026" /></label>
              {form.generationType !== "reusable" ? <label className="text-xs font-medium text-zinc-600">Jumlah voucher<Input className="mt-1" type="number" min="1" max="5000" value={form.count} onChange={(event) => update({ count: event.target.value })} /></label> : null}
              <label className="text-xs font-medium text-zinc-600">Masa berlaku<Select className="mt-1" value={form.validityDays} onChange={(event) => update({ validityDays: event.target.value })}><option value="1">1 hari</option><option value="3">3 hari</option><option value="7">7 hari</option><option value="14">14 hari</option><option value="30">30 hari</option></Select></label>
            </div>
            <TabsContent value="random"><p className="rounded-xl bg-zinc-50 p-3 text-xs leading-5 text-zinc-500">Kode unik acak dibuat server lalu dibagi rata ke device terpilih.</p></TabsContent>
            <TabsContent value="sequential"><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-medium text-zinc-600">Prefix<Input className="mt-1" value={form.prefix} maxLength={12} onChange={(event) => update({ prefix: event.target.value.toUpperCase() })} placeholder="PROMO" /></label><label className="text-xs font-medium text-zinc-600">Nomor awal<Input className="mt-1" type="number" min="1" value={form.startNumber} onChange={(event) => update({ startNumber: event.target.value })} /></label></div></TabsContent>
            <TabsContent value="reusable"><label className="block text-xs font-medium text-zinc-600">Kode voucher reusable<Input className="mt-1" value={form.reusableCode} maxLength={32} onChange={(event) => update({ reusableCode: event.target.value.toUpperCase() })} placeholder="MPLS2026" /></label></TabsContent>
          </Tabs>

          <section className="rounded-2xl border border-zinc-200 p-4">
            <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-semibold">Assign to devices</h3><p className="mt-1 text-xs text-zinc-500">Hanya device ini yang akan menerima voucher saat sinkronisasi.</p></div><Button type="button" variant="outline" size="sm" disabled={devicesLoading || devices.length === 0} onClick={() => update({ deviceIds: form.deviceIds.length === devices.length ? [] : devices.map((device) => device.id) })}>{form.deviceIds.length === devices.length ? "Clear all" : "Select all"}</Button></div>
            <div className="mt-4 grid max-h-44 gap-2 overflow-y-auto sm:grid-cols-2">
              {devices.map((device) => { const selected = form.deviceIds.includes(device.id); return <button key={device.id} type="button" onClick={() => toggleDevice(device.id)} className={cn("flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm", selected ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400")}><span className={cn("grid size-4 place-items-center rounded border", selected ? "border-white/50" : "border-zinc-300")}>{selected ? <Check className="size-3" /> : null}</span><span className="min-w-0 truncate">{device.name}</span></button>; })}
            </div>
            {selectedDevices.length > 0 ? <div className="mt-4 rounded-xl bg-zinc-50 p-3 text-xs text-zinc-600"><span className="font-medium text-zinc-900">Allocation preview: </span>{selectedDevices.map((device, index) => `${device.name} ${allocationPreview[index]?.[1] ?? 0}`).join(" · ")}</div> : null}
          </section>
          <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="button" disabled={generate.isPending || form.deviceIds.length === 0} onClick={submit}>{generate.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Ticket className="mr-2 size-4" />}Generate & assign</Button></div>
        </div>
      </Dialog>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <Card><CardContent className="p-5"><p className="text-sm text-zinc-500">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight">{value.toLocaleString("id-ID")}</p></CardContent></Card>;
}

function CampaignRow({ campaign, deleting, readOnly, highlighted, highlightedCode, onDelete }: { campaign: Awaited<ReturnType<typeof vouchersApi.getVoucherCampaigns>>[number]; deleting: boolean; readOnly: boolean; highlighted?: boolean; highlightedCode?: string; onDelete: () => void }) {
  const [open, setOpen] = useState(Boolean(highlighted));
  const rowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!highlighted) return;
    const frame = window.requestAnimationFrame(() => {
      rowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [highlighted]);
  const copyVoucherCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`Kode voucher ${code} berhasil disalin.`);
    } catch {
      toast.error("Kode voucher tidak dapat disalin.");
    }
  };

  return <Collapsible ref={rowRef} open={open} onOpenChange={setOpen} className={cn("py-4", highlighted && "rounded-2xl bg-blue-50/70 px-3 ring-1 ring-blue-200")}>
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="flex items-center gap-2"><p className="font-semibold text-zinc-900">{campaign.name}</p><Badge variant="secondary">{campaign.generationType}</Badge></div>
        <p className="mt-1 text-xs text-zinc-500">{campaign.totalCodes} voucher · {campaign.allocations.map((allocation) => `${allocation.deviceName} (${allocation.allocatedCount})`).join(", ")}</p>
      </div>
      <div className="flex items-center gap-2"><p className="text-xs text-zinc-500">{campaign.expiresAt ? `Berakhir ${new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(campaign.expiresAt))}` : "Tidak ada masa berlaku"}</p><CollapsibleTrigger asChild><Button type="button" variant="outline" size="sm">{open ? "Hide codes" : `Show ${campaign.codes.length} codes`}<ChevronDown className={cn("ml-2 size-4 transition-transform", open && "rotate-180")} /></Button></CollapsibleTrigger><Button type="button" variant="outline" size="icon" disabled={readOnly || deleting} onClick={onDelete} aria-label={`Delete ${campaign.name}`} className="text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"><Trash2 className="size-4" /></Button></div>
    </div>
    <CollapsibleContent className="pt-4">
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-3">
        <p className="mb-3 text-xs font-medium text-zinc-500">Kode voucher dan device allocation</p>
        <div className="flex flex-wrap gap-2">{campaign.codes.map((voucher, index) => { const used = !voucher.reusable && voucher.redemptionCount > 0; const isHighlightedCode = highlightedCode?.toLocaleUpperCase() === voucher.code.toLocaleUpperCase(); return <div key={`${voucher.code}-${voucher.deviceName}-${index}`} className={cn("flex items-center rounded-lg border py-1.5 pl-2.5 pr-1.5 text-xs", used ? "border-red-200 bg-red-50 text-red-700" : "border-zinc-200 bg-white", isHighlightedCode && "ring-2 ring-blue-500 ring-offset-2")}><span className="font-mono font-semibold">{voucher.code}</span><button type="button" onClick={() => void copyVoucherCode(voucher.code)} aria-label={`Copy voucher code ${voucher.code}`} title="Copy voucher code" className={cn("ml-1.5 grid size-5 place-items-center rounded transition-colors", used ? "text-red-500 hover:bg-red-100" : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700")}><Copy className="size-3.5" /></button><span className={cn("ml-1", used ? "text-red-500" : "text-zinc-400")}>{used ? "Used" : voucher.reusable && voucher.redemptionCount > 0 ? `Used ${voucher.redemptionCount}×` : voucher.deviceName}</span>{!used && voucher.reusable ? <span className="ml-1.5 text-zinc-400">{voucher.deviceName}</span> : null}</div>; })}</div>
      </div>
    </CollapsibleContent>
  </Collapsible>;
}
