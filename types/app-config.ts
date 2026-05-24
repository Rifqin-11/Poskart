// Flutter app operational config type
export type FlutterAppConfig = {
  version: 1;
  operationalSettings: {
    merchantName: string;
    qrisPayloadPrefix: string;
    shareBaseUrl: string;
    countdownDurationSeconds: number;
    flashDurationMs: number;
    autoReturnDurationSeconds: number;
    defaultTemplateId: string | null;
  };
};

// Row shape from Supabase app_configs table
export type AppConfigRow = {
  id: string;
  merchant_name: string;
  qris_payload_prefix: string;
  share_base_url: string;
  countdown_duration_seconds: number;
  flash_duration_ms: number;
  auto_return_duration_seconds: number;
  default_template_id: string | null;
  updated_at: string;
};
