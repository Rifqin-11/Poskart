"use server";

import {
  getAdminContext,
  getAdminMembership,
  getAdminProfileRole,
} from "@/server/admin/context";
import { getServiceRoleClient } from "@/lib/supabase/server";
import type {
  AdminNotification,
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
      const { error } = await serviceRoleClient.from("admin_notifications").insert(
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
      const { error } = await serviceRoleClient.from("admin_notifications").insert(
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

export async function getMyAdminNotifications(): Promise<AdminNotification[]> {
  const { supabase, user } = await getAdminContext();
  const visibleSince = new Date(Date.now() - NOTIFICATION_VISIBLE_MS).toISOString();

  let query = supabase
    .from("admin_notifications")
    .select(NOTIFICATION_COLUMNS)
    .gte("created_at", visibleSince)
    .order("created_at", { ascending: false })
    .limit(30);

  if ((await getAdminProfileRole()) === "admin") {
    query = query.or(
      `recipient_profile_id.eq.${user.id},audience.eq.superadmin`,
    );
  } else {
    const membership = await getAdminMembership();
    const filters = [`recipient_profile_id.eq.${user.id}`];
    if (membership) {
      filters.push(`organization_id.eq.${membership.organizationId}`);
    }
    query = query.or(filters.join(","));
  }

  const { data, error } = await query;
  if (error) {
    if (error.code === "42P01" || error.code === "42703") return [];
    throw new Error(`Gagal memuat notifikasi: ${error.message}`);
  }

  return ((data ?? []) as AdminNotificationRow[]).map(mapNotification);
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
