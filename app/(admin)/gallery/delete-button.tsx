"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { deleteGallerySession } from "./actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";

export function DeleteSessionButton({ sessionId }: { sessionId: string }) {
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteGallerySession(sessionId);
      toast.success("Foto berhasil dihapus");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal menghapus foto",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        disabled={loading}
        onClick={() => setConfirmOpen(true)}
        aria-label="Hapus hasil foto"
        className="grid size-8 place-items-center rounded-lg bg-zinc-100 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Trash2 className="size-3.5" />
        )}
      </button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        options={{
          title: "Hapus foto ini?",
          description: "Tindakan ini akan menghapus foto dari galeri web dan menghapus file secara permanen dari server cloud. Tindakan ini tidak dapat dibatalkan.",
          confirmLabel: "Hapus Permanen",
          cancelLabel: "Batal",
          destructive: true,
          onConfirm: handleDelete,
        }}
      />
    </>
  );
}
