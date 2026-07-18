"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Role } from "@/features/admin/hooks/permission-types";

type AdminPermissionContextValue = {
  role: Role;
  isSuperAdmin: boolean;
};

const AdminPermissionContext = createContext<AdminPermissionContextValue>({
  role: "partner",
  isSuperAdmin: false,
});

export function AdminPermissionProvider({
  role,
  isSuperAdmin,
  children,
}: {
  role?: string | null;
  isSuperAdmin: boolean;
  children: ReactNode;
}) {
  const normalizedRole: Role =
    role === "owner" ||
    role === "admin" ||
    role === "designer" ||
    role === "akuntan" ||
    role === "partner"
      ? role
      : "partner";

  return (
    <AdminPermissionContext.Provider
      value={{ role: normalizedRole, isSuperAdmin }}
    >
      {children}
    </AdminPermissionContext.Provider>
  );
}

export function useAdminPermissionContext() {
  return useContext(AdminPermissionContext);
}
