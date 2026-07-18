"use server";

import { cache } from "react";
import {
  getAdminContext,
  getAdminMembership,
  getAdminProfileRole,
} from "@/server/admin/context";
import { getMyOrganizationDetails } from "@/server/admin/actions/organization-actions";
import { getSubscriptionStatus } from "@/server/admin/actions/dashboard-actions";
import { getMyAdminNotifications } from "@/server/admin/notifications";

const getCachedAdminBootstrap = cache(async () => {
  const { user } = await getAdminContext();
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const userName =
    (typeof metadata?.full_name === "string" && metadata.full_name.trim()) ||
    (typeof metadata?.name === "string" && metadata.name.trim()) ||
    (typeof metadata?.display_name === "string" &&
      metadata.display_name.trim()) ||
    user.email ||
    "POSKART User";

  const [membership, profileRole, organization, subscription, notifications] =
    await Promise.all([
      getAdminMembership(),
      getAdminProfileRole(),
      getMyOrganizationDetails().catch(() => null),
      getSubscriptionStatus(),
      getMyAdminNotifications(),
    ]);

  return {
    userEmail: user.email,
    userName,
    userRole: membership?.role ?? null,
    isSuperAdmin: profileRole === "admin",
    organization,
    subscription,
    notifications,
    userProfile: {
      email: user.email ?? "",
      systemRole:
        typeof user.app_metadata?.role === "string"
          ? user.app_metadata.role
          : user.role ?? "authenticated",
      fullName: userName,
      phone: typeof metadata?.phone === "string" ? metadata.phone : "",
      jobTitle:
        typeof metadata?.job_title === "string" ? metadata.job_title : "",
      timezone:
        typeof metadata?.timezone === "string"
          ? metadata.timezone
          : "Asia/Jakarta",
    },
  };
});

export async function getAdminBootstrap() {
  return getCachedAdminBootstrap();
}
