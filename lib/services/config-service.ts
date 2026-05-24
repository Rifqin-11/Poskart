import { createClient } from "@/lib/supabase/client";
import type { AppConfigRow, FlutterAppConfig } from "@/types/app-config";

const CONFIG_ID = "default";

async function getAppConfig(): Promise<AppConfigRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("app_configs")
    .select("id,merchant_name,qris_payload_prefix,share_base_url,countdown_duration_seconds,flash_duration_ms,auto_return_duration_seconds,default_template_id,updated_at")
    .eq("id", CONFIG_ID)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load app config: ${error.message}`);
  }

  return (data as AppConfigRow | null) ?? null;
}

async function saveAppConfig(
  patch: Omit<AppConfigRow, "id" | "updated_at">,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("app_configs").upsert({
    id: CONFIG_ID,
    ...patch,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Unable to save app config: ${error.message}`);
  }
}

/** Build the structured Flutter config object from a DB row */
function buildFlutterConfig(row: AppConfigRow): FlutterAppConfig {
  return {
    version: 1,
    operationalSettings: {
      merchantName: row.merchant_name,
      qrisPayloadPrefix: row.qris_payload_prefix,
      shareBaseUrl: row.share_base_url,
      countdownDurationSeconds: row.countdown_duration_seconds,
      flashDurationMs: row.flash_duration_ms,
      autoReturnDurationSeconds: row.auto_return_duration_seconds,
      defaultTemplateId: row.default_template_id,
    },
  };
}

export const configService = { get: getAppConfig, save: saveAppConfig, buildFlutterConfig };
