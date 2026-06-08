"use client";

import { useState } from "react";
import Link from "next/link";
import { Dialog } from "@/components/ui/dialog";
import {
  getLegalDocument,
  legalDocuments,
  type LegalDocument,
} from "@/features/root/legal/legal-content";

const legalRoutes: Record<LegalDocument["key"], string> = {
  privacy: "/privacy",
  refund: "/refund-policy",
  terms: "/terms",
};

export function LegalFooterLinks() {
  const [activeKey, setActiveKey] = useState<LegalDocument["key"] | null>(null);
  const activeDocument = activeKey ? getLegalDocument(activeKey) : null;

  return (
    <>
      <div className="flex flex-col items-start gap-2 text-sm text-zinc-500">
        {legalDocuments.map((document) => (
          <button
            key={document.key}
            type="button"
            onClick={() => setActiveKey(document.key)}
            className="text-left transition-colors hover:text-zinc-950"
          >
            {document.title}
          </button>
        ))}
      </div>

      <Dialog
        open={Boolean(activeDocument)}
        onOpenChange={(open) => {
          if (!open) setActiveKey(null);
        }}
        title={activeDocument?.title ?? "Legal"}
        className="max-h-[86vh] max-w-3xl overflow-hidden"
      >
        {activeDocument ? (
          <div className="max-h-[68vh] overflow-y-auto pr-2">
            <p className="text-sm leading-7 text-zinc-600">
              {activeDocument.description}
            </p>
            <p className="mt-3 text-xs text-zinc-400">
              Last updated: May 24, 2026
            </p>

            <div className="mt-6 space-y-4">
              {activeDocument.sections.map((section) => (
                <article
                  key={section.title}
                  className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4"
                >
                  <h3 className="text-sm font-semibold text-zinc-950">
                    {section.title}
                  </h3>
                  <div className="mt-3 space-y-2 text-sm leading-7 text-zinc-600">
                    {section.body.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500">
              Ingin membuka halaman penuh?{" "}
              <Link
                href={legalRoutes[activeDocument.key]}
                className="font-medium text-zinc-950 underline-offset-4 hover:underline"
                onClick={() => setActiveKey(null)}
              >
                Buka {activeDocument.title}
              </Link>
            </div>
          </div>
        ) : null}
      </Dialog>
    </>
  );
}
