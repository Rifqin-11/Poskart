import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TenantManagement } from "@/components/data-table/operations-pages";
import { isSuperAdminEmail } from "@/lib/auth/admin";

export default async function TenantsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email;

  if (!isSuperAdminEmail(email)) {
    redirect("/dashboard");
  }

  return <TenantManagement />;
}
