"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import { cn } from "@/lib/utils";
import { PageHeader } from "@/features/admin/_components/page-header";
import { ProfileCard } from "./_components/profile-card";
import { EditProfileDialog } from "./_components/edit-profile-dialog";
import { OrganizationCard } from "./_components/organization-card";
import { PaymentSettingsCard } from "./_components/payment-settings-card";
import { MediaSettingsCard } from "./_components/media-settings-card";
import { KioskDefaultsCard } from "./_components/kiosk-defaults-card";

type SubscriptionGatewayMode = "duitku" | "midtrans" | "both";

const SETTINGS_TABS = [
  { id: "details", label: "My details" },
  { id: "organization", label: "Organization" },
  { id: "payment", label: "Payment" },
  { id: "media", label: "Media & Gallery" },
  { id: "kiosk", label: "Kiosk Defaults" },
] as const;

type SettingsTab = (typeof SETTINGS_TABS)[number]["id"];

function readSettingsTab(value: string | null): SettingsTab | null {
  return SETTINGS_TABS.some((tab) => tab.id === value)
    ? (value as SettingsTab)
    : null;
}

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
  payment_mode: "sharing" | "private";
  qris_provider_merchant_id: string;
  qris_webhook_secret: string;
  qris_auto_retry: boolean;
  subscription_payment_gateway: SubscriptionGatewayMode;
  gateway_fee_type: "percentage" | "fixed";
  gateway_fee_percentage: number;
  gateway_fee_fixed_amount: number;
  platform_fee_type: "percentage" | "fixed";
  platform_fee_percentage: number;
  platform_fee_fixed_amount: number;
  payout_adjustment_amount: number;
  minimum_payout_amount: number;
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
  payment_mode: "sharing",
  qris_provider_merchant_id: "",
  qris_webhook_secret: "",
  qris_auto_retry: true,
  subscription_payment_gateway: "duitku",
  gateway_fee_type: "percentage",
  gateway_fee_percentage: 0,
  gateway_fee_fixed_amount: 0,
  platform_fee_type: "percentage",
  platform_fee_percentage: 0,
  platform_fee_fixed_amount: 0,
  payout_adjustment_amount: 0,
  minimum_payout_amount: 0,
  printer_name: "POSKART-THERMAL-01",
  booth_timeout_seconds: 90,
  download_expiry_hours: 168,
  gallery_retention_days: 14,
  storage_provider: "Supabase Storage",
  watermark_enabled: true,
  maintenance_mode: false,
};

export function SettingsPanel() {
  const searchParams = useSearchParams();
  const { data: config } = useAppConfig();
  const saveConfig = useSaveAppConfig();
  const { data: tenant, isLoading: isLoadingTenant } = useTenantDetails();
  const { data: members = [] } = useTenantMembers();

  const [isEditingOrg, setIsEditingOrg] = useState(false);
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
  const [activeTab, setActiveTab] = useState<SettingsTab>(() =>
    readSettingsTab(searchParams.get("tab")) ?? "details",
  );
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
        gateway_fee_type: config.gateway_fee_type ?? "percentage",
        gateway_fee_percentage: config.gateway_fee_percentage ?? 0,
        gateway_fee_fixed_amount: config.gateway_fee_fixed_amount ?? 0,
        platform_fee_type: config.platform_fee_type ?? "percentage",
        platform_fee_percentage: config.platform_fee_percentage ?? 0,
        platform_fee_fixed_amount: config.platform_fee_fixed_amount ?? 0,
        payout_adjustment_amount: config.payout_adjustment_amount ?? 0,
        minimum_payout_amount: config.minimum_payout_amount ?? 0,
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

  const subscriptionActive = Boolean(tenant?.subscription_is_active);

  const currentMember = members.find((m) => m.email === account.email);
  const myRole = currentMember?.role ?? "partner";
  const canEditOrg = myRole === "owner" || myRole === "admin";
  const isOwnerOrAdmin = myRole === "owner" || myRole === "admin";

  const visibleTabs = SETTINGS_TABS.filter((tab) => {
    if (!isOwnerOrAdmin) {
      return tab.id === "details" || tab.id === "organization";
    }
    return true;
  });

  const subscriptionRequired =
    searchParams.get("subscription") === "required";
  const organizationOnly =
    !isLoadingTenant && !subscriptionActive;
  const visibleActiveTab: SettingsTab = organizationOnly
    ? "organization"
    : (visibleTabs.some((t) => t.id === activeTab) ? activeTab : "details");

  const getHeaderAction = () => {
    if (visibleActiveTab === "organization") {
      if (!canEditOrg) return null;
      return (
        <Button
          onClick={() => setIsEditingOrg((prev) => !prev)}
          variant={isEditingOrg ? "outline" : "default"}
          className="rounded-2xl"
        >
          {isEditingOrg ? "Selesai Edit" : "Edit Organisasi"}
        </Button>
      );
    }

    if (
      visibleActiveTab === "payment" ||
      visibleActiveTab === "media" ||
      visibleActiveTab === "kiosk"
    ) {
      return (
        <Button
          onClick={() => void handleSave()}
          disabled={saveConfig.isPending}
          className="rounded-2xl"
        >
          <Save className="size-4" />
          {saveConfig.isPending ? "Saving..." : "Save app settings"}
        </Button>
      );
    }

    return null;
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Settings"
        description="Kelola profil akun, workspace, payment, media, dan default kiosk POSKART."
        action={getHeaderAction()}
      />

      <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm shadow-zinc-200/70">
        <div className="border-b border-zinc-100 p-3">
          <div className="flex gap-1.5 overflow-x-auto rounded-[1.35rem] bg-zinc-50 p-1.5">
            {visibleTabs.map((tab) => {
              const active = visibleActiveTab === tab.id;
              const disabled =
                organizationOnly && tab.id !== "organization";
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    if (!disabled) setActiveTab(tab.id);
                  }}
                  disabled={disabled}
                  className={cn(
                    "h-10 shrink-0 rounded-2xl px-4 text-sm font-medium transition-colors",
                    active
                      ? "bg-white text-zinc-950 shadow-sm"
                      : "text-zinc-500 hover:bg-white/70 hover:text-zinc-900",
                    disabled && "cursor-not-allowed opacity-45 hover:bg-transparent",
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-5 sm:p-6 lg:p-8">
          {visibleActiveTab === "details" ? (
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
          ) : null}

          {visibleActiveTab === "organization" ? (
            <OrganizationCard
              myEmail={account.email}
              subscriptionRequired={subscriptionRequired}
              isEditing={isEditingOrg}
            />
          ) : null}

          {visibleActiveTab === "payment" ? (
            <PaymentSettingsCard form={form} setForm={setForm} />
          ) : null}

          {visibleActiveTab === "media" ? (
            <MediaSettingsCard form={form} setForm={setForm} />
          ) : null}

          {visibleActiveTab === "kiosk" ? (
            <KioskDefaultsCard form={form} setForm={setForm} />
          ) : null}
        </div>
      </div>

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
