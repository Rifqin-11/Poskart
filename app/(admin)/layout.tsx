import { AdminShell } from "@/features/admin/shell/admin-shell";
import { AdminPermissionProvider } from "@/features/admin/hooks/admin-permission-provider";
import { PrintQueuePanel } from "@/features/admin/printing/print-queue-panel";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { getQueryClient } from "@/lib/query-client.server";
import { getAdminBootstrap } from "@/server/admin/bootstrap";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { connection } from "next/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();

  const bootstrap = await getAdminBootstrap();
  const queryClient = getQueryClient();

  queryClient.setQueryData(
    adminQueryKeys.organizationDetails,
    bootstrap.organization,
  );
  queryClient.setQueryData(
    adminQueryKeys.subscriptionStatus,
    bootstrap.subscription,
  );
  queryClient.setQueryData(
    adminQueryKeys.adminNotifications,
    bootstrap.notifications,
  );

  return (
    <>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <AdminPermissionProvider
          role={bootstrap.userRole}
          isSuperAdmin={bootstrap.isSuperAdmin}
        >
          <AdminShell
            userEmail={bootstrap.userEmail}
            userName={bootstrap.userName}
            userRole={bootstrap.userRole}
            isSuperAdmin={bootstrap.isSuperAdmin}
          >
            {children}
          </AdminShell>
        </AdminPermissionProvider>
        <PrintQueuePanel />
      </HydrationBoundary>
    </>
  );
}
