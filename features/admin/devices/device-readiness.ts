import type { Device } from "@/types/device";

/**
 * A device is configured enough for a first operational session when it has
 * a visual layout, at least one frame, and at least one pricing assignment.
 * Printer `unknown` is intentionally not treated as a blocker because a
 * kiosk can still be opened and tested before the printer reports its state.
 */
export function hasMinimumDeviceConfiguration(device: Device) {
  const hasTheme = Boolean(device.layoutSchemaId || device.theme);
  const hasFrames = device.frameTemplates.length > 0 || Boolean(device.template);
  const hasPricing =
    device.pricingProfiles.length > 0 || Boolean(device.pricingProfile);

  return hasTheme && hasFrames && hasPricing;
}

export function isDeviceOnline(device: Device) {
  return device.status === "online" || device.status === "in_session";
}

export function deviceNeedsAttention(device: Device) {
  const lastSync = device.lastSync.trim().toLowerCase();
  const hasSyncedBefore =
    lastSync.length > 0 && lastSync !== "not synced" && lastSync !== "never";
  const printerNeedsAttention = [
    "disconnected",
    "permission_required",
    "paper_out",
    "error",
  ].includes(device.printerStatus);

  return (
    (device.status === "offline" && hasSyncedBefore) ||
    device.status === "error" ||
    device.status === "maintenance" ||
    Boolean(device.unresolvedErrorCount) ||
    printerNeedsAttention
  );
}

export function isDeviceReady(device: Device) {
  return (
    hasMinimumDeviceConfiguration(device) &&
    isDeviceOnline(device) &&
    !deviceNeedsAttention(device)
  );
}
