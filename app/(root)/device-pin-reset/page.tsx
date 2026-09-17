import type { Metadata } from "next";
import { DeviceSettingsPinResetForm } from "@/features/root/device-settings-pin-reset-form";

export const metadata: Metadata = {
  title: "Reset PIN Perangkat | POSKART",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DevicePinResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <DeviceSettingsPinResetForm token={token ?? ""} />;
}
