import { notFound } from "next/navigation";

import { ReportPdfVerifier } from "@/features/public/transaction-report/report-pdf-verifier";
import { formatCurrency, formatWibDateTime } from "@/lib/utils";
import { getTransactionReportVerification } from "@/server/admin/transaction-report-verification";

export const dynamic = "force-dynamic";

export default async function TransactionReportVerificationPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const report = await getTransactionReportVerification(reportId);
  if (!report) notFound();

  return (
    <main className="grid min-h-screen place-items-center bg-zinc-100 p-6">
      <section className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.16em] text-[#00357B]">POSKART VERIFY</p>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-950">Laporan terdaftar</h1>
        <div className="mt-5 space-y-3 text-sm text-zinc-600">
          <p>Laporan ini diterbitkan oleh POSKART. Unggah PDF asli untuk memeriksa apakah isi file berubah.</p>
          <p><strong className="text-zinc-900">Waktu terbit:</strong> {formatWibDateTime(report.issuedAt)} WIB</p>
          <p><strong className="text-zinc-900">Ringkasan:</strong> {report.transactionCount} transaksi · {report.sessionCount} sesi · {report.printCount} print</p>
          <p><strong className="text-zinc-900">Total keuntungan:</strong> {formatCurrency(report.profit)}</p>
        </div>
        <ReportPdfVerifier reportId={report.id} />
      </section>
    </main>
  );
}
