"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { toast } from "@/lib/toast";
import type { SubscriptionPayment } from "./payment-types";

type PaymentQueryResult = {
  orders: SubscriptionPayment[];
  checkErrors: Record<string, string>;
  newlyPaidIds: string[];
};

export class SubscriptionPaymentRequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

async function readPaymentResponse(response: Response) {
  const data = await response.json();
  if (!response.ok) throw new SubscriptionPaymentRequestError(data.message ?? "Pembayaran belum dapat dimuat.", response.status);
  return data;
}

async function checkPayment(orderId: string, signal?: AbortSignal): Promise<SubscriptionPayment> {
  const response = await fetch("/api/subscription/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order: orderId }),
    cache: "no-store",
    signal,
  });
  return (await readPaymentResponse(response)).order;
}

export function useSubscriptionPayments(orderId?: string, autoCheck = true) {
  const queryClient = useQueryClient();
  const previousStatuses = useRef(new Map<string, string>());
  const notifiedPayments = useRef(new Set<string>());
  const query = useQuery<PaymentQueryResult, SubscriptionPaymentRequestError>({
    queryKey: ["subscription-payments", orderId ?? "organization", autoCheck],
    queryFn: async ({ signal }) => {
      const params = orderId ? `?order=${encodeURIComponent(orderId)}` : "";
      const response = await fetch(`/api/subscription/payments${params}`, { cache: "no-store", signal });
      const { orders } = await readPaymentResponse(response) as { orders: SubscriptionPayment[] };
      const result: PaymentQueryResult = { orders, checkErrors: {}, newlyPaidIds: [] };
      if (autoCheck) {
        // Check the most recent pending orders; older orders remain manually checkable.
        const pending = orders.filter((order) => order.status === "pending").slice(0, 5);
        await Promise.all(pending.map(async (order) => {
          try {
            const updated = await checkPayment(order.merchant_order_id, signal);
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

  const check = useMutation({
    mutationFn: (id: string) => checkPayment(id),
    onSuccess: (order) => {
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
      if (order.status === "pending") toast.info("Masih menunggu konfirmasi. Jika sudah membayar, jangan bayar ulang.");
      else if (order.status !== "paid") toast.info("Pembayaran belum berhasil. Lihat detail order untuk status terakhir.");
    },
    onError: (error) => toast.error(error.message),
  });

  return { ...query, orders: query.data?.orders ?? [], checkErrors: query.data?.checkErrors ?? {}, check };
}
