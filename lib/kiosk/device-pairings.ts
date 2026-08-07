import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { KioskApiError, type KioskRequestContext } from "./server";

const pairingAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const pairingLifetimeMs = 10 * 60 * 1000;
const maxRegenerations = 3;
const maxValidationAttempts = 5;

type PairingRow = {
  id: string;
  organization_id: string | null;
  hardware_id_hash: string;
  hardware_id: string;
  status: "pending" | "configured" | "cancelled" | "expired";
  expires_at: string;
  claimed_at: string | null;
  device_id: string | null;
  attempt_count: number;
  regeneration_count: number;
  created_at: string;
  device_token_hash: string | null;
  device_token_revoked_at: string | null;
  claimed_by_profile_id: string | null;
};

export function normalizeHardwareId(hardwareId: string) {
  return hardwareId.trim();
}

export function hashHardwareId(hardwareId: string) {
  return createHash("sha256")
    .update(normalizeHardwareId(hardwareId))
    .digest("hex");
}

export function hashPairingCode(code: string) {
  return createHash("sha256")
    .update(code.trim().toUpperCase())
    .digest("hex");
}

export function hashDevicePairingSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

function generateDevicePairingSecret() {
  return randomBytes(32).toString("base64url");
}

export function formatDeviceToken(pairingId: string, secret: string) {
  return `pkd_${pairingId}.${secret}`;
}

function generatePairingCode(length = 8) {
  const bytes = randomBytes(length);
  return Array.from(
    bytes,
    (byte) => pairingAlphabet[byte % pairingAlphabet.length],
  ).join("");
}

function ensureHardwareId(hardwareId: string) {
  const normalized = normalizeHardwareId(hardwareId);
  if (!normalized) {
    throw new KioskApiError(
      "Hardware ID is required for device pairing.",
      400,
      "KIOSK_HARDWARE_ID_REQUIRED",
    );
  }
  return normalized;
}

export function pairingStatusPayload(pairing: PairingRow) {
  return {
    id: pairing.id,
    status: pairing.status,
    expiresAt: pairing.expires_at,
    deviceId: pairing.device_id,
  };
}

const pairingColumns =
  "id,organization_id,hardware_id_hash,hardware_id,status,expires_at,claimed_at,device_id,attempt_count,regeneration_count,created_at,device_token_hash,device_token_revoked_at,claimed_by_profile_id";

async function assertPairingHardwareAvailable(hardwareId: string) {
  const normalizedHardwareId = ensureHardwareId(hardwareId);
  const hardwareHash = hashHardwareId(normalizedHardwareId);
  const admin = createSupabaseAdminClient();
  const { data: existingDevice, error: deviceError } = await admin
    .from("devices")
    .select("id")
    .eq("hardware_id", normalizedHardwareId)
    .maybeSingle();
  if (deviceError) {
    throw new KioskApiError(
      `Unable to verify device pairing: ${deviceError.message}`,
      500,
      "KIOSK_DEVICE_LOOKUP_FAILED",
    );
  }
  if (existingDevice) {
    throw new KioskApiError(
      "This device is already paired. Remove it from POSKART Web before pairing again.",
      409,
      "KIOSK_DEVICE_ALREADY_PAIRED",
    );
  }
  return { normalizedHardwareId, hardwareHash, admin };
}

