"use client";

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { getSubscriptionCampaigns, saveSubscriptionCampaign, getSubscriptionCampaignAudit } from '@/server/admin/actions/subscription-campaign-actions';
import type { SubscriptionCampaign } from '@/types/subscription-campaign';
import type { SubscriptionPlan } from '@/types/pricing';
import { formatCurrency } from '@/lib/utils';

// datetime-local is explicitly interpreted as Jakarta, not the browser timezone.
function jakartaInput(value: string) {
  return new Date(new Date(value).getTime() + 7 * 3600_000).toISOString().slice(0, 16);
}
function campaignStatus(c: SubscriptionCampaign) {
  if (c.status !== 'published') return c.status;
  if (Date.now() < Date.parse(c.starts_at)) return 'scheduled';
  return Date.now() >= Date.parse(c.ends_at) ? 'expired' : 'active';
}
function newCampaign(): SubscriptionCampaign {
  return { id: '', name: '', description: '', code: '', application_mode: 'voucher', status: 'draft',
    starts_at: new Date().toISOString(), ends_at: new Date(Date.now() + 14 * 86400_000).toISOString(),
    discount_type: 'percentage', discount_value: 20, discount_tiers: [], max_discount: null, min_amount: 0,
    plan_ids: [], audience: 'all', usage_limit: null, per_organization_limit: 1 };
}

