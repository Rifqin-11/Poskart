import "server-only";

import { getSiteUrl } from "@/lib/auth/site-url";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const REMINDER_DAYS = new Set([7, 3, 1]);
const JAKARTA_TIME_ZONE = "Asia/Jakarta";

type SubscriptionRow = {
  organization_id: string;
  current_period_end: string;
};

type OrganizationMemberRow = {
  organization_id: string;
  profile_id: string;
  role: "owner" | "admin";
  profiles: { email: string | null } | Array<{ email: string | null }> | null;
};

type OrganizationRow = {
  id: string;
  name: string;
};

type ReminderRow = {
  id: string;
  notification_sent_at: string | null;
  email_sent_at: string | null;
};

export type SubscriptionExpiryReminderResult = {
  eligibleSubscriptions: number;
  reminderRecipients: number;
  inAppNotifications: number;
  emails: number;
  skipped: number;
};

export async function sendSubscriptionExpiryReminders(): Promise<SubscriptionExpiryReminderResult> {
  const supabase = createSupabaseAdminClient();
  const now = new Date();
  const searchUntil = new Date(now);
  searchUntil.setUTCDate(searchUntil.getUTCDate() + 8);

  const { data: rawSubscriptions, error: subscriptionsError } = await supabase
    .from("subscriptions")
    .select("organization_id,current_period_end")
    .in("status", ["active", "trialing"])
    .gt("current_period_end", now.toISOString())
    .lte("current_period_end", searchUntil.toISOString());
  if (subscriptionsError) {
    throw new Error(
      `Unable to load subscriptions for expiry reminders: ${subscriptionsError.message}`,
    );
  }

  const subscriptions = ((rawSubscriptions ?? []) as SubscriptionRow[]).filter(
    (subscription) =>
      REMINDER_DAYS.has(
        daysUntilInJakarta(subscription.current_period_end, now),
      ),
  );
  if (subscriptions.length === 0) {
    return emptyReminderResult();
  }

  const organizationIds = Array.from(
    new Set(subscriptions.map((subscription) => subscription.organization_id)),
  );
  const [
    { data: rawOrganizations, error: organizationsError },
    { data: rawMembers, error: membersError },
  ] = await Promise.all([
    supabase.from("organizations").select("id,name").in("id", organizationIds),
    supabase
      .from("organization_members")
      .select(
        "organization_id,profile_id,role,profiles!organization_members_profile_id_fkey(email)",
      )
      .in("organization_id", organizationIds)
      .in("role", ["owner", "admin"]),
  ]);
  if (organizationsError) {
    throw new Error(
      `Unable to load organizations for expiry reminders: ${organizationsError.message}`,
    );
  }
  if (membersError) {
    throw new Error(
      `Unable to load organization recipients for expiry reminders: ${membersError.message}`,
    );
  }

  const organizations = new Map(
    ((rawOrganizations ?? []) as OrganizationRow[]).map((organization) => [
      organization.id,
      organization,
    ]),
  );
  const membersByOrganization = new Map<string, OrganizationMemberRow[]>();
  for (const member of (rawMembers ?? []) as OrganizationMemberRow[]) {
    const members = membersByOrganization.get(member.organization_id) ?? [];
    members.push(member);
    membersByOrganization.set(member.organization_id, members);
  }

  const siteUrl = await getSiteUrl();
  const result: SubscriptionExpiryReminderResult = {
    eligibleSubscriptions: subscriptions.length,
    reminderRecipients: 0,
    inAppNotifications: 0,
    emails: 0,
    skipped: 0,
  };

  for (const subscription of subscriptions) {
    const daysBefore = daysUntilInJakarta(subscription.current_period_end, now);
    const organization = organizations.get(subscription.organization_id);
    if (!organization || !REMINDER_DAYS.has(daysBefore)) {
      result.skipped++;
      continue;
    }

    for (const member of membersByOrganization.get(
      subscription.organization_id,
    ) ?? []) {
      const profile = Array.isArray(member.profiles)
        ? member.profiles[0]
        : member.profiles;
      const email = profile?.email?.trim().toLowerCase();
      if (!email) {
        result.skipped++;
        continue;
      }

      const reminder = await claimReminder({
        supabase,
        organizationId: subscription.organization_id,
        profileId: member.profile_id,
        currentPeriodEnd: subscription.current_period_end,
        daysBefore,
      });
      if (!reminder) {
        result.skipped++;
        continue;
      }

      result.reminderRecipients++;
      const expiryLabel = formatJakartaDate(subscription.current_period_end);
      const title = `Subscription berakhir dalam ${daysBefore} hari`;
      const body = `${organization.name} aktif sampai ${expiryLabel}. Perpanjang subscription untuk menjaga akses dashboard dan booth.`;
      const href = "/subscriptions";

      if (!reminder.notification_sent_at) {
        const { error: notificationError } = await supabase
          .from("admin_notifications")
          .insert({
            audience: "user",
            recipient_profile_id: member.profile_id,
            organization_id: subscription.organization_id,
            type: "subscription_expiry_reminder",
            title,
            body,
            href,
            metadata: {
              currentPeriodEnd: subscription.current_period_end,
              daysBefore,
            },
          });
        if (notificationError) {
          throw new Error(
            `Unable to create subscription reminder notification: ${notificationError.message}`,
          );
        }
        await markReminderSent(supabase, reminder.id, "notification_sent_at");
        result.inAppNotifications++;
      }

      if (!reminder.email_sent_at) {
        const sent = await sendSubscriptionExpiryEmail({
          email,
          organizationName: organization.name,
          daysBefore,
          expiryLabel,
          renewalUrl: `${siteUrl}/subscriptions`,
        });
        if (sent) {
          await markReminderSent(supabase, reminder.id, "email_sent_at");
          result.emails++;
        }
      }
    }
  }

  return result;
}

