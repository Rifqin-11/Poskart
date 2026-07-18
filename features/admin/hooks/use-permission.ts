"use client";

import { useAdminPermissionContext } from "@/features/admin/hooks/admin-permission-provider";
export type { Role } from "@/features/admin/hooks/permission-types";

export function usePermission() {
  const { role, isSuperAdmin } = useAdminPermissionContext();
  const isOwnerOrAdmin =
    isSuperAdmin || role === "owner" || role === "admin";

  const isReadOnly = (
    feature:
      | "dashboard"
      | "transactions"
      | "invoices"
      | "pricing"
      | "themes"
      | "templates"
      | "vouchers"
      | "devices"
      | "gallery"
  ): boolean => {
    if (isOwnerOrAdmin) return false;

    switch (feature) {
      case "dashboard":
      case "transactions":
      case "invoices":
      case "pricing":
        return role !== "akuntan"; // akuntan is read-write, others are read-only

      case "themes":
      case "templates":
      case "vouchers":
        return role !== "designer"; // designer is read-write, others are read-only

      case "devices":
      case "gallery":
        return true; // only owner/admin can write to devices and gallery

      default:
        return true;
    }
  };

  return {
    role,
    isOwner: role === "owner",
    isAdmin: isSuperAdmin || role === "admin",
    isOwnerOrAdmin,
    isReadOnly,
  };
}
