import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { getSiteUrl } from "@/lib/auth/site-url";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  KioskApiError,
  requireOrganizationDevice,
  type KioskRequestContext,
} from "@/lib/kiosk/server";

const RESET_LINK_TTL_MS = 30 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

export function normalizeSettingsPin(value: string | undefined) {
  return value?.trim() ?? "";
}

export function assertSettingsPin(value: string | undefined) {
  const pin = normalizeSettingsPin(value);
  if (!/^\d{4,12}$/.test(pin)) {
    throw new Error("Settings PIN must contain 4 to 12 digits.");
  }
  return pin;
}

export async function requestSettingsPinReset(
  context: KioskRequestContext,
  deviceId: string,
) {
  const device = await requireOrganizationDevice(context, deviceId);
  const admin = createSupabaseAdminClient();
  const { data: latest, error: latestError } = await admin
    .from("device_settings_pin_reset_tokens")
    .select("created_at")
    .eq("device_id", device.id)
    .is("used_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestError) {
    throw new KioskApiError(
      `Unable to prepare PIN reset: ${latestError.message}`,
      500,
      "SETTINGS_PIN_RESET_PREPARE_FAILED",
    );
  }

  const latestAt = latest?.created_at ? Date.parse(latest.created_at) : NaN;
  if (Number.isFinite(latestAt) && Date.now() - latestAt < RESEND_COOLDOWN_MS) {
    return { accepted: true, throttled: true };
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { error: invalidateError } = await admin
    .from("device_settings_pin_reset_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("device_id", device.id)
    .is("used_at", null);
  if (invalidateError) {
    throw new KioskApiError(
      `Unable to invalidate previous reset link: ${invalidateError.message}`,
      500,
      "SETTINGS_PIN_RESET_INVALIDATE_FAILED",
    );
  }

  const { error: insertError } = await admin
    .from("device_settings_pin_reset_tokens")
    .insert({
      device_id: device.id,
      organization_id: context.organizationId,
      requester_profile_id: context.user.id,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + RESET_LINK_TTL_MS).toISOString(),
    });
  if (insertError) {
    throw new KioskApiError(
      `Unable to create PIN reset link: ${insertError.message}`,
      500,
      "SETTINGS_PIN_RESET_CREATE_FAILED",
    );
  }

  const { data: members, error: membersError } = await admin
    .from("organization_members")
    .select("role,profiles!organization_members_profile_id_fkey(email)")
    .eq("organization_id", context.organizationId)
    .in("role", ["owner", "admin"]);
  if (membersError) {
    throw new KioskApiError(
      `Unable to find workspace administrators: ${membersError.message}`,
      500,
      "SETTINGS_PIN_RESET_RECIPIENTS_FAILED",
    );
  }

  const emails = Array.from(
    new Set(
      (members ?? [])
        .flatMap((member) => {
          const profile = member.profiles as
            | { email?: string | null }
            | Array<{ email?: string | null }>
            | null;
          return Array.isArray(profile) ? profile : profile ? [profile] : [];
        })
        .map((profile) => profile.email?.trim().toLowerCase() ?? "")
        .filter(Boolean),
    ),
  );
  if (emails.length === 0) {
    throw new KioskApiError(
      "No owner or admin email is available for this workspace.",
      422,
      "SETTINGS_PIN_RESET_RECIPIENTS_EMPTY",
    );
  }

  const siteUrl = await getSiteUrl();
  const resetUrl = `${siteUrl}/device-pin-reset?token=${encodeURIComponent(token)}`;
  const sent = await Promise.all(
    emails.map((email) => sendSettingsPinResetEmail({ email, resetUrl, deviceName: device.name })),
  );
  if (!sent.some(Boolean)) {
    await admin
      .from("device_settings_pin_reset_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("token_hash", tokenHash);
    throw new KioskApiError(
      "PIN reset email could not be sent. Please check the email configuration.",
      502,
      "SETTINGS_PIN_RESET_EMAIL_FAILED",
    );
  }

  return { accepted: true, throttled: false };
}

export async function consumeSettingsPinReset(token: string, pin: string) {
  const normalizedToken = token.trim();
  if (!normalizedToken) throw new Error("This reset link is invalid.");
  const tokenHash = createHash("sha256").update(normalizedToken).digest("hex");
  const normalizedPin = assertSettingsPin(pin);
  const { error } = await createSupabaseAdminClient().rpc(
    "consume_device_settings_pin_reset",
    { p_token_hash: tokenHash, p_settings_pin: normalizedPin },
  );
  if (error) throw new Error(error.message);
}

async function sendSettingsPinResetEmail({
  email,
  resetUrl,
  deviceName,
}: {
  email: string;
  resetUrl: string;
  deviceName: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  const from = process.env.GALLERY_EMAIL_FROM ?? "POSKART <noreply@poskart.my.id>";
  const safeName = escapeHtml(deviceName || "POSKART Booth");
  const safeUrl = escapeHtml(resetUrl);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `Reset PIN pengaturan untuk ${deviceName || "POSKART Booth"}`,
        text: `Ada permintaan reset PIN pengaturan untuk ${deviceName || "POSKART Booth"}.\n\nAtur PIN baru (berlaku 30 menit):\n${resetUrl}\n\nJika Anda tidak meminta ini, abaikan email ini.`,
        html: `<div style="font-family:Arial,sans-serif;color:#18181b;max-width:520px;margin:auto;padding:28px;border:1px solid #e4e4e7;border-radius:20px"><div style="font-size:12px;letter-spacing:2px;font-weight:700;color:#71717a">POSKART DEVICE SECURITY</div><h1 style="font-size:26px;margin:12px 0">Reset PIN pengaturan</h1><p style="line-height:1.6;color:#52525b">Ada permintaan reset PIN untuk <strong>${safeName}</strong>. Tautan ini berlaku selama 30 menit dan hanya dapat digunakan sekali.</p><p style="margin:26px 0"><a href="${safeUrl}" style="display:inline-block;background:#00357B;color:#fff;text-decoration:none;border-radius:999px;padding:13px 20px;font-weight:700">Atur PIN baru</a></p><p style="font-size:12px;line-height:1.6;color:#71717a">Jika Anda tidak meminta reset ini, abaikan email ini.</p></div>`,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
