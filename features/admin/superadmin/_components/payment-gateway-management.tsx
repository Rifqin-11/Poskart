"use client";

import { useEffect, useState } from "react";
import { CreditCard, Check, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SubscriptionGatewayMode = "duitku" | "midtrans" | "both";

export function PaymentGatewayManagement() {
  const [gateway, setGateway] = useState<SubscriptionGatewayMode>("duitku");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadGateway() {
      try {
        const response = await fetch("/api/admin/payment-gateway", {
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as {
          gateway?: SubscriptionGatewayMode;
          message?: string;
        } | null;

        if (!response.ok) {
          throw new Error(payload?.message ?? "Unable to load payment gateway");
        }

        if (!cancelled) {
          setGateway(payload?.gateway ?? "duitku");
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Unable to load payment gateway",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadGateway();

    return () => {
      cancelled = true;
    };
  }, []);

  const saveGateway = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/payment-gateway", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gateway }),
      });
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to save payment gateway");
      }

      toast.success("Subscription payment gateway updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const gatewayCards: Array<{
    value: SubscriptionGatewayMode;
    title: string;
    description: string;
    badge: string;
  }> = [
    {
      value: "duitku",
      title: "Duitku only",
      description: "Checkout hanya menampilkan dan memakai Duitku.",
      badge: "Active gateway",
    },
    {
      value: "midtrans",
      title: "Midtrans only",
      description: "Checkout hanya menampilkan dan memakai Midtrans Snap.",
      badge: "Alternative gateway",
    },
    {
      value: "both",
      title: "Duitku + Midtrans",
      description:
        "Checkout menampilkan kedua gateway sebagai pilihan pelanggan.",
      badge: "Alternative gateway",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription Payment Gateway</CardTitle>
        <CardDescription>
          Super Admin controls which payment gateway appears on the subscription
          checkout page.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 lg:grid-cols-3">
          {gatewayCards.map((item) => {
            const selected = gateway === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setGateway(item.value)}
                disabled={loading || saving}
                className={cn(
                  "rounded-lg border p-4 text-left transition",
                  selected
                    ? "border-zinc-950 bg-zinc-950 text-white shadow-sm"
                    : "border-zinc-200 bg-white text-zinc-950 hover:border-zinc-300",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="grid size-10 place-items-center rounded-md border border-current/15 bg-current/5">
                    <CreditCard className="size-5" />
                  </div>
                  {selected ? <Check className="size-5" /> : null}
                </div>
                <div className="mt-4 text-sm font-semibold">{item.title}</div>
                <div
                  className={cn(
                    "mt-2 text-xs leading-5",
                    selected ? "text-zinc-300" : "text-zinc-500",
                  )}
                >
                  {item.description}
                </div>
                <div
                  className={cn(
                    "mt-4 inline-flex rounded-full px-2 py-1 text-[11px] font-medium",
                    selected
                      ? "bg-white/10 text-white"
                      : "bg-zinc-100 text-zinc-600",
                  )}
                >
                  {item.badge}
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-600">
          Current checkout mode:{" "}
          <span className="font-medium text-zinc-950">
            {gateway === "both"
              ? "Duitku + Midtrans"
              : gateway === "midtrans"
                ? "Midtrans only"
                : "Duitku only"}
          </span>
          . Server-side checkout validation also follows this setting, so hidden
          gateways cannot be forced from the browser form.
        </div>

        <Button onClick={() => void saveGateway()} disabled={loading || saving}>
          <ShieldCheck className="size-4" />
          {saving ? "Saving..." : "Save gateway setting"}
        </Button>
      </CardContent>
    </Card>
  );
}
