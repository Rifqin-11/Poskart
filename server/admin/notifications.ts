"use server";

import {
  getAdminContext,
  getAdminMembership,
  getAdminProfileRole,
} from "@/server/admin/context";
import { getServiceRoleClient } from "@/lib/supabase/server";
import type {
  AdminNotification,
  AdminNotificationGroup,
  CreateAdminNotificationInput,
} from "@/types/admin-notification";

type SupabaseLike = Awaited<ReturnType<typeof getAdminContext>>["supabase"];

type AdminNotificationRow = {
  id: string;
  audience: AdminNotification["audience"];
  recipient_profile_id: string | null;
  organization_id: string | null;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

const NOTIFICATION_COLUMNS =
  "id,audience,recipient_profile_id,organization_id,type,title,body,href,metadata,read_at,created_at";
const NOTIFICATION_VISIBLE_MS = 60 * 60 * 1000;
const SUBSCRIPTION_REMINDER_VISIBLE_MS = 8 * 24 * 60 * 60 * 1000;

function mapNotification(row: AdminNotificationRow): AdminNotification {
  return {
    id: row.id,
    audience: row.audience,
    recipientProfileId: row.recipient_profile_id,
    organizationId: row.organization_id,
    type: row.type,
    title: row.title,
    body: row.body,
    href: row.href,
    metadata: row.metadata ?? {},
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export async function createAdminNotification(
  supabase: SupabaseLike,
  input: CreateAdminNotificationInput,
) {
  // Use service role client to bypass RLS when creating notifications programmatically from the backend
  const serviceRoleClient = await getServiceRoleClient();

  if (input.audience === "organization" && input.organizationId) {
    const { data: members, error: memberError } = await supabase
      .from("organization_members")
      .select("profile_id")
      .eq("organization_id", input.organizationId);

    if (!memberError && members?.length) {
      const { error } = await serviceRoleClient
        .from("admin_notifications")
        .insert(
          members
            .map((member) => member.profile_id as string | null)
            .filter((profileId): profileId is string => Boolean(profileId))
            .map((profileId) => ({
              audience: "user",
              recipient_profile_id: profileId,
              organization_id: input.organizationId,
              type: input.type,
              title: input.title,
              body: input.body ?? null,
              href: input.href ?? null,
              metadata: input.metadata ?? {},
            })),
        );

      if (error && error.code !== "42P01" && error.code !== "42703") {
        throw new Error(`Gagal membuat notifikasi: ${error.message}`);
      }
      return;
    }
  }

  if (input.audience === "superadmin") {
    const { data: admins, error: adminError } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin");

    if (!adminError && admins?.length) {
      const { error } = await serviceRoleClient
        .from("admin_notifications")
        .insert(
          admins
            .map((admin) => admin.id as string | null)
            .filter((profileId): profileId is string => Boolean(profileId))
            .map((profileId) => ({
              audience: "user",
              recipient_profile_id: profileId,
              organization_id: input.organizationId ?? null,
              type: input.type,
              title: input.title,
              body: input.body ?? null,
              href: input.href ?? null,
              metadata: input.metadata ?? {},
            })),
        );

      if (error && error.code !== "42P01" && error.code !== "42703") {
        throw new Error(`Gagal membuat notifikasi: ${error.message}`);
      }
      return;
    }
  }

  const { error } = await serviceRoleClient.from("admin_notifications").insert({
    audience: input.audience,
    recipient_profile_id: input.recipientProfileId ?? null,
    organization_id: input.organizationId ?? null,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    href: input.href ?? null,
    metadata: input.metadata ?? {},
  });

  if (error && error.code !== "42P01" && error.code !== "42703") {
    throw new Error(`Gagal membuat notifikasi: ${error.message}`);
  }
}

export type BroadcastTarget = "all" | "organization" | "user";

export type BroadcastAdminNotificationInput = {
  target: BroadcastTarget;
  organizationId?: string | null;
  recipientProfileId?: string | null;
  type: string;
  title: string;
  body?: string | null;
  href?: string | null;
};

export async function broadcastAdminNotification(
  input: BroadcastAdminNotificationInput,
) {
  const { supabase } = await getAdminContext();
  const role = await getAdminProfileRole();
  if (role !== "admin") {
    throw new Error("Hanya POSKART yang dapat mengirim notifikasi broadcast.");
  }

  const serviceRoleClient = await getServiceRoleClient();
  const base = {
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    href: input.href ?? null,
    metadata: {},
  };

  if (input.target === "all") {
    const { data: allProfiles, error } = await serviceRoleClient
      .from("profiles")
      .select("id");
    if (error) throw new Error(`Gagal memuat profiles: ${error.message}`);
    if (!allProfiles?.length) return;

    const { error: insertError } = await serviceRoleClient
      .from("admin_notifications")
      .insert(
        allProfiles.map((p) => ({
          ...base,
          audience: "user" as const,
          recipient_profile_id: p.id as string,
          organization_id: null,
        })),
      );
    if (insertError) throw new Error(`Gagal broadcast notifikasi: ${insertError.message}`);
    return;
  }

  if (input.target === "organization" && input.organizationId) {
    const { data: members, error } = await supabase
      .from("organization_members")
      .select("profile_id")
      .eq("organization_id", input.organizationId);
    if (error) throw new Error(`Gagal memuat anggota: ${error.message}`);
    if (!members?.length) return;

    const { error: insertError } = await serviceRoleClient
      .from("admin_notifications")
      .insert(
        members
          .map((m) => m.profile_id as string | null)
          .filter((id): id is string => Boolean(id))
          .map((profileId) => ({
            ...base,
            audience: "user" as const,
            recipient_profile_id: profileId,
            organization_id: input.organizationId ?? null,
          })),
      );
    if (insertError) throw new Error(`Gagal broadcast notifikasi: ${insertError.message}`);
    return;
  }

  if (input.target === "user" && input.recipientProfileId) {
    const { error: insertError } = await serviceRoleClient
      .from("admin_notifications")
      .insert({
        ...base,
        audience: "user" as const,
        recipient_profile_id: input.recipientProfileId,
        organization_id: null,
      });
    if (insertError) throw new Error(`Gagal kirim notifikasi: ${insertError.message}`);
    return;
  }

  throw new Error("Target tidak valid atau data tidak lengkap.");
}

export async function getMyAdminNotifications(): Promise<AdminNotification[]> {
  const { supabase, user } = await getAdminContext();
  const visibleSince = new Date(
    Date.now() - NOTIFICATION_VISIBLE_MS,
  ).toISOString();
  const subscriptionReminderVisibleSince = new Date(
    Date.now() - SUBSCRIPTION_REMINDER_VISIBLE_MS,
  ).toISOString();

  const role = await getAdminProfileRole();

  // Build recipient filter: who this notification is addressed to
  let recipientFilter: string;
  if (role === "admin") {
    recipientFilter = `recipient_profile_id.eq.${user.id},audience.eq.superadmin`;
  } else {
    const membership = await getAdminMembership();
    const parts = [`recipient_profile_id.eq.${user.id}`];
    if (membership) {
      parts.push(`organization_id.eq.${membership.organizationId}`);
    }
    recipientFilter = parts.join(",");
  }

  // Each row must satisfy BOTH: (recipient matches) AND (within visible window)
  // Using nested and() inside or() to express:
  //   (recipient AND recent) OR (recipient AND subscription_reminder AND within_8days)
  const filter = [
    `and(or(${recipientFilter}),created_at.gte.${visibleSince})`,
    `and(or(${recipientFilter}),type.eq.subscription_expiry_reminder,created_at.gte.${subscriptionReminderVisibleSince})`,
  ].join(",");

  const { data, error } = await supabase
    .from("admin_notifications")
    .select(NOTIFICATION_COLUMNS)
    .or(filter)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) {
    if (error.code === "42P01" || error.code === "42703") return [];
    throw new Error(`Gagal memuat notifikasi: ${error.message}`);
  }

  return ((data ?? []) as AdminNotificationRow[]).map(mapNotification);
}

export async function getSuperAdminNotifications(): Promise<AdminNotificationGroup[]> {
  const role = await getAdminProfileRole();
  if (role !== "admin") throw new Error("Akses ditolak.");

  const serviceRoleClient = await getServiceRoleClient();
  const { data, error } = await serviceRoleClient
    .from("admin_notifications")
    .select(NOTIFICATION_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    if (error.code === "42P01" || error.code === "42703") return [];
    throw new Error(`Gagal memuat notifikasi: ${error.message}`);
  }

  const rows = (data ?? []) as AdminNotificationRow[];

  // Group rows that represent the same broadcast: same type+title+body+href,
  // sent within a 60-second window. Keep the earliest row as the representative.
  const groups: AdminNotificationGroup[] = [];
  const used = new Set<number>();

  for (let i = 0; i < rows.length; i++) {
    if (used.has(i)) continue;
    const base = rows[i];
    const baseTime = new Date(base.created_at).getTime();
    let count = 1;

    for (let j = i + 1; j < rows.length; j++) {
      if (used.has(j)) continue;
      const other = rows[j];
      const timeDiff = Math.abs(baseTime - new Date(other.created_at).getTime());
      if (
        timeDiff <= 60_000 &&
        other.type === base.type &&
        other.title === base.title &&
        other.body === base.body &&
        other.href === base.href
      ) {
        used.add(j);
        count++;
      }
    }

    used.add(i);
    groups.push({ ...mapNotification(base), recipientCount: count });
  }

  return groups;
}

export async function deleteSuperAdminNotification(id: string): Promise<void> {
  const role = await getAdminProfileRole();
  if (role !== "admin") throw new Error("Akses ditolak.");

  const serviceRoleClient = await getServiceRoleClient();
  const { error } = await serviceRoleClient
    .from("admin_notifications")
    .delete()
    .eq("id", id);

  if (error) throw new Error(`Gagal menghapus notifikasi: ${error.message}`);
}

export async function markMyAdminNotificationsRead(ids?: string[]) {
  const { supabase } = await getAdminContext();
  const now = new Date().toISOString();
  let query = supabase
    .from("admin_notifications")
    .update({ read_at: now })
    .is("read_at", null);

  if (ids?.length) {
    query = query.in("id", ids);
  }

  const { error } = await query;
  if (error && error.code !== "42P01" && error.code !== "42703") {
    throw new Error(`Gagal menandai notifikasi: ${error.message}`);
  }
}
