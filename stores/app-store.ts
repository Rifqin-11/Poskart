"use client";

import { create } from "zustand";

type AppState = {
  tenantId: string;
  setTenantId: (tenantId: string) => void;
};

export const useAppStore = create<AppState>((set) => ({
  tenantId: "TNT-01",
  setTenantId: (tenantId) => set({ tenantId }),
}));
