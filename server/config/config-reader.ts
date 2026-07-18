import "server-only";

import { cache } from "react";
import {
  APP_CONFIG_ID,
  APP_CONFIG_SELECT_COLUMNS,
} from "@/lib/app-config";
import { getAdminContext } from "@/server/admin/context";
import type { AppConfigRow } from "@/types/app-config";

const getCachedAppConfig = cache(async (): Promise<AppConfigRow | null> => {
  const { supabase } = await getAdminContext();
  const { data, error } = await supabase
    .from("app_configs")
    .select(APP_CONFIG_SELECT_COLUMNS)
    .eq("id", APP_CONFIG_ID)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load app config: ${error.message}`);
  }

  return (data as AppConfigRow | null) ?? null;
});

export async function getServerAppConfig() {
  return getCachedAppConfig();
}
