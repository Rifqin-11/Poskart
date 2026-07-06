"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { registerQueueVisitor } from "@/app/(root)/q/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function QueueRegistrationForm({ eventToken }: { eventToken: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
  });

  function normalizePhoneInput(value: string) {
    return value
      .replace(/\D/g, "")
      .replace(/^62/, "")
      .replace(/^0+/, "")
      .slice(0, 13);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await registerQueueVisitor({
        eventToken,
        name: form.name,
        email: form.email,
        phone: `62${form.phone}`,
      });

      if (!result.success || !result.ticketToken) {
        toast.error(result.error ?? "Unable to join queue");
        return;
      }

      router.push(`/q/ticket/${result.ticketToken}`);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium text-zinc-900">
          Full name
        </label>
        <Input
          id="name"
          value={form.name}
          onChange={(event) =>
            setForm((current) => ({ ...current, name: event.target.value }))
          }
          placeholder="Your name"
          maxLength={80}
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-zinc-900">
          Email
        </label>
        <Input
          id="email"
          type="email"
          value={form.email}
          onChange={(event) =>
            setForm((current) => ({ ...current, email: event.target.value }))
          }
          placeholder="you@example.com"
          maxLength={120}
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="phone" className="text-sm font-medium text-zinc-900">
          Phone / WhatsApp
        </label>
        <div className="flex overflow-hidden rounded-full border border-zinc-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-zinc-950/10">
          <div className="flex h-11 items-center border-r border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-zinc-900">
            62
          </div>
          <Input
            id="phone"
            inputMode="numeric"
            pattern="[0-9]*"
            value={form.phone}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                phone: normalizePhoneInput(event.target.value),
              }))
            }
            placeholder="81234567890"
            maxLength={13}
            className="h-11 rounded-none border-0 shadow-none focus-visible:ring-0"
            required
          />
        </div>
        <p className="text-xs leading-5 text-zinc-500">
          Use digits only after 62. Leading 0, spaces, and dashes are removed.
        </p>
      </div>

      <Button type="submit" className="h-11 w-full rounded-full" disabled={isPending}>
        {isPending ? "Joining queue..." : "Join queue"}
      </Button>
    </form>
  );
}
