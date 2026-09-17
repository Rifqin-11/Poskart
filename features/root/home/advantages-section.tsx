import { Link2, WifiOff, CreditCard, MonitorCog } from "lucide-react";

const advantages = [
  {
    icon: MonitorCog,
    title: "Kelola banyak booth",
    description: "Lihat kondisi setiap device dari satu dashboard.",
  },
  {
    icon: WifiOff,
    title: "Tetap jalan offline",
    description: "Foto dan print tetap berjalan tanpa internet.",
  },
  {
    icon: CreditCard,
    title: "Pembayaran fleksibel",
    description: "QRIS saat online, cash melalui voucher.",
  },
  {
    icon: Link2,
    title: "Perangkat yang jelas",
    description: "Dirancang untuk tablet Android dan thermal printer.",
  },
];

const requirements = [
  {
    label: "Sistem operasi",
    value: "Android 10+",
    detail: "Minimum teknis Android 7 (API 24) pada perangkat ARM64.",
  },
  {
    label: "Perangkat",
    value: "Tablet 10 inci+",
    detail: "Resolusi minimum 1280×800, orientasi landscape direkomendasikan.",
  },
  {
    label: "Kamera",
    value: "Kamera tablet",
    detail: "Kamera depan atau belakang melalui Android CameraX.",
  },
  {
    label: "Printer",
    value: "Thermal USB",
    detail: "ESC/POS 58 mm atau 80 mm melalui USB Host/OTG.",
  },
  {
    label: "Memori",
    value: "4 GB RAM",
    detail: "Direkomendasikan untuk operasional booth harian.",
  },
  {
    label: "Koneksi",
    value: "Wi-Fi atau seluler",
    detail: "Dibutuhkan untuk QRIS, pairing, sinkronisasi, dan upload hasil.",
  },
];

export function AdvantagesSection() {
  return (
    <section id="compatibility" className="scroll-mt-[72px] bg-white py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-[90rem] px-5 sm:px-8 lg:px-12">
        <div className="mb-14 max-w-2xl">
          <h2 className="text-4xl font-black leading-[0.98] tracking-tight text-zinc-900 sm:text-5xl">
            Dirancang untuk operasional booth.
          </h2>
          <p className="mt-5 text-lg leading-7 text-zinc-600">
            POSKART memberikan kontrol penuh terhadap operasi booth Anda dengan spesifikasi yang jelas.
          </p>
        </div>

        {/* Advantage rows */}
        <div className="divide-y divide-zinc-200 border-b border-zinc-200">
          {advantages.map(({ icon: Icon, title, description }) => (
            <div key={title} className="grid gap-3 py-7 md:grid-cols-4 md:gap-8">
              <div className="flex items-center md:col-span-1">
                <Icon className="size-5 text-[#014EB4]" strokeWidth={1.5} />
              </div>
              <div className="md:col-span-1">
                <h3 className="text-base font-bold text-zinc-900">{title}</h3>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm leading-6 text-zinc-600">{description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Device requirements */}
        <div className="mt-16">
          <h3 className="text-2xl font-bold tracking-tight text-zinc-900">
            Requirement perangkat
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
            Pastikan perangkat booth Anda memenuhi kebutuhan berikut sebelum memulai.
          </p>

          <dl className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {requirements.map((requirement) => (
              <div
                key={requirement.label}
                className="rounded-2xl border border-zinc-200 bg-[#F7F8FA] p-6"
              >
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  {requirement.label}
                </dt>
                <dd className="mt-3 text-lg font-bold tracking-tight text-zinc-900">
                  {requirement.value}
                </dd>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  {requirement.detail}
                </p>
              </div>
            ))}
          </dl>

          <p className="mt-6 text-sm leading-6 text-zinc-500">
            Belum yakin perangkat Anda didukung? Hubungi tim POSKART untuk pemeriksaan
            kompatibilitas sebelum membeli perangkat baru.
          </p>
        </div>
      </div>
    </section>
  );
}
