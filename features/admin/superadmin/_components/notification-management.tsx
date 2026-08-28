"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { showErrorToast, toast } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  useSuperAdminNotifications,
  useDeleteSuperAdminNotification,
} from "@/features/admin/superadmin/use-superadmin";
import type { AdminNotificationGroup } from "@/types/admin-notification";

const PAGE_SIZE = 20;

export function NotificationManagement() {
  const { data: notifications = [], isLoading } = useSuperAdminNotifications();
  const deleteNotification = useDeleteSuperAdminNotification();
  const confirmDelete = useConfirmDialog();
  const [page, setPage] = useState(1);

  const paginated = notifications.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const handleDelete = (notification: AdminNotificationGroup) => {

    confirmDelete.confirm({
      title: "Hapus notifikasi?",
      description: `Notifikasi "${notification.title}" akan dihapus permanen.`,
      confirmLabel: "Hapus",
      destructive: true,
      onConfirm: () => {
        deleteNotification.mutate(notification.id, {
          onSuccess: () => toast.success("Notifikasi dihapus."),
          onError: (err) =>
            showErrorToast(
              "Notifikasi tidak dapat dihapus",
              err,
              "Gagal menghapus notifikasi.",
            ),
        });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="py-8 text-center text-sm text-zinc-500">
        Memuat notifikasi…
      </div>
    );
  }

  if (!notifications.length) {
    return (
      <div className="rounded-3xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-500">
        Belum ada notifikasi.
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Riwayat Notifikasi</CardTitle>
        <CardDescription>
          Semua notifikasi yang pernah dikirim ke pengguna aplikasi.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {confirmDelete.dialog}
        <div className="overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead>Judul</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Audience</TableHead>
                <TableHead>Penerima</TableHead>
                <TableHead>Dikirim</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((n) => (
                <TableRow key={n.id}>
                  <TableCell>
                    <div className="font-medium">{n.title}</div>
                    {n.body && (
                      <div className="mt-0.5 max-w-xs truncate text-xs text-zinc-500">
                        {n.body}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-zinc-600">
                      {n.type}
                    </span>
                  </TableCell>
                  <TableCell>
                    <AudienceBadge notification={n} />
                  </TableCell>
                  <TableCell className="text-sm text-zinc-500">
                    {n.recipientCount > 1 ? (
                      <span>{n.recipientCount} pengguna</span>
                    ) : (
                      <span>1 pengguna</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-zinc-500">
                    {new Date(n.createdAt).toLocaleString("id-ID", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(n)}
                      className="text-zinc-400 hover:text-red-500"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="mt-3">
          <TablePagination
            page={page}
            pageSize={PAGE_SIZE}
            totalItems={notifications.length}
            onPageChange={setPage}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function AudienceBadge({ notification }: { notification: AdminNotificationGroup }) {
  if (notification.organizationId) {
    return <Badge variant="secondary">Org</Badge>;
  }
  if (notification.audience === "superadmin") {
    return <Badge variant="warning">Superadmin</Badge>;
  }
  return <Badge variant="secondary">User</Badge>;
}
