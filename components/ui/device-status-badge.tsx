import type { DeviceStatus } from "@/types/device";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type DeviceStatusMeta = {
  label: string;
  variant: "secondary" | "success" | "warning" | "destructive";
  dotClassName: string;
};

const DEVICE_STATUS_META: Record<DeviceStatus, DeviceStatusMeta> = {
  online: {
    label: "Online",
    variant: "success",
    dotClassName: "bg-emerald-500",
  },
  in_session: {
    label: "In Session",
    variant: "warning",
    dotClassName: "bg-amber-500",
  },
  offline: {
    label: "Offline",
    variant: "secondary",
    dotClassName: "bg-zinc-400",
  },
  error: {
    label: "Error",
    variant: "destructive",
    dotClassName: "bg-red-500",
  },
  maintenance: {
    label: "Maintenance",
    variant: "warning",
    dotClassName: "bg-orange-500",
  },
};

export function getDeviceStatusMeta(status: DeviceStatus) {
  return DEVICE_STATUS_META[status];
}

export function isDeviceConnected(status: DeviceStatus) {
  return status === "online" || status === "in_session" || status === "error";
}

export function DeviceStatusBadge({
  status,
  className,
}: {
  status: DeviceStatus;
  className?: string;
}) {
  const meta = getDeviceStatusMeta(status);

  return (
    <Badge
      variant={meta.variant}
      className={cn("shrink-0 gap-1.5", className)}
      aria-label={`Device status: ${meta.label}`}
    >
      <span className={cn("size-1.5 rounded-full", meta.dotClassName)} />
      {meta.label}
    </Badge>
  );
}