async function claimReminder({
  supabase,
  organizationId,
  profileId,
  currentPeriodEnd,
  daysBefore,
}: {
  supabase: ReturnType<typeof createSupabaseAdminClient>;
  organizationId: string;
  profileId: string;
  currentPeriodEnd: string;
  daysBefore: number;
}) {
  const payload = {
    organization_id: organizationId,
    recipient_profile_id: profileId,
    current_period_end: currentPeriodEnd,
    days_before: daysBefore,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("subscription_expiry_reminders")
    .upsert(payload, {
      onConflict:
        "organization_id,recipient_profile_id,current_period_end,days_before",
      ignoreDuplicates: true,
    })
    .select("id,notification_sent_at,email_sent_at")
    .maybeSingle();
  if (error) {
    throw new Error(`Unable to claim subscription reminder: ${error.message}`);
  }

  // A conflict means this recipient already received this exact reminder.
  return (data as ReminderRow | null) ?? null;
}

async function markReminderSent(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  reminderId: string,
  column: "notification_sent_at" | "email_sent_at",
) {
  const { error } = await supabase
    .from("subscription_expiry_reminders")
    .update({
      [column]: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", reminderId);
  if (error) {
    throw new Error(`Unable to update subscription reminder: ${error.message}`);
  }
}

function daysUntilInJakarta(value: string, now: Date) {
  const target = jakartaDateKey(new Date(value));
  const today = jakartaDateKey(now);
  const targetUtc = Date.UTC(target.year, target.month - 1, target.day);
  const todayUtc = Date.UTC(today.year, today.month - 1, today.day);
  return Math.round((targetUtc - todayUtc) / (24 * 60 * 60 * 1000));
}

function jakartaDateKey(value: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: JAKARTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const lookup = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
  };
}

function formatJakartaDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: JAKARTA_TIME_ZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

async function sendSubscriptionExpiryEmail({
  email,
  organizationName,
  daysBefore,
  expiryLabel,
  renewalUrl,
}: {
  email: string;
  organizationName: string;
  daysBefore: number;
  expiryLabel: string;
  renewalUrl: string;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return false;

  const from =
    process.env.GALLERY_EMAIL_FROM ?? "POSKART <noreply@poskart.my.id>";
  const safeOrganizationName = escapeHtml(organizationName);
  const safeRenewalUrl = escapeHtml(renewalUrl);
  const subject = `Subscription POSKART berakhir dalam ${daysBefore} hari`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject,
      text: `${organizationName} aktif sampai ${expiryLabel}. Perpanjang subscription POSKART sebelum masa aktif berakhir: ${renewalUrl}`,
      html: `<div style="font-family:Arial,sans-serif;color:#18181b;max-width:560px;margin:auto;padding:28px;border:1px solid #e4e4e7;border-radius:20px"><div style="font-size:12px;letter-spacing:2px;font-weight:700;color:#00357B">POSKART SUBSCRIPTION</div><h1 style="font-size:26px;margin:12px 0">Berakhir dalam ${daysBefore} hari</h1><p style="line-height:1.6;color:#52525b">Subscription <strong>${safeOrganizationName}</strong> aktif sampai <strong>${expiryLabel}</strong>.</p><p style="line-height:1.6;color:#52525b">Perpanjang sebelum masa aktif berakhir agar dashboard dan booth tetap dapat digunakan.</p><p style="margin:26px 0"><a href="${safeRenewalUrl}" style="display:inline-block;background:#00357B;color:#fff;text-decoration:none;border-radius:999px;padding:13px 20px;font-weight:700">Perpanjang subscription</a></p></div>`,
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Subscription reminder email failed: ${detail || response.statusText}`,
    );
  }
  return true;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    return (
      {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      }[character] ?? character
    );
  });
}

function emptyReminderResult(): SubscriptionExpiryReminderResult {
  return {
    eligibleSubscriptions: 0,
    reminderRecipients: 0,
    inAppNotifications: 0,
    emails: 0,
    skipped: 0,
  };
}
