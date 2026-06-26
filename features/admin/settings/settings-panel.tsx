"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  useAppConfig,
  useSaveAppConfig,
} from "@/features/admin/settings/use-settings";
import {
  useTenantDetails,
  useTenantMembers,
} from "@/features/admin/organization/use-organization";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/features/admin/_components/page-header";
import { ProfileCard } from "./_components/profile-card";
import { EditProfileDialog } from "./_components/edit-profile-dialog";
import { OrganizationCard } from "./_components/organization-card";
import { PaymentSettingsCard } from "./_components/payment-settings-card";
import { MediaSettingsCard } from "./_components/media-settings-card";
import { KioskDefaultsCard } from "./_components/kiosk-defaults-card";

type SubscriptionGatewayMode = "duitku" | "midtrans" | "both";

type SettingsForm = {
  // Flutter operational
  merchant_name: string;
  qris_payload_prefix: string;
  share_base_url: string;
  countdown_duration_seconds: number;
  flash_duration_ms: number;
  auto_return_duration_seconds: number;
  default_template_id: string;
  // Payment
  qris_provider_merchant_id: string;
  qris_webhook_secret: string;
  qris_auto_retry: boolean;
  subscription_payment_gateway: SubscriptionGatewayMode;
  // Device
  printer_name: string;
  booth_timeout_seconds: number;
  // Media
  download_expiry_hours: number;
  gallery_retention_days: number;
  storage_provider: string;
  watermark_enabled: boolean;
  // System
  maintenance_mode: boolean;
};

const DEFAULT_SETTINGS_FORM: SettingsForm = {
  merchant_name: "",
  qris_payload_prefix: "",
  share_base_url: "",
  countdown_duration_seconds: 3,
  flash_duration_ms: 220,
  auto_return_duration_seconds: 8,
  default_template_id: "",
  qris_provider_merchant_id: "",
  qris_webhook_secret: "",
  qris_auto_retry: true,
  subscription_payment_gateway: "duitku",
  printer_name: "POSKART-THERMAL-01",
  booth_timeout_seconds: 90,
  download_expiry_hours: 168,
  gallery_retention_days: 14,
  storage_provider: "Supabase Storage",
  watermark_enabled: true,
  maintenance_mode: false,
};

