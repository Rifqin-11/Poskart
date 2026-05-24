import { Suspense } from "react";
import { PublicFooter, PublicHeader } from "@/components/layout/public-site-shell";
import { CheckoutContent } from "@/components/checkout/checkout-content";
import { Skeleton } from "@/components/ui/skeleton";

export default function CheckoutPage() {
  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <PublicHeader />
      <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"><Skeleton className="h-[520px]" /></div>}>
        <CheckoutContent />
      </Suspense>
      <PublicFooter />
    </main>
  );
}
