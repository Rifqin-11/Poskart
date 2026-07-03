"use client";

import { useEffect, useState } from "react";
import { useTenantMembers } from "@/features/admin/organization/use-organization";
import { createClient } from "@/lib/supabase/client";

export type Role = "owner" | "admin" | "designer" | "akuntan" | "partner";

export function usePermission() {
  const { data: members = [] } = useTenantMembers();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then((res) => {
      setUserEmail(res.data?.user?.email ?? null);
    });
  }, []);

  const currentMember = members.find((m) => m.email === userEmail);
  const role = (currentMember?.role as Role) ?? "partner"; // Default to partner (read-only)

  const isOwnerOrAdmin = role === "owner" || role === "admin";

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
    isAdmin: role === "admin",
    isOwnerOrAdmin,
    isReadOnly,
  };
}
