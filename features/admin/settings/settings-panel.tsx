"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Building2,
  CreditCard,
  Image as ImageIcon,
  Landmark,
  PencilLine,
  UserRound,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { DialogActions } from "@/features/admin/_components/dialog-actions";
import {
  useAppConfig,
  useSaveAppConfig,
} from "@/features/admin/settings/use-settings";
import {
  usePaymentGatewaySettings,
  useSavePaymentGatewaySettings,
  useTenantDetails,
  useTenantMembers,
  useUpdatePaymentCollectionMode,
  useUpdateQrisPaymentMethod,
} from "@/features/admin/organization/use-organization";
import { cn } from "@/lib/utils";
import { getUserFacingErrorMessage } from "@/lib/errors/user-facing-error";
import { createClient } from "@/lib/supabase/client";
import type { AppConfigRow } from "@/types/app-config";
import { PageHeader } from "@/features/admin/_components/page-header";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { type DictionaryKey } from "@/lib/i18n/dictionaries";
import { ProfileCard } from "./_components/profile-card";
import { EditProfileDialog } from "./_components/edit-profile-dialog";
import { OrganizationCard } from "./_components/organization-card";
import { PaymentSettingsCard } from "./_components/payment-settings-card";
import { MediaSettingsCard } from "./_components/media-settings-card";

type SubscriptionGatewayMode = "duitku" | "midtrans" | "both";

const SETTINGS_TABS = [
  { id: "details", label: "My details" },
  { id: "organization", label: "Organization" },
  { id: "payment", label: "Payment" },
  { id: "media", label: "Media & Gallery" },
] as const;

type SettingsTab = (typeof SETTINGS_TABS)[number]["id"];
type OrganizationEditSection = "workspace" | "payout" | "team";

function readSettingsTab(value: string | null): SettingsTab | null {
  return SETTINGS_TABS.some((tab) => tab.id === value)
    ? (value as SettingsTab)
    : null;
}

