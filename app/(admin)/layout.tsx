import { AdminShell } from "@/components/layout/admin-shell";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  return <AdminShell userEmail={data.user?.email}>{children}</AdminShell>;
}
