"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LandingButton } from "@/components/ui/landing-button";
import { commonQuestions } from "@/features/root/home/landing-faq-content";

export function LandingFAQ() {
  return (
    <section id="faq" className="scroll-mt-[72px] overflow-hidden bg-white">
      <div className="mx-auto grid max-w-[90rem] gap-10 px-5 pb-8 pt-20 sm:px-8 lg:grid-cols-[0.7fr_1.3fr] lg:px-12 lg:pb-10 lg:pt-24">
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
            <details key={question} open={index === 0}
              onMouseEnter={event => {
                if (window.matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine)").matches) event.currentTarget.open = true;
              }}
              onMouseLeave={event => {
                if (window.matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine)").matches) event.currentTarget.open = false;
              }}>
              <summary
                onClick={event => {
                  if (event.detail > 0 && window.matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine)").matches) {
                    event.preventDefault();
                    const details = event.currentTarget.parentElement;
                    if (details instanceof HTMLDetailsElement) details.open = true;
                  }
                }}
                className="list-none cursor-pointer py-5 text-base font-semibold text-zinc-900 transition-colors hover:text-[#014EB4]">
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
