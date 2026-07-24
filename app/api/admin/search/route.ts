import { NextRequest, NextResponse } from "next/server";
import {
  getAdminContext,
  getAdminMembership,
} from "@/server/admin/context";
import type {
  GlobalSearchResult,
  GlobalSearchResponse,
} from "@/features/admin/search/types";

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 80;
const RESULT_LIMIT = 5;

type TransactionSearchRow = {
  id: string;
  booth: string | null;
  customer: string | null;
  package_name: string | null;
  status: string | null;
  created_at: string | null;
};

type DeviceSearchRow = {
  id: string;
  name: string | null;
  location: string | null;
  status: string | null;
};

type GallerySearchRow = {
  id: string;
  device_id: string | null;
  template_name: string | null;
  theme_name: string | null;
  created_at: string | null;
};

type VoucherCampaignSearchRow = {
  id: string;
  name: string;
  generation_type: string;
  total_codes: number;
};

type VoucherCodeSearchRow = {
  id: string;
  code: string;
  campaign_id: string;
  reusable: boolean;
  redemption_count: number;
};

type TemplateSearchRow = {
  id: string;
  name: string;
  category: string | null;
  status: string | null;
};

type ThemeSearchRow = {
  id: string;
  name: string;
  status: string | null;
  is_active: boolean | null;
};

function normalizeQuery(value: string | null) {
  return (value ?? "")
    .replace(/[%(),]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_QUERY_LENGTH);
}

function formatDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function uniqueResults(results: GlobalSearchResult[]) {
  const seen = new Set<string>();
  return results.filter((result) => {
    const key = `${result.kind}:${result.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function GET(request: NextRequest) {
  const query = normalizeQuery(request.nextUrl.searchParams.get("q"));
  if (query.length < MIN_QUERY_LENGTH) {
    return NextResponse.json<GlobalSearchResponse>({
      query,
      results: [],
    });
  }

  try {
    const [{ supabase }, membership] = await Promise.all([
      getAdminContext(),
      getAdminMembership(),
    ]);

    if (!membership) {
      return NextResponse.json(
        { error: "Organization not found." },
        { status: 403 },
      );
    }

    const organizationId = membership.organizationId;
    const pattern = `%${query}%`;
    const canSearchVouchers = ["owner", "admin", "designer"].includes(
      membership.role,
    );

    const [
      transactionsResult,
      devicesResult,
      galleryResult,
      voucherCampaignsResult,
      voucherCodesResult,
      templatesResult,
      themesResult,
    ] = await Promise.all([
      supabase
        .from("transactions")
        .select("id,booth,customer,package_name,status,created_at")
        .eq("organization_id", organizationId)
        .or(
          `id.ilike.${pattern},booth.ilike.${pattern},customer.ilike.${pattern},package_name.ilike.${pattern}`,
        )
        .order("created_at", { ascending: false })
        .limit(RESULT_LIMIT),
      supabase
        .from("devices")
        .select("id,name,location,status")
        .eq("organization_id", organizationId)
        .or(`id.ilike.${pattern},name.ilike.${pattern},location.ilike.${pattern}`)
        .order("name", { ascending: true })
        .limit(RESULT_LIMIT),
      supabase
        .from("gallery_sessions")
        .select("id,device_id,template_name,theme_name,created_at")
        .eq("organization_id", organizationId)
        .or(
          `id.ilike.${pattern},device_id.ilike.${pattern},template_name.ilike.${pattern},theme_name.ilike.${pattern}`,
        )
        .order("created_at", { ascending: false })
        .limit(RESULT_LIMIT),
      canSearchVouchers
        ? supabase
            .from("voucher_campaigns")
            .select("id,name,generation_type,total_codes")
            .eq("organization_id", organizationId)
            .ilike("name", pattern)
            .order("created_at", { ascending: false })
            .limit(RESULT_LIMIT)
        : Promise.resolve({ data: [], error: null }),
      canSearchVouchers
        ? supabase
            .from("voucher_codes")
            .select("id,code,campaign_id,reusable,redemption_count")
            .eq("organization_id", organizationId)
            .ilike("code", pattern)
            .order("updated_at", { ascending: false })
            .limit(RESULT_LIMIT)
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("templates")
        .select("id,name,category,status")
        .eq("organization_id", organizationId)
        .or(`id.ilike.${pattern},name.ilike.${pattern}`)
        .order("updated_at", { ascending: false })
        .limit(RESULT_LIMIT),
      supabase
        .from("layout_schemas")
        .select("id,name,status,is_active")
        .eq("organization_id", organizationId)
        .or(`id.ilike.${pattern},name.ilike.${pattern}`)
        .order("updated_at", { ascending: false })
        .limit(RESULT_LIMIT),
    ]);

    const failedResult = [
      transactionsResult,
      devicesResult,
      galleryResult,
      voucherCampaignsResult,
      voucherCodesResult,
      templatesResult,
      themesResult,
    ].find((result) => result.error);

    if (failedResult?.error) {
      throw new Error(failedResult.error.message);
    }

    const transactions = (transactionsResult.data ??
      []) as TransactionSearchRow[];
    const devices = (devicesResult.data ?? []) as DeviceSearchRow[];
    const galleries = (galleryResult.data ?? []) as GallerySearchRow[];
    const voucherCampaigns = (voucherCampaignsResult.data ??
      []) as VoucherCampaignSearchRow[];
    const voucherCodes = (voucherCodesResult.data ??
      []) as VoucherCodeSearchRow[];
    const templates = (templatesResult.data ?? []) as TemplateSearchRow[];
    const themes = (themesResult.data ?? []) as ThemeSearchRow[];

    const results = uniqueResults([
      ...transactions.map(
        (transaction): GlobalSearchResult => ({
          id: transaction.id,
          kind: "transaction",
          title: transaction.id,
          description: [
            transaction.booth,
            transaction.customer,
            transaction.package_name,
            transaction.status,
            formatDate(transaction.created_at),
          ]
            .filter(Boolean)
            .join(" · "),
          href: `/transactions?search=${encodeURIComponent(transaction.id)}`,
        }),
      ),
      ...devices.map(
        (device): GlobalSearchResult => ({
          id: device.id,
          kind: "device",
          title: device.name || device.id,
          description: [device.id, device.location, device.status]
            .filter(Boolean)
            .join(" · "),
          href: `/devices?device=${encodeURIComponent(device.id)}`,
        }),
      ),
      ...galleries.map(
        (gallery): GlobalSearchResult => ({
          id: gallery.id,
          kind: "gallery",
          title: gallery.id,
          description: [
            gallery.device_id,
            gallery.template_name || gallery.theme_name,
            formatDate(gallery.created_at),
          ]
            .filter(Boolean)
            .join(" · "),
          href: `/s/${encodeURIComponent(gallery.id)}`,
        }),
      ),
      ...voucherCampaigns.map(
        (campaign): GlobalSearchResult => ({
          id: campaign.id,
          kind: "voucher",
          title: campaign.name,
          description: `${campaign.generation_type} · ${campaign.total_codes} voucher`,
          href: `/vouchers?campaign=${encodeURIComponent(campaign.id)}`,
        }),
      ),
      ...voucherCodes.map(
        (voucher): GlobalSearchResult => ({
          id: voucher.id,
          kind: "voucher",
          title: voucher.code,
          description: voucher.reusable
            ? `Reusable · used ${voucher.redemption_count}×`
            : voucher.redemption_count > 0
              ? "Voucher used"
              : "Voucher available",
          href: `/vouchers?campaign=${encodeURIComponent(voucher.campaign_id)}&code=${encodeURIComponent(voucher.code)}`,
        }),
      ),
      ...templates.map(
        (template): GlobalSearchResult => ({
          id: template.id,
          kind: "template",
          title: template.name,
          description: [template.category, template.status]
            .filter(Boolean)
            .join(" · "),
          href: `/templates/builder/${encodeURIComponent(template.id)}`,
        }),
      ),
      ...themes.map(
        (theme): GlobalSearchResult => ({
          id: theme.id,
          kind: "theme",
          title: theme.name,
          description: [
            theme.status,
            theme.is_active ? "Active theme" : null,
          ]
            .filter(Boolean)
            .join(" · "),
          href: `/themes/builder/${encodeURIComponent(theme.id)}`,
        }),
      ),
    ]);

    return NextResponse.json<GlobalSearchResponse>(
      { query, results },
      {
        headers: {
          "Cache-Control": "private, max-age=30, stale-while-revalidate=30",
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to search workspace.";
    const status = message === "Not authenticated" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
