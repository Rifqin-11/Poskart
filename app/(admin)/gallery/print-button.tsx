"use client";

import { useState } from "react";
import { Loader2, Printer } from "lucide-react";
import { toast } from "sonner";

import { queueGalleryPrint } from "./actions";

export function PrintSessionButton({
  sessionId,
  disabled = false,
}: {
  sessionId: string;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  const handlePrint = async () => {
    setLoading(true);
    try {
      await queueGalleryPrint(sessionId, 1);
      toast.success("Perintah print dikirim ke device");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal mengirim print",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={handlePrint}
      aria-label="Print foto pada device"
      title={
        disabled ? "Foto framed atau device tidak tersedia" : "Print di device"
      }
      className="grid size-8 place-items-center rounded-lg bg-zinc-100 text-zinc-700 transition-colors hover:bg-zinc-950 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
    >
      {loading ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Printer className="size-3.5" />
      )}
    </button>
  );
}
