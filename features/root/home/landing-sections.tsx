"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LandingButton } from "@/components/ui/landing-button";

const commonQuestions = [
  {
    question: "Apakah POSKART cocok untuk satu booth?",
    answer:
      "Ya. Paket Starter dibuat untuk satu device, dan Anda bisa menambah kapasitas ketika mulai mengelola booth atau event yang lebih banyak.",
  },
  {
    question: "Perangkat Android apa yang didukung?",
    answer:
      "POSKART direkomendasikan untuk tablet Android 10+ dengan arsitektur ARM64, RAM minimum 4 GB, dan layar 10 inci atau lebih. Secara teknis aplikasi dapat dipasang mulai Android 7 (API 24), tetapi Android 10+ memberikan pengalaman operasional yang lebih stabil.",
  },
  {
    question: "Printer apa yang kompatibel?",
    answer:
      "POSKART mendukung direct printing ke printer thermal USB ESC/POS dengan kertas 58 mm atau 80 mm melalui koneksi USB Host/OTG. Printer lain dapat digunakan jika tersedia melalui Android Print Service atau driver yang kompatibel pada tablet Anda.",
  },
  {
    question: "Apa yang terjadi jika internet mati saat event?",
    answer:
      "Device yang sudah dipasangkan dapat tetap mengambil foto, mencetak hasil, dan menerima pembayaran cash melalui voucher yang tersimpan. Foto akan disimpan dalam antrean dan diupload otomatis setelah koneksi kembali. QRIS, pairing device baru, sinkronisasi konfigurasi, dan halaman download tamu memerlukan internet.",
  },
  {
    question: "Apakah foto pengunjung aman dan tersimpan?",
    answer:
      "Foto pengunjung disimpan di perangkat booth selama event berlangsung, kemudian diupload ke cloud setelah koneksi tersedia. Masa berlaku link download dan periode penyimpanan hasil foto dapat dikonfigurasi sesuai kebijakan operasional Anda.",
  },
  {
    question: "Apakah tersedia QRIS dan cash?",
    answer:
      "POSKART mendukung pembayaran QRIS melalui integrasi payment gateway dan penerimaan cash melalui voucher yang diberikan operator. QRIS memerlukan koneksi internet, sementara alur cash melalui voucher tetap dapat berjalan saat offline.",
  },
  {
    question: "Apakah Showcase termasuk dalam paket?",
    answer:
      "Showcase tersedia untuk semua paket dan dapat digunakan untuk membagikan pilihan frame, theme, serta referensi visual kepada cafe atau calon partner event.",
  },
] as const;

export function LandingFAQ() {
  return (
    <section id="faq" className="scroll-mt-[72px] overflow-hidden bg-white">
      <div className="mx-auto grid max-w-[90rem] gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[0.7fr_1.3fr] lg:px-12 lg:py-24">
        <div>
          <h2 className="max-w-md text-4xl font-black leading-[0.96] tracking-tight sm:text-5xl">
            Sebelum mulai
          </h2>
          <p className="mt-5 max-w-sm text-base leading-7 text-zinc-600">
            Jawaban singkat untuk kebutuhan operator baru dan bisnis yang sedang berkembang.
          </p>
        </div>
        <div className="divide-y divide-zinc-200 border-t border-zinc-200">
          {commonQuestions.map(({ question, answer }, index) => (
            <details key={question} open={index === 0}>
              <summary className="list-none cursor-pointer py-5 text-base font-semibold text-zinc-900 transition-colors hover:text-[#014EB4]">
                {question}
              </summary>
              <p className="max-w-2xl pb-5 pr-10 text-sm leading-6 text-zinc-600">
                {answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Closing call to action.
 *
 * Renders the banner only: on the homepage it is placed inside
 * `HomeClosingSequence`, which supplies the gradient backdrop and lets the
 * footer sheet rise over it.
 */
export function LandingCTA() {
  return (
    <section className="mx-auto w-full max-w-[90rem]">
      <div className="overflow-hidden rounded-[28px] border border-white/40 bg-[radial-gradient(140%_130%_at_50%_-20%,#5FA8FF_0%,#014EB4_50%,#00357B_100%)] px-6 py-16 text-center shadow-[0_30px_80px_rgba(0,53,123,0.24)] sm:rounded-[36px] sm:px-12 sm:py-20 lg:py-24">
        <h2 className="mx-auto max-w-3xl text-4xl font-black leading-[0.98] tracking-tight text-white sm:text-5xl">
          Coba POSKART di booth Anda.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-7 text-white/85">
          Uji alur dari pairing sampai print sebelum event berikutnya.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <LandingButton variant="primary" size="lg" asChild>
            <Link href="/register">
              Coba gratis <ArrowRight className="size-4" />
            </Link>
          </LandingButton>
          <LandingButton variant="outlineLight" size="lg" asChild>
            <Link href="/contact">Tanya tim POSKART</Link>
          </LandingButton>
        </div>
      </div>
    </section>
  );
}