export async function createDevicePairing(
  context: KioskRequestContext,
  hardwareId: string,
) {
  const normalizedHardwareId = ensureHardwareId(hardwareId);
  const hardwareHash = hashHardwareId(normalizedHardwareId);
  const admin = createSupabaseAdminClient();

  const { data: existingDevice, error: deviceError } = await admin
    .from("devices")
    .select("id,organization_id")
    .eq("hardware_id", normalizedHardwareId)
    .maybeSingle();
  if (deviceError) {
    throw new KioskApiError(
      `Unable to verify device pairing: ${deviceError.message}`,
      500,
      "KIOSK_DEVICE_LOOKUP_FAILED",
    );
  }
  if (existingDevice) {
    if (existingDevice.organization_id !== context.organizationId) {
      throw new KioskApiError(
        "This physical device is already paired with another organization.",
        409,
        "KIOSK_DEVICE_REGISTERED_TO_OTHER_ORGANIZATION",
      );
    }
    throw new KioskApiError(
      "This device is already paired. Please reopen the kiosk.",
      409,
      "KIOSK_DEVICE_ALREADY_PAIRED",
    );
  }

  const { data: latest, error: latestError } = await admin
    .from("device_pairings")
    .select(pairingColumns)
    .eq("hardware_id_hash", hardwareHash)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestError) {
    throw new KioskApiError(
      `Unable to create pairing: ${latestError.message}`,
      500,
      "KIOSK_PAIRING_CREATE_FAILED",
    );
  }

  const latestPairing = latest as PairingRow | null;
  if (
    latestPairing?.organization_id &&
    latestPairing.organization_id !== context.organizationId &&
    latestPairing.status === "pending" &&
    Date.parse(latestPairing.expires_at) > Date.now()
  ) {
    throw new KioskApiError(
      "This physical device is currently being paired with another organization.",
      409,
      "KIOSK_DEVICE_PAIRING_IN_PROGRESS",
    );
  }

  const sameWindow =
    latestPairing &&
    Date.now() - Date.parse(latestPairing.created_at) < pairingLifetimeMs;
  const regenerationCount = sameWindow
    ? latestPairing.regeneration_count + 1
    : 0;
  if (regenerationCount > maxRegenerations) {
    throw new KioskApiError(
      "Too many new pairing codes were requested. Try again in a few minutes.",
      429,
      "KIOSK_PAIRING_REGENERATION_LIMIT",
    );
  }

  if (latestPairing?.status === "pending") {
    await admin
      .from("device_pairings")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", latestPairing.id)
      .eq("status", "pending");
  }

  const code = generatePairingCode();
  const expiresAt = new Date(Date.now() + pairingLifetimeMs).toISOString();
  const { data: created, error: createError } = await admin
    .from("device_pairings")
    .insert({
      code_hash: hashPairingCode(code),
      hardware_id_hash: hardwareHash,
      hardware_id: normalizedHardwareId,
      organization_id: context.organizationId,
      expires_at: expiresAt,
      regeneration_count: regenerationCount,
    })
    .select("id,status,expires_at")
    .single();
  if (createError || !created) {
    throw new KioskApiError(
      `Unable to create pairing: ${createError?.message ?? "unknown error"}`,
      500,
      "KIOSK_PAIRING_CREATE_FAILED",
    );
  }

  return {
    id: created.id as string,
    code,
    status: created.status as "pending",
    expiresAt: created.expires_at as string,
  };
}

/**
 * Starts a device-owned pairing request. The returned secret is never stored
 * in plaintext and is required for every status check and token exchange.
 */
export async function createPublicDevicePairing(hardwareId: string) {
  const { normalizedHardwareId, hardwareHash, admin } =
    await assertPairingHardwareAvailable(hardwareId);
  const { data: latest, error: latestError } = await admin
    .from("device_pairings")
    .select(pairingColumns)
    .eq("hardware_id_hash", hardwareHash)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestError) {
    throw new KioskApiError(
      `Unable to create pairing: ${latestError.message}`,
      500,
      "KIOSK_PAIRING_CREATE_FAILED",
    );
  }

  const latestPairing = latest as PairingRow | null;
  const sameWindow =
    latestPairing &&
    Date.now() - Date.parse(latestPairing.created_at) < pairingLifetimeMs;
  const regenerationCount = sameWindow
    ? latestPairing.regeneration_count + 1
    : 0;
  if (regenerationCount > maxRegenerations) {
    throw new KioskApiError(
      "Too many new pairing codes were requested. Try again in a few minutes.",
      429,
      "KIOSK_PAIRING_REGENERATION_LIMIT",
    );
  }

  if (latestPairing?.status === "pending") {
    await admin
      .from("device_pairings")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", latestPairing.id)
      .eq("status", "pending");
  }

  const code = generatePairingCode();
  const secret = generateDevicePairingSecret();
  const expiresAt = new Date(Date.now() + pairingLifetimeMs).toISOString();
  const { data: created, error: createError } = await admin
    .from("device_pairings")
    .insert({
      code_hash: hashPairingCode(code),
      hardware_id_hash: hardwareHash,
      hardware_id: normalizedHardwareId,
      expires_at: expiresAt,
      regeneration_count: regenerationCount,
      device_token_hash: hashDevicePairingSecret(secret),
    })
    .select("id,status,expires_at")
    .single();
  if (createError || !created) {
    throw new KioskApiError(
      `Unable to create pairing: ${createError?.message ?? "unknown error"}`,
      500,
      "KIOSK_PAIRING_CREATE_FAILED",
    );
  }

  return {
    id: created.id as string,
    code,
    status: created.status as "pending",
    expiresAt: created.expires_at as string,
    pollingSecret: secret,
  };
}

