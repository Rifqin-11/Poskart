import { AdminShell } from "@/features/admin/shell/admin-shell";
import { PrintQueuePanel } from "@/features/admin/printing/print-queue-panel";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdminEmail } from "@/lib/auth/admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const isSuperAdmin = isSuperAdminEmail(data.user?.email);

  return (
    <>
      <AdminShell userEmail={data.user?.email} isSuperAdmin={isSuperAdmin}>
        {children}
      </AdminShell>
      <PrintQueuePanel />
    </>
  );
}
