import { AdminShell } from "@/features/admin/shell/admin-shell";
import { PrintQueuePanel } from "@/features/admin/printing/print-queue-panel";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdminProfile } from "@/lib/auth/admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const isSuperAdmin = await isSuperAdminProfile(supabase, data.user?.id);
  const metadata = data.user?.user_metadata as
    | Record<string, unknown>
    | undefined;
  const userName =
    (typeof metadata?.full_name === "string" && metadata.full_name.trim()) ||
    (typeof metadata?.name === "string" && metadata.name.trim()) ||
    (typeof metadata?.display_name === "string" && metadata.display_name.trim()) ||
    data.user?.email ||
    "POSKART User";

  return (
    <>
      <AdminShell
        userEmail={data.user?.email}
        userName={userName}
        isSuperAdmin={isSuperAdmin}
      >
        {children}
      </AdminShell>
      <PrintQueuePanel />
    </>
  );
}
