"use server";

import { randomBytes } from "crypto";
import { verifyRole } from "@/server/admin/context";

export type VoucherGenerationType = "random" | "sequential" | "reusable";

export type GenerateVoucherInput = {
  name: string;
  generationType: VoucherGenerationType;
  deviceIds: string[];
  count?: number;
  prefix?: string;
  startNumber?: number;
  reusableCode?: string;
  validityDays: number;
};

export type VoucherCampaignSummary = {
  id: string;
  name: string;
  generationType: VoucherGenerationType;
  totalCodes: number;
  expiresAt: string | null;
  createdAt: string;
  allocations: Array<{
    id: string;
    deviceId: string;
    deviceName: string;
    allocatedCount: number;
  }>;
  codes: Array<{
    code: string;
    deviceName: string;
    reusable: boolean;
    redemptionCount: number;
  }>;
};

const RANDOM_DIGITS = "0123456789";
const MAX_CODES_PER_GENERATION = 5_000;

export async function getVoucherCampaigns(): Promise<VoucherCampaignSummary[]> {
  const { supabase } = await verifyRole(["owner", "admin", "designer"]);
  const { data, error } = await supabase
    .from("voucher_campaigns")
    .select(
      "id,name,generation_type,total_codes,expires_at,created_at,voucher_allocations(id,device_id,allocated_count,devices(name),voucher_codes(code,reusable,redemption_count))",
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Unable to load voucher campaigns: ${error.message}`);

  return (data ?? []).map((campaign) => ({
    id: campaign.id,
    name: campaign.name,
    generationType: campaign.generation_type as VoucherGenerationType,
    totalCodes: campaign.total_codes,
    expiresAt: campaign.expires_at,
    createdAt: campaign.created_at,
    allocations: ((campaign.voucher_allocations ?? []) as Array<{
      id: string;
      device_id: string;
      allocated_count: number;
      devices: { name: string }[] | { name: string } | null;
      voucher_codes: Array<{ code: string; reusable: boolean; redemption_count: number }> | null;
    }>).map((allocation) => ({
      id: allocation.id,
      deviceId: allocation.device_id,
      deviceName: firstRelation(allocation.devices)?.name ?? "Unknown device",
      allocatedCount: allocation.allocated_count,
    })),
    codes: ((campaign.voucher_allocations ?? []) as Array<{
      devices: { name: string }[] | { name: string } | null;
      voucher_codes: Array<{ code: string; reusable: boolean; redemption_count: number }> | null;
    }>).flatMap((allocation) =>
      (allocation.voucher_codes ?? []).map((voucher) => ({
        code: voucher.code,
        deviceName: firstRelation(allocation.devices)?.name ?? "Unknown device",
        reusable: voucher.reusable,
        redemptionCount: voucher.redemption_count,
      })),
    ),
  }));
}

export async function deleteVoucherCampaign(id: string): Promise<void> {
  const { supabase } = await verifyRole(["owner", "admin"]);
  const { error } = await supabase.from("voucher_campaigns").delete().eq("id", id);
  if (error) throw new Error(`Unable to delete voucher campaign: ${error.message}`);
}

function firstRelation<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function generateVoucherCampaign(
  input: GenerateVoucherInput,
): Promise<{ campaignId: string; totalCodes: number }> {
  const { supabase, organizationId, user } = await verifyRole(["owner", "admin"]);
  const name = input.name.trim();
  const deviceIds = Array.from(
    new Set(input.deviceIds.map((id) => id.trim()).filter(Boolean)),
  );
  if (!name) throw new Error("Voucher campaign name is required.");
  if (deviceIds.length === 0) throw new Error("Select at least one device.");

  const validityDays = normalizeValidityDays(input.validityDays);
  const expiresAt = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000);

  const { data: devices, error: devicesError } = await supabase
    .from("devices")
    .select("id")
    .in("id", deviceIds);
  if (devicesError) throw new Error(`Unable to validate devices: ${devicesError.message}`);
  if ((devices ?? []).length !== deviceIds.length) {
    throw new Error("One or more selected devices are not available.");
  }

  const generationType = input.generationType;
  const count = normalizeCount(input.count);
  const prefix = normalizePrefix(input.prefix);
  const startNumber = normalizeStartNumber(input.startNumber);
  const reusableCode = normalizeReusableCode(input.reusableCode);

  if (generationType === "sequential" && !prefix) {
    throw new Error("Sequential vouchers require a prefix.");
  }
  if (generationType === "reusable" && !reusableCode) {
    throw new Error("Reusable vouchers require a code.");
  }

  const codes =
    generationType === "random"
      ? createRandomCodes(count)
      : generationType === "sequential"
        ? createSequentialCodes(prefix, startNumber, count)
        : [reusableCode];
  const totalCodes = generationType === "reusable" ? deviceIds.length : codes.length;

  const { data: campaign, error: campaignError } = await supabase
    .from("voucher_campaigns")
    .insert({
      organization_id: organizationId,
      name,
      generation_type: generationType,
      prefix: generationType === "sequential" ? prefix : null,
      reusable_code: generationType === "reusable" ? reusableCode : null,
      total_codes: totalCodes,
      expires_at: expiresAt?.toISOString() ?? null,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (campaignError || !campaign) {
    throw new Error(`Unable to create voucher campaign: ${campaignError?.message ?? "Unknown error"}`);
  }

  const codesByDevice = distributeCodes(codes, deviceIds);
  const allocationsToCreate = deviceIds.map((deviceId) => ({
    organization_id: organizationId,
    campaign_id: campaign.id,
    device_id: deviceId,
    allocated_count:
      generationType === "reusable" ? 1 : codesByDevice.get(deviceId)?.length ?? 0,
    updated_at: new Date().toISOString(),
  }));
  const { data: allocations, error: allocationError } = await supabase
    .from("voucher_allocations")
    .insert(allocationsToCreate)
    .select("id,device_id");
  if (allocationError || !allocations) {
    throw new Error(`Unable to allocate vouchers: ${allocationError?.message ?? "Unknown error"}`);
  }

  const allocationByDevice = new Map(allocations.map((item) => [item.device_id, item.id]));
  const voucherRows = deviceIds.flatMap((deviceId) => {
    const deviceCodes = generationType === "reusable"
      ? [reusableCode]
      : codesByDevice.get(deviceId) ?? [];
    return deviceCodes.map((code) => ({
      organization_id: organizationId,
      campaign_id: campaign.id,
      allocation_id: allocationByDevice.get(deviceId),
      code,
      reusable: generationType === "reusable",
      updated_at: new Date().toISOString(),
    }));
  });
  const { error: codesError } = await supabase.from("voucher_codes").insert(voucherRows);
  if (codesError) {
    throw new Error(`Voucher campaign created, but codes could not be saved: ${codesError.message}`);
  }

  return { campaignId: campaign.id, totalCodes };
}

function normalizeCount(value: number | undefined) {
  const count = Math.trunc(value ?? 0);
  if (!Number.isFinite(count) || count < 1 || count > MAX_CODES_PER_GENERATION) {
    throw new Error(`Voucher count must be between 1 and ${MAX_CODES_PER_GENERATION}.`);
  }
  return count;
}

function normalizePrefix(value: string | undefined) {
  const prefix = value?.trim().toUpperCase().replace(/[^A-Z0-9]/g, "") ?? "";
  if (prefix && (prefix.length < 2 || prefix.length > 12)) {
    throw new Error("Voucher prefix must contain 2–12 letters or numbers.");
  }
  return prefix;
}

function normalizeStartNumber(value: number | undefined) {
  const startNumber = Math.trunc(value ?? 1);
  if (!Number.isFinite(startNumber) || startNumber < 1 || startNumber > 9_999_999) {
    throw new Error("Sequential voucher start number is invalid.");
  }
  return startNumber;
}

function normalizeReusableCode(value: string | undefined) {
  const code = value?.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "") ?? "";
  if (code && (code.length < 3 || code.length > 32)) {
    throw new Error("Reusable code must contain 3–32 letters, numbers, or dashes.");
  }
  return code;
}

function normalizeValidityDays(value: number) {
  const validityDays = Math.trunc(value);
  if (![1, 3, 7, 14, 30].includes(validityDays)) {
    throw new Error("Voucher validity must be 1, 3, 7, 14, or 30 days.");
  }
  return validityDays;
}

function createSequentialCodes(prefix: string, start: number, count: number) {
  const end = start + count - 1;
  if (end > 9_999_999) throw new Error("Sequential voucher range is too large.");
  const width = Math.max(4, String(end).length);
  return Array.from({ length: count }, (_, index) =>
    `${prefix}-${String(start + index).padStart(width, "0")}`,
  );
}

function createRandomCodes(count: number) {
  const codes = new Set<string>();
  while (codes.size < count) {
    const bytes = randomBytes(6);
    let code = "";
    for (const byte of bytes) code += RANDOM_DIGITS[byte % RANDOM_DIGITS.length];
    codes.add(code);
  }
  return [...codes];
}

function distributeCodes(codes: string[], deviceIds: string[]) {
  const result = new Map(deviceIds.map((id) => [id, [] as string[]]));
  codes.forEach((code, index) => result.get(deviceIds[index % deviceIds.length])?.push(code));
  return result;
}
