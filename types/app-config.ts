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
    // Extended operational settings (admin Settings tabs)
    printerName: string;
    boothTimeoutSeconds: number;
    downloadExpiryHours: number;
    watermarkEnabled: boolean;
    maintenanceMode: boolean;
    qrisAutoRetry: boolean;
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
  // Payment
  qris_provider_merchant_id: string;
  qris_webhook_secret: string;
  qris_auto_retry: boolean;
  // Device
  printer_name: string;
  booth_timeout_seconds: number;
  // Media
  download_expiry_hours: number;
  storage_provider: string;
  watermark_enabled: boolean;
  // System
  maintenance_mode: boolean;
  updated_at: string;
};
