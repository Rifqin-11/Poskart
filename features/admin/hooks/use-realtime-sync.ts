"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { adminQueryKeys } from "@/features/admin/query-keys";

/**
 * useRealtimeSync
 *
 * Subscribes to the small set of operational tables that can change while an
 * admin is looking at the app. It invalidates the relevant React Query caches
 * instead of requiring short global polling intervals.
 *
 * Mount this once at a high level (e.g. inside the admin layout or a shared
 * provider) so only one channel is opened per user session.
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let dashboardRefreshTimer: number | null = null;
    let lastDashboardRefreshAt = 0;

    // A kiosk can report status frequently. Batch dashboard refreshes so a
    // busy organization does not turn every row update into a full dashboard
    // request, while still keeping the dashboard fresh shortly after a sale
    // or confirmed print.
    const scheduleDashboardRefresh = () => {
      if (dashboardRefreshTimer) return;
      const elapsed = Date.now() - lastDashboardRefreshAt;
      const delay = Math.max(0, 20_000 - elapsed);
      dashboardRefreshTimer = window.setTimeout(() => {
        dashboardRefreshTimer = null;
        lastDashboardRefreshAt = Date.now();
        void queryClient.invalidateQueries({
          queryKey: adminQueryKeys.dashboard,
        });
      }, delay);
    };

    const channel = supabase
      .channel("admin-realtime-sync")
      // ── Layout schemas ────────────────────────────────────────────────────
      // Fired when Flutter activates/deactivates a layout (is_active changes)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "layout_schemas" },
        () => {
          queryClient.invalidateQueries({ queryKey: adminQueryKeys.layoutSchemas });
          queryClient.invalidateQueries({ queryKey: adminQueryKeys.layoutSchema });
        },
      )
      // ── Devices ───────────────────────────────────────────────────────────
      // Fired when Flutter updates device status, theme, or active profile
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "devices" },
        () => {
          queryClient.invalidateQueries({ queryKey: adminQueryKeys.devices });
          scheduleDashboardRefresh();
        },
      )
      // ── Transactions and confirmed print events ───────────────────────────
      // Keep transaction monitoring and dashboard totals in sync with kiosk
      // writes without adding a short global polling interval.
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        () => {
          void queryClient.invalidateQueries({
            queryKey: adminQueryKeys.transactionsRoot,
          });
          scheduleDashboardRefresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transaction_print_events" },
        () => {
          void queryClient.invalidateQueries({
            queryKey: adminQueryKeys.transactionsRoot,
          });
          scheduleDashboardRefresh();
        },
      )
      // ── Remote print queue ────────────────────────────────────────────────
      // The globally mounted queue panel wakes immediately when a job is
      // created, claimed, completed, or cancelled.
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "device_print_jobs" },
        () => {
          void queryClient.invalidateQueries({
            queryKey: ["active-device-print-jobs"],
          });
        },
      )
      .subscribe();

    return () => {
      if (dashboardRefreshTimer) {
        window.clearTimeout(dashboardRefreshTimer);
      }
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