function getSettingsTabs(t: (key: DictionaryKey) => string) {
  return [
    {
      id: "details" as const,
      label: t("settings.tabDetails"),
      icon: UserRound,
    },
    {
      id: "organization" as const,
      label: t("settings.tabOrganization"),
      icon: Building2,
    },
    {
      id: "payment" as const,
      label: t("settings.tabPayment"),
      icon: CreditCard,
    },
    {
      id: "media" as const,
      label: t("settings.tabMedia"),
      icon: ImageIcon,
    },
  ];
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
  qris_payment_method: "SQ" | "SP";
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
  qris_payment_method: "SQ",
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

type SettingsAccount = {
  email: string;
  systemRole: string;
  fullName: string;
  phone: string;
  jobTitle: string;
  timezone: string;
};

export function SettingsPanel({
  initialAccount,
  initialMemberRole,
}: {
  initialAccount: SettingsAccount;
  initialMemberRole: string | null;
}) {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const [editOrganizationOpen, setEditOrganizationOpen] = useState(false);
  const [organizationEditSection, setOrganizationEditSection] =
    useState<OrganizationEditSection>("workspace");
  const [editPaymentOpen, setEditPaymentOpen] = useState(false);
  const [editMediaOpen, setEditMediaOpen] = useState(false);
  const [form, setForm] = useState<SettingsForm>(DEFAULT_SETTINGS_FORM);
  const [account, setAccount] = useState<SettingsAccount>(initialAccount);
  const [profileDraft, setProfileDraft] = useState({
    fullName: "",
    phone: "",
    jobTitle: "",
    timezone: "Asia/Jakarta",
    memberRole: "",
  });
  const [privateGatewayDraft, setPrivateGatewayDraft] = useState({
    merchantCode: "",
    apiKey: "",
    sandbox: false,
    paymentMethod: "SQ",
  });
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    () => readSettingsTab(searchParams.get("tab")) ?? "details",
  );
  const needsConfig = activeTab === "payment" || activeTab === "media";
  const { data: config } = useAppConfig(needsConfig);
  const saveConfig = useSaveAppConfig();
  // Subscription state determines which tab is available, so keep this small
  // organization query available immediately. The heavier member and gateway
  // queries remain lazy below.
  const { data: tenant, isLoading: isLoadingTenant } = useTenantDetails();
  const { data: members = [] } = useTenantMembers(activeTab === "organization");
  const { data: privateGateway } = usePaymentGatewaySettings(
    activeTab === "payment",
  );
  const updatePaymentMode = useUpdatePaymentCollectionMode();
  const updateQrisPaymentMethod = useUpdateQrisPaymentMethod();
  const savePrivateGateway = useSavePaymentGatewaySettings();
  const tabsListRef = useRef<HTMLDivElement>(null);
  const formSnapshotRef = useRef<SettingsForm | null>(null);
  const gatewaySnapshotRef = useRef<typeof privateGatewayDraft | null>(null);
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
        payment_mode:
          tenant?.payment_collection_mode === "custom" ? "private" : "sharing",
        qris_payment_method:
          tenant?.qris_payment_method === "SP" ? "SP" : "SQ",
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
  }, [config, tenant?.payment_collection_mode, tenant?.qris_payment_method]);

  useEffect(() => {
    if (!privateGateway) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setPrivateGatewayDraft((draft) => ({
        ...draft,
        merchantCode: privateGateway.merchantCode,
        apiKey: "",
        sandbox: false,
        paymentMethod: privateGateway.paymentMethod || "SQ",
      }));
    });
    return () => {
      cancelled = true;
    };
  }, [privateGateway]);

  const handleSave = async (
    scope: Extract<SettingsTab, "payment" | "media">,
  ) => {
    if (!config) {
      toast.error("Configuration is not ready to load.");
      return false;
    }

    const appConfigPatch: Partial<
      Omit<AppConfigRow, "id" | "updated_at">
    > =
      scope === "payment"
        ? {
            qris_auto_retry: form.qris_auto_retry,
          }
        : {
            download_expiry_hours: form.download_expiry_hours,
            gallery_retention_days: form.gallery_retention_days,
            storage_provider: form.storage_provider,
            watermark_enabled: form.watermark_enabled,
          };

    const mutations: Array<Promise<unknown>> = [
      saveConfig.mutateAsync(appConfigPatch),
    ];

    if (scope === "payment") {
      const paymentMode =
        form.payment_mode === "private" ? "custom" : "platform";
      if (paymentMode === "custom") {
        if (!privateGatewayDraft.merchantCode.trim()) {
          toast.error(t("settings.duitkuMerchantRequired"));
          return false;
        }
        if (!privateGateway?.hasApiKey && !privateGatewayDraft.apiKey.trim()) {
          toast.error("API key Duitku wajib diisi untuk Payment Private.");
          return false;
        }
        mutations.push(
          savePrivateGateway.mutateAsync({
            merchantCode: privateGatewayDraft.merchantCode,
            apiKey: privateGatewayDraft.apiKey,
            sandbox: false,
            paymentMethod: form.qris_payment_method,
          }),
        );
      }

      mutations.push(updatePaymentMode.mutateAsync(paymentMode));
      mutations.push(
        updateQrisPaymentMethod.mutateAsync(form.qris_payment_method),
      );
    }

    try {
      await Promise.all(mutations);
      toast.success("Settings saved successfully");
      return true;
    } catch (err) {
      toast.error(
        getUserFacingErrorMessage(
          err,
          "Pengaturan belum dapat disimpan. Coba lagi.",
        ),
      );
      return false;
    }
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
        getUserFacingErrorMessage(
          err,
          "Profil belum dapat diperbarui. Coba lagi.",
        ),
      );
    } finally {
      setProfileSaving(false);
    }
  };

  const subscriptionActive = Boolean(tenant?.subscription_is_active);

  const currentMember = members.find((m) => m.email === account.email);
  const myRole = currentMember?.role ?? initialMemberRole ?? "partner";
  const canEditOrg = myRole === "owner" || myRole === "admin";
  const isOwnerOrAdmin = myRole === "owner" || myRole === "admin";

  const visibleTabs = getSettingsTabs(t).filter((tab) => {
    if (!isOwnerOrAdmin) {
      return tab.id === "details" || tab.id === "organization";
    }
    return true;
  });

  const subscriptionRequired = searchParams.get("subscription") === "required";
  const organizationOnly = !isLoadingTenant && !subscriptionActive;
  const isSavingSettings =
    saveConfig.isPending ||
    updatePaymentMode.isPending ||
    updateQrisPaymentMethod.isPending ||
    savePrivateGateway.isPending;

  const openPaymentEditor = () => {
    formSnapshotRef.current = { ...form };
    gatewaySnapshotRef.current = { ...privateGatewayDraft };
    setEditPaymentOpen(true);
  };

  const closePaymentEditor = (restoreDraft = true) => {
    if (restoreDraft && formSnapshotRef.current) {
      setForm(formSnapshotRef.current);
    }
    if (restoreDraft && gatewaySnapshotRef.current) {
      setPrivateGatewayDraft(gatewaySnapshotRef.current);
    }
    formSnapshotRef.current = null;
    gatewaySnapshotRef.current = null;
    setEditPaymentOpen(false);
  };

  const openMediaEditor = () => {
    formSnapshotRef.current = { ...form };
    setEditMediaOpen(true);
  };

  const closeMediaEditor = (restoreDraft = true) => {
    if (restoreDraft && formSnapshotRef.current) {
      setForm(formSnapshotRef.current);
    }
    formSnapshotRef.current = null;
    setEditMediaOpen(false);
  };
  const visibleActiveTab: SettingsTab = organizationOnly
    ? "organization"
    : visibleTabs.some((t) => t.id === activeTab)
      ? activeTab
      : "details";

  useEffect(() => {
    const activeTrigger = tabsListRef.current?.querySelector<HTMLElement>(
      `[data-settings-tab="${visibleActiveTab}"]`,
    );
    activeTrigger?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [visibleActiveTab]);

  const getHeaderAction = () => {
    if (visibleActiveTab === "details") {
      return (
        <Button
          type="button"
          onClick={() => {
            setProfileDraft({
              fullName: account.fullName,
              phone: account.phone,
              jobTitle: account.jobTitle,
              timezone: account.timezone,
              memberRole: currentMember?.role ?? initialMemberRole ?? "",
            });
            setEditProfileOpen(true);
          }}
          className="rounded-xl"
        >
          <UserRound className="size-4" />
          Change profile
        </Button>
      );
    }

    if (visibleActiveTab === "organization") {
      if (!canEditOrg) return null;
      return (
        <Button
          type="button"
          onClick={() => {
            setOrganizationEditSection("workspace");
            setEditOrganizationOpen(true);
          }}
          className="rounded-xl"
        >
          <PencilLine className="size-4" />
          Edit organization
        </Button>
      );
    }

    if (visibleActiveTab === "payment") {
      return (
        <Button
          type="button"
          onClick={openPaymentEditor}
          className="rounded-xl"
        >
          <PencilLine className="size-4" />
          Edit payment
        </Button>
      );
    }

    if (visibleActiveTab === "media") {
      return (
        <Button
          type="button"
          onClick={openMediaEditor}
          className="rounded-xl"
        >
          <PencilLine className="size-4" />
          Edit
        </Button>
      );
    }

    return null;
  };

  return (
    <div className="-mx-4 min-w-0 sm:mx-0">
      <PageHeader
        title="Settings"
        description="Manage account profile, workspace, payment, media, and POSKART defaults."
        action={getHeaderAction()}
      />

      <div className="space-y-3">
        <nav className="flex items-stretch gap-2">
          <div
            ref={tabsListRef}
            className="flex min-w-0 flex-1 flex-nowrap gap-1 overflow-x-auto rounded-full border border-zinc-200 bg-zinc-50 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {visibleTabs.map((tab) => {
              const active = visibleActiveTab === tab.id;
              const disabled = organizationOnly && tab.id !== "organization";
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  data-settings-tab={tab.id}
                  onClick={() => {
                    if (!disabled) setActiveTab(tab.id);
                  }}
                  disabled={disabled}
                  className={cn(
                    "flex min-w-[150px] flex-1 shrink-0 items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00357B]/20",
                    active
                      ? "bg-white text-zinc-950 shadow-sm hover:bg-white"
                      : "text-zinc-500 hover:bg-white/70 hover:text-zinc-900",
                    disabled &&
                      "cursor-not-allowed opacity-40 hover:bg-transparent hover:text-zinc-500",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="min-w-0 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-200/40 sm:p-6 lg:p-8">
          {visibleActiveTab === "details" ? (
            <ProfileCard
              account={account}
              currentMemberRole={
                currentMember?.role ?? initialMemberRole ?? undefined
              }
            />
          ) : null}

          {visibleActiveTab === "organization" ? (
            <OrganizationCard
              myEmail={account.email}
              subscriptionRequired={subscriptionRequired}
              isEditing={false}
            />
          ) : null}

          {visibleActiveTab === "payment" ? (
            <PaymentSettingsCard
              form={form}
              setForm={setForm}
              superadminGateway={
                config?.subscription_payment_gateway ??
                form.subscription_payment_gateway
              }
              privateGateway={privateGateway}
              privateGatewayDraft={privateGatewayDraft}
              setPrivateGatewayDraft={setPrivateGatewayDraft}
              mode="summary"
            />
          ) : null}

          {visibleActiveTab === "media" ? (
            <MediaSettingsCard form={form} setForm={setForm} mode="summary" />
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
          currentMemberRole={currentMember?.role ?? initialMemberRole ?? undefined}
        />
      )}

      {editOrganizationOpen ? (
        <Dialog
          open={editOrganizationOpen}
          onOpenChange={(open) => setEditOrganizationOpen(open)}
          title="Edit organization"
          className="max-w-3xl rounded-3xl"
        >
          <div
            className="mb-3 grid gap-1 rounded-full border border-zinc-200 bg-zinc-50 p-1"
            style={{
              gridTemplateColumns: `repeat(${myRole === "owner" ? 3 : 2}, minmax(0, 1fr))`,
            }}
          >
            {[
              {
                id: "workspace" as const,
                label: "Workspace",
                icon: Building2,
              },
              ...(myRole === "owner"
                ? [
                    {
                      id: "payout" as const,
                      label: "Payout",
                      icon: Landmark,
                    },
                  ]
                : []),
              { id: "team" as const, label: "Team", icon: UsersRound },
            ].map((section) => {
              const Icon = section.icon;
              const active = organizationEditSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setOrganizationEditSection(section.id)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-white text-zinc-950 shadow-sm"
                      : "text-zinc-500 hover:bg-white/70 hover:text-zinc-900",
                  )}
                >
                  <Icon className="size-4" />
                  {section.label}
                </button>
              );
            })}
          </div>
          <OrganizationCard
            myEmail={account.email}
            subscriptionRequired={subscriptionRequired}
            isEditing
            editSection={organizationEditSection}
          />
        </Dialog>
      ) : null}

      {editPaymentOpen ? (
        <Dialog
          open={editPaymentOpen}
          onOpenChange={(open) => {
            if (!open) closePaymentEditor();
          }}
          title="Edit payment settings"
          className="max-w-3xl rounded-3xl"
        >
          <form
            className="space-y-5"
            onSubmit={async (event) => {
              event.preventDefault();
              const saved = await handleSave("payment");
              if (saved) closePaymentEditor(false);
            }}
          >
            <PaymentSettingsCard
              form={form}
              setForm={setForm}
              superadminGateway={
                config?.subscription_payment_gateway ??
                form.subscription_payment_gateway
              }
              privateGateway={privateGateway}
              privateGatewayDraft={privateGatewayDraft}
              setPrivateGatewayDraft={setPrivateGatewayDraft}
              mode="form"
            />
            <div className="-mx-4 -mb-4 border-t border-zinc-100 bg-white px-4 pt-3 sm:-mx-5 sm:-mb-5 sm:px-5">
              <DialogActions
                submitting={isSavingSettings}
                submitLabel="Save changes"
                submittingLabel="Saving..."
                onCancel={() => closePaymentEditor()}
              />
            </div>
          </form>
        </Dialog>
      ) : null}

      {editMediaOpen ? (
        <Dialog
          open={editMediaOpen}
          onOpenChange={(open) => {
            if (!open) closeMediaEditor();
          }}
          title="Edit media & gallery"
          className="max-w-3xl rounded-3xl"
        >
          <form
            className="space-y-5"
            onSubmit={async (event) => {
              event.preventDefault();
              const saved = await handleSave("media");
              if (saved) closeMediaEditor(false);
            }}
          >
            <MediaSettingsCard form={form} setForm={setForm} mode="form" />
            <div className="-mx-4 -mb-4 border-t border-zinc-100 bg-white px-4 pt-3 sm:-mx-5 sm:-mb-5 sm:px-5">
              <DialogActions
                submitting={isSavingSettings}
                submitLabel="Save changes"
                submittingLabel="Saving..."
                onCancel={() => closeMediaEditor()}
              />
            </div>
          </form>
        </Dialog>
      ) : null}
    </div>
  );
}
