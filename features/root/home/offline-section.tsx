import Image from "next/image";
import { WifiOff, Printer, Camera, FileUp } from "lucide-react";
import { landingAssets } from "@/features/root/home/landing-content";

const offlineCapabilities = [
  {
    icon: Camera,
    title: "Ambil foto & preview",
    description: "Dengan template brand Anda.",
  },
  {
    icon: Printer,
    title: "Print thermal langsung",
    description: "Via USB ESC/POS tanpa server.",
  },
  {
    icon: FileUp,
    title: "Upload otomatis",
    description: "Hasil tersinkron setelah online.",
  },
];

export function OfflineSection() {
  return (
    <section className="scroll-mt-[72px] bg-[#0D0F12] py-20 text-white sm:py-24 lg:py-28">
      <div className="mx-auto max-w-[90rem] px-5 sm:px-8 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-4xl font-black leading-[0.98] tracking-tight sm:text-5xl">
              Koneksi terganggu, sesi tetap berjalan.
            </h2>
            <p className="mt-5 text-lg leading-7 text-white/80">
              Foto, preview, voucher, dan print berjalan lokal. Hasil disimpan dalam antrean lalu di-upload saat internet kembali.
            </p>
            <p className="mt-3 text-sm leading-6 text-white/60">
              QRIS, pairing baru, dan web download membutuhkan internet.
            </p>
          </div>

          <div className="relative hidden lg:block">
            <div className="relative overflow-hidden rounded-[28px] border border-white/10">
              <Image
                src={landingAssets.boothApp.src}
                alt="Aplikasi booth POSKART berjalan dalam mode offline"
                width={560}
                height={420}
                className="h-auto w-full object-contain"
              />
            </div>
            <div className="absolute -bottom-5 -right-4">
              <div className="flex items-center gap-3 rounded-xl bg-white/10 p-3 backdrop-blur-sm">
                <WifiOff className="size-5 text-emerald-400" strokeWidth={1.5} />
                <span className="text-xs font-semibold">Cetak & foto offline</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {offlineCapabilities.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex items-start gap-3 rounded-xl bg-white/5 p-5">
              <Icon className="mt-0.5 size-4 shrink-0 text-white" strokeWidth={1.5} />
              <div>
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="text-xs text-white/60">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
