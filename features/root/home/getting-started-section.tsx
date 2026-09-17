const steps = [
  { number: "01", title: "Buat akun", description: "Mulai trial POSKART tanpa kartu kredit." },
  { number: "02", title: "Download aplikasi", description: "Pasang APK POSKART di tablet Android Anda." },
  { number: "03", title: "Pair device", description: "Hubungkan aplikasi booth dengan workspace melalui kode pairing." },
  { number: "04", title: "Atur dan uji", description: "Pilih frame, kamera, printer, lalu jalankan test session." },
] as const;

export function GettingStartedSection() {
  return (
    <section id="workflow" className="scroll-mt-[72px] bg-white py-20 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-[90rem] px-5 sm:px-8 lg:px-12">
        <div className="mb-12 max-w-2xl">
          <h2 className="text-4xl font-black leading-[0.98] tracking-tight text-zinc-900 sm:text-5xl">
            Mulai dalam empat langkah.
          </h2>
          <p className="mt-5 text-lg leading-7 text-zinc-600">
            Dari membuat akun sampai menjalankan test session di perangkat booth.
          </p>
        </div>

        <ol className="divide-y divide-zinc-200 border-y border-zinc-200 md:grid md:grid-cols-4 md:divide-x md:divide-y-0">
          {steps.map((step, index) => (
            <li key={step.number}>
              <article className={`relative py-7 transition-transform duration-300 ease-out hover:translate-x-3 md:px-6 md:py-8 md:hover:translate-x-2 motion-reduce:transform-none ${index === 0 ? "md:pl-0" : ""} ${index === steps.length - 1 ? "md:pr-0" : ""}`}>
                <p className="font-mono text-sm font-medium text-[#014EB4]">{step.number}</p>
                <h3 className="mt-10 text-xl font-bold tracking-tight text-zinc-900">{step.title}</h3>
                <p className="mt-3 max-w-xs text-sm leading-6 text-zinc-600">{step.description}</p>
              </article>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
