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

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await registerQueueVisitor({
        eventToken,
        ...form,
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
        <Input
          id="phone"
          inputMode="tel"
          value={form.phone}
          onChange={(event) =>
            setForm((current) => ({ ...current, phone: event.target.value }))
          }
          placeholder="08xxxxxxxxxx"
          maxLength={32}
          required
        />
      </div>

      <Button type="submit" className="h-11 w-full rounded-full" disabled={isPending}>
        {isPending ? "Joining queue..." : "Join queue"}
      </Button>
    </form>
  );
}
