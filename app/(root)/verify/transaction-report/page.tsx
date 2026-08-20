import { readVerificationToken } from "@/server/admin/transaction-report-pdf";
import { formatWibDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TransactionReportVerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const report = token ? readVerificationToken(token) : null;

  return (
    <main className="grid min-h-screen place-items-center bg-zinc-100 p-6">
      <section className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.16em] text-[#00357B]">POSKART VERIFY</p>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-950">
          {report ? "Laporan terverifikasi" : "Laporan tidak dapat diverifikasi"}
        </h1>
        {report ? (
          <div className="mt-5 space-y-3 text-sm text-zinc-600">
            <p>Tautan verifikasi ini diterbitkan oleh POSKART dan belum diubah.</p>
            <p><strong className="text-zinc-900">Waktu terbit:</strong> {formatWibDateTime(report.issuedAt)} WIB</p>
            <p><strong className="text-zinc-900">Transaksi:</strong> {report.transactionCount} · <strong className="text-zinc-900">Sesi:</strong> {report.sessionCount} · <strong className="text-zinc-900">Print:</strong> {report.printCount}</p>
          </div>
        ) : (
          <p className="mt-4 text-sm leading-6 text-zinc-600">QR tidak valid atau tautan laporan telah diubah. Periksa juga status digital signature melalui Adobe Acrobat untuk memastikan file PDF tidak diedit setelah diterbitkan.</p>
        )}
      </section>
    </main>
  );
}
