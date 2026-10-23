import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { LandingButton } from "@/components/ui/landing-button";
import { PublicFooter, PublicHeader } from "@/features/root/shell/public-site-shell";
import { productPageStructuredData, serializeJsonLd } from "@/lib/seo-structured-data";
import { receiptPhotoboothContent, type ReceiptPhotoboothLanguage } from "./content";

const container = "mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12";
const heading = "text-3xl font-bold leading-tight tracking-tight sm:text-4xl";
const paragraph = "mt-5 max-w-2xl text-base leading-7 text-zinc-600";
const textLink = "inline-flex items-center gap-2 text-sm font-semibold text-[#014EB4] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#014EB4]";

// Static server content: no session/database request or JS needed to read it.
// The English main overrides the Indonesian document language for its subtree;
// the shared site navigation/footer remain explicitly Indonesian.
export function ReceiptPhotoboothPage({ language }: { language: ReceiptPhotoboothLanguage }) {
  const copy = receiptPhotoboothContent[language];

  return (
    <div className="min-h-dvh bg-[#F7F8FA] text-zinc-950">
      <div lang="id"><PublicHeader /></div>
      <main lang={language} id="main-content">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(productPageStructuredData({
              path: copy.path,
              title: copy.title,
              description: copy.description,
              language,
              faqs: copy.faqs,
            })),
          }}
        />

        <section className="bg-white pb-12 pt-8 sm:pb-16">
          <div className={container}>
            <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-600">
              <nav aria-label={language === "en" ? "Breadcrumb" : "Breadcrumb halaman"}>
                <ol className="flex items-center gap-2">
                  <li><Link href="/" className="hover:underline">POSKART</Link></li>
                  <li aria-hidden="true">/</li>
                  <li aria-current="page">{language === "en" ? "Receipt photobooth app" : "Software receipt photobooth"}</li>
                </ol>
              </nav>
              <Link href={copy.languageHref} hrefLang={copy.otherLanguage} lang={copy.otherLanguage} className={textLink}>
                {copy.languageLabel} <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="grid items-center gap-10 pt-12 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
              <div>
                <h1 className="max-w-xl text-[clamp(2rem,3.4vw,3.25rem)] font-black leading-[1.08] tracking-tight">
                  {copy.heading}
                </h1>
                <p className="mt-4 text-xl font-semibold tracking-tight text-[#014EB4] sm:text-2xl">{copy.emphasis}</p>
                <p className={paragraph}>{copy.intro}</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <LandingButton asChild><Link href="/register">{copy.start}<ArrowRight className="size-4" aria-hidden="true" /></Link></LandingButton>
                  <LandingButton asChild variant="secondary"><Link href="/download">{copy.download}</Link></LandingButton>
                </div>
              </div>
              <figure className="min-w-0">
                <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 p-2">
                  <Image src="/landing/booth-camera.webp" alt={copy.cameraAlt} width={1600} height={1000} sizes="(min-width: 1024px) 45vw, 100vw" preload className="h-auto w-full rounded-xl" />
                </div>
                <figcaption className="mt-3 text-sm text-zinc-600">{copy.cameraCaption}</figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section className={`${container} py-16 sm:py-24`}>
          <div className="grid gap-12 md:grid-cols-2 md:gap-16">
            <div><h2 className={heading}>{copy.overviewTitle}</h2><p className={paragraph}>{copy.overview}</p></div>
            <div><h2 className={heading}>{copy.softwareTitle}</h2><p className={paragraph}>{copy.software}</p></div>
          </div>
        </section>

        <section className="bg-white py-16 sm:py-24">
          <div className={container}>
            <h2 className={`${heading} max-w-2xl`}>{copy.workflowTitle}</h2>
            <ol className="mt-10 grid gap-8 border-t border-zinc-200 pt-8 md:grid-cols-3 md:gap-10">
              {copy.workflow.map((step, index) => (
                <li key={step.title}>
                  <span className="font-mono text-sm text-[#014EB4]">0{index + 1}</span>
                  <h3 className="mt-4 text-xl font-semibold tracking-tight">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-600">{step.body}</p>
                </li>
              ))}
            </ol>
            <a href="https://docs.poskart.my.id" className={`${textLink} mt-8`}>{copy.docs}<ArrowUpRight className="size-4" aria-hidden="true" /></a>
          </div>
        </section>

        <section className={`${container} py-16 sm:py-24`}>
          <div className="grid gap-12 md:grid-cols-[1.2fr_0.8fr]">
            <div>
              <h2 className={`${heading} max-w-xl`}>{copy.operationsTitle}</h2>
              <p className={paragraph}>{copy.operations}</p>
              <Image src="/landing/dashboard.webp" alt={copy.dashboardAlt} width={1600} height={899} sizes="(min-width: 768px) 60vw, 100vw" className="mt-8 h-auto w-full rounded-2xl border border-zinc-200" />
            </div>
            <div className="md:pt-16">
              <Image src="/landing/frames.webp" alt={copy.framesAlt} width={1600} height={899} sizes="(min-width: 768px) 40vw, 100vw" className="h-auto w-full rounded-2xl border border-zinc-200" />
              <h2 className="mt-8 text-2xl font-bold tracking-tight">{copy.framesTitle}</h2>
              <p className={paragraph}>{copy.frames}</p>
            </div>
          </div>
        </section>

        <section className="bg-white py-16 sm:py-24">
          <div className={`${container} grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16`}>
            <div><h2 className={heading}>{copy.hardwareTitle}</h2><p className={paragraph}>{copy.hardwareIntro}</p></div>
            <dl className="grid gap-x-8 gap-y-8 sm:grid-cols-2">
              {copy.hardware.map(item => (
                <div key={item.title} className="border-t border-zinc-200 pt-5">
                  <dt className="text-base font-semibold">{item.title}</dt>
                  <dd className="mt-3 text-sm leading-6 text-zinc-600">{item.body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section id="faq" className={`${container} scroll-mt-24 py-16 sm:py-24`}>
          <h2 className={`${heading} max-w-2xl`}>{copy.faqTitle}</h2>
          <div className="mt-10 divide-y divide-zinc-200 border-y border-zinc-200">
            {copy.faqs.map(({ question, answer }) => (
              <details key={question} className="group">
                <summary className="cursor-pointer py-6 pr-4 text-base font-semibold group-open:text-[#014EB4] focus-visible:outline-2 focus-visible:outline-[#014EB4]">{question}</summary>
                <p className="max-w-3xl pb-6 text-base leading-7 text-zinc-600">{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="border-t border-blue-100 bg-blue-50/60 py-16 sm:py-20">
          <div className={container}>
            <h2 className={heading}>{copy.closingTitle}</h2>
            <p className={paragraph}>{copy.closing}</p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <LandingButton asChild><Link href="/register">{copy.start}<ArrowRight className="size-4" aria-hidden="true" /></Link></LandingButton>
              <Link href="/#pricing" className={textLink}>{copy.pricing}<ArrowRight className="size-4" aria-hidden="true" /></Link>
            </div>
          </div>
        </section>
      </main>
      <div lang="id"><PublicFooter /></div>
    </div>
  );
}
