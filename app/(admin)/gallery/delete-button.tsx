"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { deleteGallerySession } from "./actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { showErrorToast, toast } from "@/lib/toast";
import { usePermission } from "@/features/admin/hooks/use-permission";

export function DeleteSessionButton({ sessionId }: { sessionId: string }) {
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { isReadOnly } = usePermission();

  if (isReadOnly("gallery")) {
    return null;
  }

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteGallerySession(sessionId);
      toast.success("Photo deleted successfully");
    } catch (error) {
      showErrorToast(
        "Photo deletion failed",
        error,
        "The photo could not be removed. Please try again.",
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
        aria-label="Delete photo"
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
          title: "Delete this photo?",
          description: "This will permanently remove the photo from the web gallery and delete the file from cloud storage. This action cannot be undone.",
          confirmLabel: "Delete Permanently",
          cancelLabel: "Cancel",
          destructive: true,
          onConfirm: handleDelete,
        }}
      />
    </>
  );
}
