export type DeviceErrorCategory =
  | "startup"
  | "runtime"
  | "payment"
  | "camera"
  | "printer"
  | "upload"
  | "sync"
  | "unknown";

export type DeviceErrorSeverity = "warning" | "error" | "fatal";

export type DeviceErrorGroup = {
  id: string;
  deviceId: string;
  category: DeviceErrorCategory;
  severity: DeviceErrorSeverity;
  message: string;
  stackTrace?: string | null;
  context: Record<string, unknown>;
  appVersion?: string | null;
  occurrenceCount: number;
  firstSeen: string;
  lastSeen: string;
  resolvedAt?: string | null;
};
