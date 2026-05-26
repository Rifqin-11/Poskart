import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TenantManagement } from "@/components/data-table/operations-pages";

export default async function TenantsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email;

  const adminEmails = ["rifqinaufal9009@gmail.com", "admin@poskart.id", "admin@poskart.my.id"];
  const isSuperAdmin = email && adminEmails.includes(email.toLowerCase());

  if (!isSuperAdmin) {
    redirect("/dashboard");
  }

  return <TenantManagement />;
}