export function SettingsPanel() {
  const { data: config } = useAppConfig();
  const saveConfig = useSaveAppConfig();
  const { data: tenant, isLoading: isLoadingTenant } = useTenantDetails();
  const { data: members = [] } = useTenantMembers();

  const [form, setForm] = useState<SettingsForm>(DEFAULT_SETTINGS_FORM);
  const [account, setAccount] = useState<{
    email: string;
    systemRole: string;
    fullName: string;
    phone: string;
    jobTitle: string;
    timezone: string;
  }>({
    email: "",
    systemRole: "authenticated",
    fullName: "",
    phone: "",
    jobTitle: "",
    timezone: "Asia/Jakarta",
  });
  const [profileDraft, setProfileDraft] = useState({
    fullName: "",
    phone: "",
    jobTitle: "",
    timezone: "Asia/Jakarta",
    memberRole: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  // Populate form when config loads from Supabase
  useEffect(() => {
    if (!config) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setForm({
        merchant_name: config.merchant_name,
        qris_payload_prefix: config.qris_payload_prefix,
        share_base_url: config.share_base_url,
        countdown_duration_seconds: config.countdown_duration_seconds,
        flash_duration_ms: config.flash_duration_ms,
        auto_return_duration_seconds: config.auto_return_duration_seconds,
        default_template_id: config.default_template_id ?? "",
        qris_provider_merchant_id: config.qris_provider_merchant_id ?? "",
        qris_webhook_secret: config.qris_webhook_secret ?? "",
        qris_auto_retry: config.qris_auto_retry ?? true,
        subscription_payment_gateway:
          config.subscription_payment_gateway ?? "duitku",
        printer_name: config.printer_name ?? "POSKART-THERMAL-01",
        booth_timeout_seconds: config.booth_timeout_seconds ?? 90,
        download_expiry_hours: config.download_expiry_hours ?? 168,
        gallery_retention_days: config.gallery_retention_days ?? 14,
        storage_provider: config.storage_provider ?? "Supabase Storage",
        watermark_enabled: config.watermark_enabled ?? true,
        maintenance_mode: config.maintenance_mode ?? false,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [config]);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then((res: { data: { user: { email?: string | null; role?: string | null; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> } | null } }) => {
        if (cancelled) return;
        const user = res.data.user;
        const fullName =
          typeof user?.user_metadata?.full_name === "string"
            ? user.user_metadata.full_name
            : typeof user?.user_metadata?.name === "string"
              ? user.user_metadata.name
              : "";
        const appRole =
          typeof user?.app_metadata?.role === "string"
            ? user.app_metadata.role
            : user?.role || "authenticated";
        const phone =
          typeof user?.user_metadata?.phone === "string"
            ? user.user_metadata.phone
            : "";
        const jobTitle =
          typeof user?.user_metadata?.job_title === "string"
            ? user.user_metadata.job_title
            : "";
        const timezone =
          typeof user?.user_metadata?.timezone === "string"
            ? user.user_metadata.timezone
            : "Asia/Jakarta";
        setAccount({
          email: user?.email || "",
          systemRole: appRole,
          fullName,
          phone,
          jobTitle,
          timezone,
        });
      })
      .catch(() => {
        // ignore
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = () => {
    saveConfig.mutate(form, {
      onSuccess: () => toast.success("Settings saved successfully"),
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : "Failed to save settings",
        ),
    });
  };

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: profileDraft.fullName,
          phone: profileDraft.phone,
          job_title: profileDraft.jobTitle,
          timezone: profileDraft.timezone,
        },
      });

      if (error) throw error;

      setAccount((prev) => ({
        ...prev,
        fullName: profileDraft.fullName,
        phone: profileDraft.phone,
        jobTitle: profileDraft.jobTitle,
        timezone: profileDraft.timezone,
      }));

      toast.success("Profile updated successfully");
      setEditProfileOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update profile",
      );
    } finally {
      setProfileSaving(false);
    }
  };

  const organizationName = tenant?.name || "Loading organization...";
  const subscriptionStatus = tenant?.subscription_status || "free";
  const subscriptionActive = subscriptionStatus === "active";
  const planName =
    subscriptionStatus === "free"
      ? "Free Account"
      : tenant?.plan_name || "Pro Plan";

  const expiresAt = tenant?.subscription_expires_at
    ? new Date(tenant.subscription_expires_at)
    : null;

  const currentMember = members.find((m) => m.email === account.email);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Kelola profil akun dan konfigurasi global yang dipakai dashboard POSKART."
        action={
          <Button
            onClick={() => void handleSave()}
            disabled={saveConfig.isPending}
          >
            <Save className="size-4" />
            {saveConfig.isPending ? "Saving..." : "Save app settings"}
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <ProfileCard
          account={account}
          currentMemberRole={currentMember?.role}
          onEditProfile={() => {
            setProfileDraft({
              fullName: account.fullName,
              phone: account.phone,
              jobTitle: account.jobTitle,
              timezone: account.timezone,
              memberRole: currentMember?.role ?? "",
            });
            setEditProfileOpen(true);
          }}
        />

        <OrganizationCard
          isLoadingTenant={isLoadingTenant}
          organizationName={organizationName}
          planName={planName}
          subscriptionActive={subscriptionActive}
          subscriptionStatus={subscriptionStatus}
          deviceLimit={tenant?.device_limit ?? 1}
          expiresAt={expiresAt}
        />
      </div>

      <PaymentSettingsCard form={form} setForm={setForm} />

      <MediaSettingsCard form={form} setForm={setForm} />

      <KioskDefaultsCard form={form} setForm={setForm} />

      {editProfileOpen && (
        <EditProfileDialog
          open={editProfileOpen}
          onClose={() => setEditProfileOpen(false)}
          profileDraft={profileDraft}
          setProfileDraft={setProfileDraft}
          onSubmit={handleSaveProfile}
          profileSaving={profileSaving}
          email={account.email}
          currentMemberRole={currentMember?.role}
        />
      )}
    </div>
  );
}
