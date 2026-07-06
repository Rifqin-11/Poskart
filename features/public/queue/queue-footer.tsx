import Link from "next/link";
import { businessProfile } from "@/lib/constants/business";

export function QueueFooter() {
  return (
    <footer className="overflow-hidden border-t border-zinc-200 bg-white px-4 py-8 text-center">
      <p className="text-xs text-zinc-500">
        © 2026 {businessProfile.legalName}. All rights reserved.
      </p>
      <Link
        href="https://www.poskart.my.id/contact"
        className="mt-2 inline-flex text-sm font-medium text-zinc-950 underline underline-offset-4"
      >
        Contact Support
      </Link>
      <div
        aria-hidden="true"
        className="mt-8 select-none font-sans text-[clamp(4rem,22vw,13rem)] font-black uppercase leading-[0.78] tracking-[-0.085em] text-zinc-100"
      >
        POSKART
      </div>
    </footer>
  );
}
