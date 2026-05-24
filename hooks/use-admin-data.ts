"use client";

import { useQuery } from "@tanstack/react-query";
import { adminService } from "@/lib/services/admin-service";

export function useDashboardData() {
  return useQuery({ queryKey: ["dashboard"], queryFn: adminService.dashboard });
}

export function useTransactions() {
  return useQuery({ queryKey: ["transactions"], queryFn: adminService.transactions });
}

export function useBooths() {
  return useQuery({ queryKey: ["booths"], queryFn: adminService.booths });
}

export function useTemplates() {
  return useQuery({ queryKey: ["templates"], queryFn: adminService.templates });
}

export function usePricing() {
  return useQuery({ queryKey: ["pricing"], queryFn: adminService.pricing });
}

export function useTenants() {
  return useQuery({ queryKey: ["tenants"], queryFn: adminService.tenants });
}

export function useThemes() {
  return useQuery({ queryKey: ["themes"], queryFn: adminService.themes });
}

export function useAssets() {
  return useQuery({ queryKey: ["assets"], queryFn: adminService.assets });
}
