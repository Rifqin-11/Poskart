"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { toast } from "@/lib/toast";
import { isSubscriptionPaymentOpen, type SubscriptionPayment } from "./payment-types";
import { requestSubscriptionPayment, SubscriptionPaymentRequestError } from "./payment-request";

type PaymentQueryResult = {
  orders: SubscriptionPayment[];
  checkErrors: Record<string, string>;
  newlyPaidIds: string[];
};

async function updatePayment(orderId: string, action: "check" | "cancel", signal?: AbortSignal): Promise<SubscriptionPayment> {
  const response = await requestSubscriptionPayment<{ order: SubscriptionPayment }>("/api/subscription/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order: orderId, action }),
    signal,
  });
  if (!response.order || typeof response.order.merchant_order_id !== "string") {
    throw new SubscriptionPaymentRequestError("Detail pembayaran belum dapat dimuat. Silakan coba lagi.", 502);
  }
  return response.order;
}

export function useSubscriptionPayments(orderId?: string, autoCheck = true) {
  const queryClient = useQueryClient();
  const previousStatuses = useRef(new Map<string, string>());
  const notifiedPayments = useRef(new Set<string>());
  const [now, setNow] = useState(() => Date.now());
  const query = useQuery<PaymentQueryResult, SubscriptionPaymentRequestError>({
    queryKey: ["subscription-payments", orderId ?? "organization", autoCheck],
    queryFn: async ({ signal }) => {
      const params = orderId ? `?order=${encodeURIComponent(orderId)}` : "";
      const { orders } = await requestSubscriptionPayment<{ orders: SubscriptionPayment[] }>(`/api/subscription/payments${params}`, { signal });
      if (!Array.isArray(orders)) throw new SubscriptionPaymentRequestError("Riwayat pembayaran belum dapat dimuat. Silakan coba lagi.", 502);
      const result: PaymentQueryResult = { orders, checkErrors: {}, newlyPaidIds: [] };
      if (autoCheck) {
        const pending = orders.filter((order) => isSubscriptionPaymentOpen(order)).slice(0, 5);
        await Promise.all(pending.map(async (order) => {
          try {
            const updated = await updatePayment(order.merchant_order_id, "check", signal);
            result.orders = result.orders.map((item) => item.merchant_order_id === updated.merchant_order_id ? updated : item);
            if (updated.status === "paid") result.newlyPaidIds.push(updated.merchant_order_id);
          } catch (error) {
            if (signal.aborted) throw error;
            result.checkErrors[order.merchant_order_id] = error instanceof Error ? error.message : "Pengecekan sementara tidak tersedia.";
          }
        }));
      }
      return result;
    },
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: (query) => query.state.data?.orders.some((order) => order.status === "pending") ? 15_000 : false,
    refetchIntervalInBackground: false,
  });

  const hasPending = query.data?.orders.some((order) => order.status === "pending") ?? false;
  useEffect(() => {
    if (!hasPending) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [hasPending]);

  useEffect(() => {
    if (!query.data) return;
    for (const order of query.data.orders) {
      const id = order.merchant_order_id;
      const newlyPaid = query.data.newlyPaidIds.includes(id) || previousStatuses.current.get(id) === "pending";
      if (order.status === "paid" && newlyPaid && !notifiedPayments.current.has(id)) {
        notifiedPayments.current.add(id);
        toast.success("Pembayaran berhasil, masa aktif telah diperpanjang.");
        for (const queryKey of [adminQueryKeys.subscriptionStatus, adminQueryKeys.organizationDetails, adminQueryKeys.subscriptionOrders, adminQueryKeys.dashboard]) {
          void queryClient.invalidateQueries({ queryKey });
        }
      }
      previousStatuses.current.set(id, order.status);
    }
  }, [query.data, queryClient]);

  function updateCachedPayment(order: SubscriptionPayment) {
      queryClient.setQueriesData<PaymentQueryResult>({ queryKey: ["subscription-payments"] }, (current) => {
        if (!current) return current;
        const { [order.merchant_order_id]: removedError, ...checkErrors } = current.checkErrors;
        void removedError;
        return {
          ...current,
          orders: current.orders.map((item) => item.merchant_order_id === order.merchant_order_id ? order : item),
          checkErrors,
          newlyPaidIds: order.status === "paid" ? [order.merchant_order_id] : [],
        };
      });
  }

  const check = useMutation({
    mutationFn: (id: string) => updatePayment(id, "check"),
    onSuccess: (order) => {
      updateCachedPayment(order);
      if (order.status === "pending") toast.info("Masih menunggu konfirmasi. Jika sudah membayar, jangan bayar ulang.");
      else if (order.status !== "paid") toast.info("Pembayaran belum berhasil. Lihat detail order untuk status terakhir.");
    },
    onError: (error) => toast.error(error.message),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => updatePayment(id, "cancel"),
    onSuccess: (order) => {
      updateCachedPayment(order);
      if (order.status === "cancelled") {
        toast.info(order.gateway_cancelled_at ? "Pembayaran dibatalkan di POSKART dan gateway." : "Pembayaran dibatalkan di POSKART. Invoice gateway mungkin masih berlaku hingga kedaluwarsa; jangan gunakan invoice lama.");
      } else if (order.status !== "paid") {
        toast.info("Pembayaran sudah ditutup atau kedaluwarsa. Jika saldo terpotong, hubungi admin dengan bukti pembayaran.");
      }
    },
    onError: (error) => toast.error(error.message),
  });

  return { ...query, orders: query.data?.orders ?? [], checkErrors: query.data?.checkErrors ?? {}, check, cancel, now };
}