export function SubscriptionCampaignManagement({ plans }: { plans: SubscriptionPlan[] }) {
  const cache = useQueryClient();
  const query = useQuery({ queryKey: ['subscription-campaigns'], queryFn: getSubscriptionCampaigns });
  const [editing, setEditing] = useState<SubscriptionCampaign | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const history = useQuery({ queryKey: ['subscription-campaign-audit', historyId], queryFn: () => getSubscriptionCampaignAudit(historyId!), enabled: !!historyId });
  const mutation = useMutation({ mutationFn: saveSubscriptionCampaign,
    onSuccess: () => { void cache.invalidateQueries({ queryKey: ['subscription-campaigns'] }); setEditing(null); toast.success('Kampanye tersimpan'); },
    onError: (error: Error) => toast.error(error.message) });
  const inputClass = 'mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm';
  const patch = (value: Partial<SubscriptionCampaign>) => setEditing((current) => current ? { ...current, ...value } : null);

  return <section className="space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-5">
      <div><h2 className="text-lg font-semibold">Subscription campaigns</h2><p className="mt-1 text-sm text-zinc-500">Promo paket SaaS, terpisah dari voucher photobooth. Satu voucher per checkout, tidak ditumpuk.</p></div>
      <Button onClick={() => setEditing(newCampaign())}>Buat kampanye</Button>
    </div>
    <p className="text-xs leading-5 text-zinc-500">Kuota dihitung per invoice yang diterbitkan, termasuk pending atau dibatalkan, untuk mencegah penggunaan ganda dari pembayaran terlambat. Invoice yang sudah dibuat menyimpan harga promo dan tidak berubah saat kampanye diedit.</p>
    {query.isPending ? <p role="status">Memuat kampanye…</p> : query.isError ? <div role="alert" className="rounded-xl border border-red-200 p-4 text-sm text-red-700">{query.error.message}<Button variant="outline" onClick={() => void query.refetch()} className="ml-3">Coba lagi</Button></div> : !query.data?.length ? <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500">Belum ada kampanye. Buat Christmas Sale atau promo dua minggu pertama Anda.</div> :
      <div className="grid gap-4 lg:grid-cols-2">{query.data.map((campaign) => <article key={campaign.id} className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{campaign.name}</h3><p className="mt-1 text-sm text-[#014EB4]">{campaign.application_mode === 'automatic' ? 'Otomatis · tanpa kode voucher' : campaign.code}</p></div><span className="rounded-full bg-zinc-100 px-3 py-1 text-xs capitalize">{campaignStatus(campaign)}</span></div>
        <p className="text-sm text-zinc-600">{campaign.discount_tiers.length ? 'Hingga ' : ''}{campaign.discount_type === 'percentage' ? `${Math.max(campaign.discount_value, ...campaign.discount_tiers.map((tier) => tier.value))}%` : formatCurrency(Math.max(campaign.discount_value, ...campaign.discount_tiers.map((tier) => tier.value)))} diskon{campaign.max_discount ? ` · Maks. ${formatCurrency(campaign.max_discount)}` : ''} · Min. {formatCurrency(campaign.min_amount)}</p>
        <p className="text-xs text-zinc-500">{new Date(campaign.starts_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} — {new Date(campaign.ends_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</p>
        <div className="grid grid-cols-3 gap-3 border-y border-zinc-100 py-3 text-xs text-zinc-500"><div>Invoice<p className="mt-1 font-semibold text-zinc-950">{campaign.issued} / {campaign.usage_limit ?? '∞'}</p></div><div>Terbayar<p className="mt-1 font-semibold text-zinc-950">{campaign.paid}</p></div><div>Total diskon<p className="mt-1 font-semibold text-zinc-950">{formatCurrency(campaign.total_discount ?? 0)}</p></div></div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={mutation.isPending} onClick={() => setEditing(campaign)}>Edit</Button>
          <Button variant="outline" onClick={() => { setHistoryId(campaign.id); void cache.invalidateQueries({ queryKey: ['subscription-campaign-audit', campaign.id] }); }}>Riwayat</Button>
          <Button variant="outline" disabled={mutation.isPending} onClick={() => setEditing({ ...campaign, id: '', name: `${campaign.name} copy`, code: '', status: 'draft' })}>Duplikat</Button>
          {campaign.status === 'published' ? <Button variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate({ ...campaign, status: 'paused' })}>Pause</Button> : null}
          {campaign.status !== 'archived' ? <Button variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate({ ...campaign, status: 'archived' })}>Arsipkan</Button> : null}
        </div>
      </article>)}</div>}
    <Dialog open={!!historyId} onOpenChange={(open) => { if (!open) setHistoryId(null); }} title="Riwayat perubahan kampanye">
      <p className="mb-4 text-xs text-zinc-500">50 perubahan terbaru · Waktu Indonesia Barat</p>
      {history.isPending ? <p>Memuat riwayat…</p> : history.isError ? <p role="alert" className="text-red-700">{history.error.message}</p> : <div className="space-y-4">{history.data?.map((entry) => <article key={entry.id} className="rounded-lg border border-zinc-200 p-3 text-xs">
        <p className="font-semibold">{entry.before_data ? 'Kampanye diperbarui' : 'Kampanye dibuat'} · {new Date(entry.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</p>
        <p className="mt-1 break-all text-zinc-500">Admin: {entry.actor_id ?? 'Tidak tersedia'}</p>
        <ul className="mt-2 space-y-1">{(Object.keys(entry.after_data) as Array<keyof SubscriptionCampaign>).filter((key) => !['updated_at', 'updated_by', 'created_at', 'created_by', 'id'].includes(key) && JSON.stringify(entry.before_data?.[key]) !== JSON.stringify(entry.after_data[key])).map((key) => <li key={key} className="break-words"><span className="font-medium">{key}</span>: {JSON.stringify(entry.before_data?.[key]) ?? '—'} → {JSON.stringify(entry.after_data[key])}</li>)}</ul>
      </article>)}</div>}
    </Dialog>
    <Dialog open={!!editing} onOpenChange={(open) => { if (!open && !mutation.isPending) setEditing(null); }} title={editing?.id ? 'Edit kampanye subscription' : 'Buat kampanye subscription'}>
      {editing ? <form onSubmit={(event) => { event.preventDefault(); mutation.mutate(editing); }} className="space-y-4">
        <fieldset disabled={mutation.isPending} className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">Nama kampanye<input required maxLength={120} className={inputClass} value={editing.name} onChange={(e) => patch({ name: e.target.value })} /></label>
          <label className="text-sm">Cara menerapkan promo<select className={inputClass} value={editing.application_mode} onChange={(e) => patch({ application_mode: e.target.value as SubscriptionCampaign['application_mode'] })}><option value="voucher">Kode voucher</option><option value="automatic">Otomatis saat checkout</option></select></label>
          {editing.application_mode === 'voucher' ? <label className="text-sm sm:col-span-2">Kode voucher<input required minLength={3} maxLength={40} pattern="[A-Z0-9_-]{3,40}" placeholder="XMAS20" className={inputClass} value={editing.code} onChange={(e) => patch({ code: e.target.value.toUpperCase() })} /></label> : <p className="rounded-lg bg-blue-50 p-3 text-xs leading-5 text-blue-900 sm:col-span-2">Langsung diterapkan bagi organisasi yang memenuhi syarat selama periode promo. Jika beberapa promo otomatis cocok, diskon terbesar dipilih. Voucher manual menggantikan promo otomatis, tidak ditumpuk.</p>}
          <label className="text-sm sm:col-span-2">Deskripsi<textarea maxLength={2000} className={inputClass} value={editing.description} onChange={(e) => patch({ description: e.target.value })} /></label>
          <label className="text-sm">Mulai (WIB)<input required type="datetime-local" className={inputClass} value={jakartaInput(editing.starts_at)} onChange={(e) => { if (e.target.value) patch({ starts_at: new Date(`${e.target.value}+07:00`).toISOString() }); }} /></label>
          <label className="text-sm">Berakhir, eksklusif (WIB)<input required type="datetime-local" className={inputClass} value={jakartaInput(editing.ends_at)} onChange={(e) => { if (e.target.value) patch({ ends_at: new Date(`${e.target.value}+07:00`).toISOString() }); }} /></label>
          <label className="text-sm">Jenis diskon<select className={inputClass} value={editing.discount_type} onChange={(e) => patch({ discount_type: e.target.value as SubscriptionCampaign['discount_type'], discount_value: 20 })}><option value="percentage">Persentase</option><option value="fixed">Nominal Rupiah</option></select></label>
          <label className="text-sm">Nilai diskon<input required type="number" min={1} max={editing.discount_type === 'percentage' ? 100 : 2_000_000_000} className={inputClass} value={editing.discount_value} onChange={(e) => patch({ discount_value: Number(e.target.value) })} /></label>
          <div className="space-y-2 sm:col-span-2">
            <p className="text-sm font-medium">Diskon bertingkat (opsional)</p>
            <p className="text-xs text-zinc-500">Tier dengan minimum tertinggi yang terpenuhi digunakan. Jika tidak ada tier cocok, nilai diskon utama berlaku.</p>
            {editing.discount_tiers.map((tier, index) => <div key={index} className="flex items-end gap-2">
              <label className="min-w-0 flex-1 text-xs">Minimum subtotal (Rp)<input type="number" min={0} required className={inputClass} value={tier.minAmount} onChange={(e) => patch({ discount_tiers: editing.discount_tiers.map((item, i) => i === index ? { ...item, minAmount: Number(e.target.value) } : item) })} /></label>
              <label className="min-w-0 flex-1 text-xs">Diskon ({editing.discount_type === 'percentage' ? '%' : 'Rp'})<input type="number" min={1} max={editing.discount_type === 'percentage' ? 100 : 2_000_000_000} required className={inputClass} value={tier.value} onChange={(e) => patch({ discount_tiers: editing.discount_tiers.map((item, i) => i === index ? { ...item, value: Number(e.target.value) } : item) })} /></label>
              <Button type="button" variant="outline" aria-label={`Hapus tier ${index + 1}`} onClick={() => patch({ discount_tiers: editing.discount_tiers.filter((_, i) => i !== index) })}>Hapus</Button>
            </div>)}
            <Button type="button" variant="outline" disabled={editing.discount_tiers.length >= 20} onClick={() => patch({ discount_tiers: [...editing.discount_tiers, { minAmount: 0, value: 10 }] })}>Tambah tier</Button>
          </div>
          <label className="text-sm">Minimum checkout (Rp)<input required type="number" min={0} className={inputClass} value={editing.min_amount} onChange={(e) => patch({ min_amount: Number(e.target.value) })} /></label>
          <label className="text-sm">Maksimal diskon (Rp, opsional)<input type="number" min={1} className={inputClass} value={editing.max_discount ?? ''} onChange={(e) => patch({ max_discount: e.target.value ? Number(e.target.value) : null })} /></label>
          <label className="text-sm">Kuota invoice (kosong = tanpa batas)<input type="number" min={1} className={inputClass} value={editing.usage_limit ?? ''} onChange={(e) => patch({ usage_limit: e.target.value ? Number(e.target.value) : null })} /></label>
          <label className="text-sm">Kuota per organisasi<input required type="number" min={1} className={inputClass} value={editing.per_organization_limit} onChange={(e) => patch({ per_organization_limit: Number(e.target.value) })} /></label>
          <label className="text-sm">Target organisasi<select className={inputClass} value={editing.audience} onChange={(e) => patch({ audience: e.target.value as SubscriptionCampaign['audience'] })}><option value="all">Semua</option><option value="new">Belum pernah membayar subscription</option><option value="existing">Sudah pernah membayar subscription</option></select></label>
          <label className="text-sm">Status<select className={inputClass} value={editing.status} onChange={(e) => patch({ status: e.target.value as SubscriptionCampaign['status'] })}><option value="draft">Draft</option><option value="published">Publish (aktif sesuai jadwal)</option><option value="paused">Paused</option><option value="archived">Archived</option></select></label>
          <div className="sm:col-span-2"><p className="text-sm">Target paket (tidak dicentang = semua paket)</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{plans.map((plan) => <label key={plan.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.plan_ids.includes(plan.id)} onChange={(e) => patch({ plan_ids: e.target.checked ? [...editing.plan_ids, plan.id] : editing.plan_ids.filter((id) => id !== plan.id) })} />{plan.name} · {plan.durationMonths} bulan</label>)}</div></div>
        </fieldset>
        <p className="rounded-lg bg-blue-50 p-3 text-xs leading-5 text-blue-900">Diskon dihitung dari subtotal paket + device tambahan. Tidak digabung dengan voucher lain. Total pembayaran minimal Rp1. Untuk seluruh Desember, atur 1 Desember 00:00 sampai 1 Januari 00:00 WIB.</p>
        <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Menyimpan…' : 'Simpan kampanye'}</Button>
      </form> : null}
    </Dialog>
  </section>;
}
