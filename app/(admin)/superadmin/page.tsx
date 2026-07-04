import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TenantManagement } from "@/features/admin/superadmin";
import { isSuperAdminProfile } from "@/lib/auth/admin";

export default async function TenantsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!(await isSuperAdminProfile(supabase, data.user?.id))) {
    redirect("/dashboard");
  }

  return <TenantManagement />;
}