export async function getPublicDevicePairingStatus(
  pairingId: string,
  pollingSecret: string,
) {
  const normalizedId = pairingId.trim();
  const normalizedSecret = pollingSecret.trim();
  if (!normalizedId || !normalizedSecret) {
    throw new KioskApiError(
      "Pairing credentials are required.",
      400,
      "KIOSK_PAIRING_CREDENTIALS_REQUIRED",
    );
  }
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("device_pairings")
    .select(pairingColumns)
    .eq("id", normalizedId)
    .eq("device_token_hash", hashDevicePairingSecret(normalizedSecret))
    .maybeSingle();
  if (error) {
    throw new KioskApiError(
      `Unable to check pairing: ${error.message}`,
      500,
      "KIOSK_PAIRING_LOOKUP_FAILED",
    );
  }
  if (!data) {
    throw new KioskApiError(
      "Pairing request was not found.",
      404,
      "KIOSK_PAIRING_NOT_FOUND",
    );
  }
  const pairing = data as PairingRow;
  if (pairing.status === "pending" && Date.parse(pairing.expires_at) <= Date.now()) {
    await admin
      .from("device_pairings")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("id", pairing.id)
      .eq("status", "pending");
    return { ...pairingStatusPayload(pairing), status: "expired" };
  }
  return pairingStatusPayload(pairing);
}

export async function exchangePublicDevicePairing(
  pairingId: string,
  pollingSecret: string,
) {
  const status = await getPublicDevicePairingStatus(pairingId, pollingSecret);
  if (!status.deviceId || status.status !== "configured") {
    throw new KioskApiError(
      "This device has not been configured yet.",
      409,
      "KIOSK_PAIRING_NOT_CONFIGURED",
    );
  }
  return {
    deviceId: status.deviceId,
    accessToken: formatDeviceToken(pairingId.trim(), pollingSecret.trim()),
  };
}

export async function getDevicePairingStatus(
  context: KioskRequestContext,
  hardwareId: string,
) {
  const hardwareHash = hashHardwareId(ensureHardwareId(hardwareId));
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("device_pairings")
    .select(pairingColumns)
    .eq("hardware_id_hash", hardwareHash)
    .eq("organization_id", context.organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new KioskApiError(
      `Unable to check pairing: ${error.message}`,
      500,
      "KIOSK_PAIRING_LOOKUP_FAILED",
    );
  }
  if (!data) {
    throw new KioskApiError(
      "No active pairing request was found.",
      404,
      "KIOSK_PAIRING_NOT_FOUND",
    );
  }

  const pairing = data as PairingRow;
  if (pairing.status === "pending" && Date.parse(pairing.expires_at) <= Date.now()) {
    const { data: expired } = await admin
      .from("device_pairings")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("id", pairing.id)
      .eq("status", "pending")
      .select(pairingColumns)
      .maybeSingle();
    return pairingStatusPayload((expired ?? { ...pairing, status: "expired" }) as PairingRow);
  }
  return pairingStatusPayload(pairing);
}

export async function cancelDevicePairing(
  context: KioskRequestContext,
  hardwareId: string,
) {
  const hardwareHash = hashHardwareId(ensureHardwareId(hardwareId));
  const { error } = await createSupabaseAdminClient()
    .from("device_pairings")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("hardware_id_hash", hardwareHash)
    .eq("organization_id", context.organizationId)
    .eq("status", "pending");
  if (error) {
    throw new KioskApiError(
      `Unable to cancel pairing: ${error.message}`,
      500,
      "KIOSK_PAIRING_CANCEL_FAILED",
    );
  }
}

export async function getPairingForAdminCode(
  organizationId: string,
  claimedByProfileId: string,
  code: string,
) {
  const normalizedCode = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{8,10}$/.test(normalizedCode)) {
    throw new Error("Enter the 8–10 character code shown on the device.");
  }
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("device_pairings")
    .select(pairingColumns)
    .eq("code_hash", hashPairingCode(normalizedCode))
    .maybeSingle();
  if (error) throw new Error(`Unable to validate pairing code: ${error.message}`);
  if (!data || (data.organization_id && data.organization_id !== organizationId)) {
    throw new Error("Pairing code is invalid for this workspace.");
  }
  const pairing = data as PairingRow;
  if (pairing.status !== "pending") {
    throw new Error("This pairing code has already been used or cancelled.");
  }
  if (Date.parse(pairing.expires_at) <= Date.now()) {
    await admin
      .from("device_pairings")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("id", pairing.id)
      .eq("status", "pending");
    throw new Error("This pairing code has expired. Generate a new code on the device.");
  }
  if (pairing.attempt_count >= maxValidationAttempts) {
    throw new Error(
      "Too many attempts were made with this code. Generate a new code on the device.",
    );
  }
  const claim = await admin
    .from("device_pairings")
    .update({
      organization_id: organizationId,
      claimed_by_profile_id: claimedByProfileId,
      attempt_count: pairing.attempt_count + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pairing.id)
    .eq("status", "pending")
    .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
    .select(pairingColumns)
    .maybeSingle();
  if (claim.error || !claim.data) {
    throw new Error("This pairing code is being claimed by another workspace.");
  }
  return claim.data as PairingRow;
}
