"use client";

import Link from "next/link";
import { BookOpen, CircleHelp, ChevronDown, LogOut, MessageSquareMore, ReceiptText, UserRound } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/app/auth/actions";
import type { DictionaryKey, Locale } from "@/lib/i18n/dictionaries";

export function AdminAccountMenu({ open, onToggle, onClose, name, role, initials, locale, setLocale, t, onReplayTutorial, onOpenSubscription }: { open: boolean; onToggle: () => void; onClose: () => void; name: string; role: string; initials: string; locale: Locale; setLocale: (locale: Locale) => void; t: (key: DictionaryKey) => string; onReplayTutorial: () => void; onOpenSubscription: () => void }) {
  return <div className="relative">
    <button type="button" data-admin-tour="profile" className="flex items-center gap-1 rounded-full bg-white/35 p-0.5 transition-colors hover:bg-white/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950" onClick={onToggle} aria-expanded={open} aria-haspopup="menu" aria-label="Open account menu"><Avatar name={initials} /><ChevronDown className="size-3.5 text-zinc-500" /></button>
    {open ? <div role="menu" className="absolute right-0 top-12 z-50 w-64 rounded-3xl border border-zinc-200/80 bg-white/95 p-2 shadow-2xl shadow-zinc-950/10 backdrop-blur-xl">
      <div className="border-b border-zinc-100 px-3 py-2.5"><div className="truncate text-sm font-medium text-zinc-950">{name}</div><div className="mt-0.5 text-xs text-zinc-500">{role}</div></div>
      <div className="py-1"><div className="px-3 py-2"><div className="mb-2 text-[11px] font-medium text-zinc-500">{t("common.language")}</div><div className="grid grid-cols-2 gap-1 rounded-2xl bg-zinc-100 p-1"><button type="button" className={cn("rounded-xl px-2 py-1.5 text-xs font-medium text-zinc-600 transition-colors", locale === "en" && "bg-white text-zinc-950 shadow-sm")} onClick={() => setLocale("en")}>{t("common.english")}</button><button type="button" className={cn("rounded-xl px-2 py-1.5 text-xs font-medium text-zinc-600 transition-colors", locale === "id" && "bg-white text-zinc-950 shadow-sm")} onClick={() => setLocale("id")}>{t("common.indonesian")}</button></div></div>
        <Link href="/settings?tab=organization" role="menuitem" className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950" onClick={onClose}><UserRound className="size-4" />{t("account.preference")}</Link>
        <Link href="/feedback" role="menuitem" className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950" onClick={onClose}><MessageSquareMore className="size-4" />{t("nav.feedback")}</Link>
        <button type="button" role="menuitem" className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm text-zinc-700 hover:bg-blue-50 hover:text-[#00357B]" onClick={onReplayTutorial}><CircleHelp className="size-4" />View tutorial</button>
        <a href="https://docs.poskart.my.id" target="_blank" rel="noopener noreferrer" role="menuitem" className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950" onClick={onClose}><BookOpen className="size-4" />View docs</a>
        <button type="button" role="menuitem" className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950" onClick={onOpenSubscription}><ReceiptText className="size-4" />{t("account.changeSubscription")}</button>
      </div><div className="border-t border-zinc-100 pt-1"><form action={signOutAction}><button type="submit" role="menuitem" className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"><LogOut className="size-4" />{t("account.logout")}</button></form></div>
    </div> : null}
  </div>;
}
