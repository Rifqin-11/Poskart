"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { adminQueryKeys } from "@/features/admin/query-keys";

/**
 * useRealtimeSync
 *
 * Subscribes to Supabase Realtime changes on `layout_schemas` and `devices`
 * tables. When the Flutter kiosk app updates the active theme or device status,
 * this hook invalidates the relevant React Query caches so the web dashboard
 * reflects the change immediately without a full page refresh.
 *
 * Mount this once at a high level (e.g. inside the admin layout or a shared
 * provider) so only one channel is opened per user session.
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

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
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
