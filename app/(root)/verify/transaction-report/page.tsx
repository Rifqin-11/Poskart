import Link from "next/link";

export const dynamic = "force-dynamic";

export default function TransactionReportVerificationPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-zinc-100 p-6">
      <section className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.16em] text-[#00357B]">POSKART VERIFY</p>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-950">
          Verifikasi laporan transaksi
        </h1>
        <p className="mt-4 text-sm leading-6 text-zinc-600">Pindai QR pada laporan PDF untuk membuka halaman verifikasi spesifik laporan.</p>
        <Link className="mt-5 inline-block text-sm font-medium text-[#00357B] hover:underline" href="/">Kembali ke POSKART</Link>
      </section>
    </main>
  );
}
