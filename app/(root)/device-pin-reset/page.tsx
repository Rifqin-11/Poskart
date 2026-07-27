import { DeviceSettingsPinResetForm } from "@/features/root/device-settings-pin-reset-form";

export default async function DevicePinResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <DeviceSettingsPinResetForm token={token ?? ""} />;
}
