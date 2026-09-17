import Link from "next/link";
import { ArrowRight, Building2, Download, Smartphone } from "lucide-react";
import { LandingButton } from "@/components/ui/landing-button";

export function PlatformSection() {
  return (
    <section id="features" className="scroll-mt-[72px] bg-white py-20 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-[90rem] px-5 sm:px-8 lg:px-12">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <h2 className="text-4xl font-black leading-[0.98] tracking-tight text-zinc-900 sm:text-5xl">
            Satu sistem, dua ruang kerja.
          </h2>
          <p className="mt-5 text-lg leading-7 text-zinc-600">
            POSKART memiliki Admin Web untuk mengelola bisnis dan Aplikasi Booth untuk menjalankan operasional di lokasi.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
          {/* Admin Web */}
          <article className="flex flex-col rounded-3xl bg-[#F1F2F4] p-7 sm:p-8">
            <div className="mb-5 flex items-center gap-3">
              <Building2 className="size-5 text-[#014EB4]" strokeWidth={1.5} />
              <h3 className="text-xl font-bold text-zinc-900">Admin Web</h3>
            </div>
            <p className="mb-6 text-base leading-7 text-zinc-600">
              Atur theme, frame, transaksi, device, dan operasional dari browser.
            </p>
            <ul className="space-y-2.5 text-sm leading-6 text-zinc-600">
              <li>• Kelola theme dan template</li>
              <li>• Pantau device dan status</li>
              <li>• Lihat transaksi dan antrean</li>
              <li>• Atur harga dan paket sesi</li>
            </ul>
            <div className="mt-auto pt-8">
              <LandingButton variant="primary" size="md" asChild className="w-full sm:w-auto">
                <Link href="/dashboard">
                  Buka dashboard <ArrowRight className="size-4" />
                </Link>
              </LandingButton>
            </div>
          </article>

          {/* Booth App */}
          <article className="flex flex-col rounded-3xl bg-[#F1F2F4] p-7 sm:p-8">
            <div className="mb-5 flex items-center gap-3">
              <Smartphone className="size-5 text-[#014EB4]" strokeWidth={1.5} />
              <h3 className="text-xl font-bold text-zinc-900">Aplikasi Booth</h3>
            </div>
            <p className="mb-6 text-base leading-7 text-zinc-600">
              Jalankan pembayaran, capture, preview, retake, dan print dari tablet Android.
            </p>
            <ul className="space-y-2.5 text-sm leading-6 text-zinc-600">
              <li>• Capture dan preview</li>
              <li>• QRIS dan voucher</li>
              <li>• Thermal printing</li>
              <li>• Antrean pengunjung</li>
            </ul>
            <div className="mt-auto pt-8">
              <LandingButton variant="primary" size="md" asChild className="w-full sm:w-auto">
                <Link href="/download">
                  Download <Download className="size-4" />
                </Link>
              </LandingButton>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
