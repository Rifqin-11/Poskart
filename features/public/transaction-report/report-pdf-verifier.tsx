"use client";

import { useRef, useState } from "react";
import { AlertTriangle, FileText, LoaderCircle, ShieldCheck, Upload } from "lucide-react";

type VerificationStatus = "idle" | "checking" | "valid" | "modified" | "error";

export function ReportPdfVerifier({ reportId }: { reportId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<VerificationStatus>("idle");
  const [message, setMessage] = useState("");
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  async function verify(file: File) {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setStatus("error");
      setMessage("Pilih file PDF untuk diperiksa.");
      return;
    }
    setStatus("checking");
    setMessage("");
    setFileName(file.name);
    const form = new FormData();
    form.set("pdf", file);
    try {
      const response = await fetch(`/api/verify/transaction-report/${reportId}`, {
        method: "POST",
        body: form,
      });
      const result = (await response.json()) as { status?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "PDF tidak dapat diverifikasi.");
      if (result.status === "valid") {
        setStatus("valid");
        setMessage("File identik dengan laporan yang diterbitkan POSKART.");
      } else {
        setStatus("modified");
        setMessage("Hash file tidak cocok. PDF telah diubah atau bukan laporan asli ini.");
      }
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "PDF tidak dapat diverifikasi.");
    }
  }

  const resultStyle = status === "valid"
    ? "border-emerald-200 bg-emerald-50 text-emerald-950"
    : "border-red-200 bg-red-50 text-red-950";

  return (
    <section className="mt-7 border-t border-zinc-200 pt-6" aria-labelledby="pdf-check-title">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#00357B] text-white shadow-[0_8px_20px_rgba(0,53,123,0.18)]">
          <ShieldCheck className="size-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#00357B]">Pemeriksaan integritas</p>
          <h2 id="pdf-check-title" className="mt-1 text-lg font-semibold tracking-tight text-zinc-950">Cek file PDF</h2>
          <p className="mt-1 max-w-md text-sm leading-6 text-zinc-500">Tarik PDF ke area ini atau pilih dari perangkat. File dipakai sesaat untuk menghitung hash dan tidak disimpan.</p>
        </div>
      </div>

      <input ref={inputRef} className="sr-only" type="file" accept="application/pdf,.pdf" disabled={status === "checking"} onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) void verify(file);
        event.currentTarget.value = "";
      }} />
      <button
        type="button"
        disabled={status === "checking"}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => { event.preventDefault(); if (status !== "checking") setIsDragging(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => { event.preventDefault(); setIsDragging(false); }}
        onDrop={(event) => { event.preventDefault(); setIsDragging(false); const file = event.dataTransfer.files?.[0]; if (file) void verify(file); }}
        className={`mt-5 flex min-h-40 w-full flex-col items-center justify-center rounded-2xl border border-dashed px-5 text-center transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00357B] focus-visible:ring-offset-2 disabled:cursor-wait ${isDragging ? "border-[#00357B] bg-blue-50 shadow-[inset_0_0_0_1px_#00357B]" : "border-zinc-300 bg-zinc-50 hover:border-[#00357B] hover:bg-blue-50/50"}`}
      >
        <span className={`grid size-11 place-items-center rounded-xl transition ${isDragging ? "bg-[#00357B] text-white" : "bg-white text-[#00357B] shadow-sm ring-1 ring-zinc-200"}`}>
          {status === "checking" ? <LoaderCircle className="size-5 animate-spin" /> : <Upload className="size-5" />}
        </span>
        <span className="mt-3 text-sm font-semibold text-zinc-900">{status === "checking" ? "Memeriksa integritas file..." : "Tarik dan lepas PDF di sini"}</span>
        <span className="mt-1 text-xs text-zinc-500">atau klik untuk memilih file · maksimal 10 MB</span>
      </button>

      {fileName ? <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500"><FileText className="size-4 text-[#00357B]" /><span className="truncate">{fileName}</span></div> : null}
      {message ? <div className={`mt-4 flex gap-3 rounded-xl border p-4 ${resultStyle}`} role="status">
        {status === "valid" ? <ShieldCheck className="mt-0.5 size-5 shrink-0" /> : <AlertTriangle className="mt-0.5 size-5 shrink-0" />}
        <div><p className="text-sm font-semibold">{status === "valid" ? "PDF terverifikasi" : "PDF tidak terverifikasi"}</p><p className="mt-1 text-sm leading-5 opacity-80">{message}</p></div>
      </div> : null}
    </section>
  );
}
