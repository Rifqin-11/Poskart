import "server-only";

import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildDuitkuConfig,
  getDuitkuConfig,
  type DuitkuRuntimeConfig,
} from "@/server/payments/duitku";

type OrganizationPaymentGatewayRow = {
  organization_id: string;
  provider: "duitku";
  merchant_code: string;
  api_key_ciphertext: string;
  api_key_iv: string;
  api_key_tag: string;
  api_key_last4: string | null;
  sandbox: boolean;
  payment_method: string;
  updated_at: string;
};

export type OrganizationDuitkuGatewaySummary = {
  provider: "duitku";
  merchantCode: string;
  sandbox: boolean;
  paymentMethod: string;
  hasApiKey: boolean;
  apiKeyLast4: string | null;
  updatedAt: string | null;
};

export type SaveOrganizationDuitkuGatewayInput = {
  merchantCode: string;
  apiKey?: string;
  sandbox: boolean;
  paymentMethod?: string;
};

export async function getOrganizationDuitkuGatewaySummary(
  client: SupabaseClient,
  organizationId: string,
): Promise<OrganizationDuitkuGatewaySummary | null> {
  const { data, error } = await client
    .from("organization_payment_gateways")
    .select(
      "provider,merchant_code,api_key_last4,sandbox,payment_method,updated_at",
    )
    .eq("organization_id", organizationId)
    .eq("provider", "duitku")
    .maybeSingle();

  if (error) {
    if (error.code === "42P01" || error.code === "42703") return null;
    throw new Error(`Gagal memuat payment gateway private: ${error.message}`);
  }

  if (!data) return null;
  const row = data as Pick<
    OrganizationPaymentGatewayRow,
    | "provider"
    | "merchant_code"
    | "api_key_last4"
    | "sandbox"
    | "payment_method"
    | "updated_at"
  >;

  return {
    provider: "duitku",
    merchantCode: row.merchant_code,
    sandbox: row.sandbox,
    paymentMethod: row.payment_method,
    hasApiKey: Boolean(row.api_key_last4),
    apiKeyLast4: row.api_key_last4,
    updatedAt: row.updated_at,
  };
}

export async function saveOrganizationDuitkuGateway(
  client: SupabaseClient,
  organizationId: string,
  input: SaveOrganizationDuitkuGatewayInput,
  updatedBy: string,
) {
  const merchantCode = input.merchantCode.trim();
  if (merchantCode.length < 3) {
    throw new Error("Merchant code Duitku wajib diisi.");
  }

  const paymentMethod = normalizePaymentMethod(input.paymentMethod);
  const existing = await getOrganizationDuitkuGatewayRow(client, organizationId);
  const apiKey = input.apiKey?.trim() ?? "";
  const encrypted = apiKey
    ? encryptGatewaySecret(apiKey)
    : existing
      ? {
          ciphertext: existing.api_key_ciphertext,
          iv: existing.api_key_iv,
          tag: existing.api_key_tag,
          last4: existing.api_key_last4,
        }
      : null;

  if (!encrypted?.ciphertext || !encrypted.iv || !encrypted.tag) {
    throw new Error("API key Duitku wajib diisi untuk Payment Private.");
  }

  const { error } = await client.from("organization_payment_gateways").upsert({
    organization_id: organizationId,
    provider: "duitku",
    merchant_code: merchantCode,
    api_key_ciphertext: encrypted.ciphertext,
    api_key_iv: encrypted.iv,
    api_key_tag: encrypted.tag,
    api_key_last4: encrypted.last4,
    sandbox: input.sandbox,
    payment_method: paymentMethod,
    updated_by: updatedBy,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Gagal menyimpan payment gateway private: ${error.message}`);
  }
}

export async function resolveDuitkuRuntimeConfigForOrganization(
  client: SupabaseClient,
  input: {
    organizationId: string | null | undefined;
    collectionMode: string | null | undefined;
  },
): Promise<DuitkuRuntimeConfig | null> {
  if (input.collectionMode !== "custom") return getDuitkuConfig();
  if (!input.organizationId) {
    throw new Error("Organization ID tidak ditemukan untuk Payment Private.");
  }

  const row = await getOrganizationDuitkuGatewayRow(
    client,
    input.organizationId,
  );
  if (!row) {
    throw new Error(
      "Payment Private aktif, tetapi merchant code dan API key Duitku belum diisi.",
    );
  }

  const apiKey = decryptGatewaySecret(row);
  const config = buildDuitkuConfig({
    merchantCode: row.merchant_code,
    apiKey,
    sandbox: row.sandbox,
    paymentMethod: row.payment_method,
  });

  if (!config) {
    throw new Error("Konfigurasi Payment Private Duitku belum lengkap.");
  }

  return config;
}

async function getOrganizationDuitkuGatewayRow(
  client: SupabaseClient,
  organizationId: string,
) {
  const { data, error } = await client
    .from("organization_payment_gateways")
    .select(
      "organization_id,provider,merchant_code,api_key_ciphertext,api_key_iv,api_key_tag,api_key_last4,sandbox,payment_method,updated_at",
    )
    .eq("organization_id", organizationId)
    .eq("provider", "duitku")
    .maybeSingle();

  if (error) {
    if (error.code === "42P01" || error.code === "42703") return null;
    throw new Error(`Gagal memuat credential Duitku private: ${error.message}`);
  }

  return (data ?? null) as OrganizationPaymentGatewayRow | null;
}

function encryptGatewaySecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getCredentialKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    last4: value.slice(-4),
  };
}

function decryptGatewaySecret(row: OrganizationPaymentGatewayRow) {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getCredentialKey(),
    Buffer.from(row.api_key_iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(row.api_key_tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(row.api_key_ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

function getCredentialKey() {
  const secret = process.env.PAYMENT_CREDENTIALS_SECRET?.trim();
  if (!secret || secret.length < 24) {
    throw new Error(
      "PAYMENT_CREDENTIALS_SECRET wajib diisi minimal 24 karakter untuk menyimpan credential Payment Private.",
    );
  }
  return crypto.createHash("sha256").update(secret).digest();
}

function normalizePaymentMethod(value?: string) {
  const normalized = (value?.trim() || "SQ").toUpperCase();
  return normalized === "SP" ? "SP" : "SQ";
}
