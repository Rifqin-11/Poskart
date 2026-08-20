"use client";

import { useState } from "react";

export function ReportPdfVerifier({ reportId }: { reportId: string }) {
  const [status, setStatus] = useState<"idle" | "checking" | "valid" | "modified" | "error">("idle");
  const [message, setMessage] = useState("");

  async function verify(file: File) {
    setStatus("checking");
    setMessage("");
    const form = new FormData();
    form.set("pdf", file);
    try {
      const response = await fetch(`/api/verify/transaction-report/${reportId}`, { method: "POST", body: form });
      const result = await response.json() as { status?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "PDF tidak dapat diverifikasi.");
      if (result.status === "valid") {
        setStatus("valid");
        setMessage("Valid. File PDF sama persis dengan laporan yang diterbitkan POSKART.");
      } else {
        setStatus("modified");
        setMessage("Tidak cocok. File PDF telah berubah atau bukan laporan asli ini.");
      }
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "PDF tidak dapat diverifikasi.");
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-sm font-semibold text-zinc-900">Cek file PDF</p>
      <p className="mt-1 text-xs leading-5 text-zinc-500">PDF hanya diproses untuk menghitung hash dan tidak disimpan.</p>
      <label className="mt-3 inline-flex cursor-pointer">
        <input
          className="sr-only"
          type="file"
          accept="application/pdf,.pdf"
          disabled={status === "checking"}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void verify(file);
            event.currentTarget.value = "";
          }}
        />
        <span className="inline-flex h-9 items-center justify-center rounded-xl bg-zinc-950 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800">
          {status === "checking" ? "Memeriksa..." : "Unggah PDF untuk diperiksa"}
        </span>
      </label>
      {message ? <p className={`mt-3 text-sm ${status === "valid" ? "text-emerald-700" : "text-red-700"}`}>{message}</p> : null}
    </div>
  );
}
