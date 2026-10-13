export class SubscriptionPaymentRequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

const unreadableResponseMessage = "Respons pembayaran belum dapat dibaca. Muat ulang halaman atau coba lagi nanti.";

export async function requestSubscriptionPayment<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(url, { ...options, cache: "no-store" });
    if (response.redirected) {
      throw new SubscriptionPaymentRequestError("Sesi Anda mungkin berakhir. Masuk kembali untuk melihat pembayaran.", 401);
    }
    let data: unknown;
    try {
      data = JSON.parse(await response.text());
    } catch {
      throw new SubscriptionPaymentRequestError(unreadableResponseMessage, 502);
    }
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new SubscriptionPaymentRequestError(unreadableResponseMessage, 502);
    }
    if (!response.ok) {
      const message = "message" in data && typeof data.message === "string" ? data.message : "Pembayaran belum dapat dimuat. Silakan coba lagi.";
      throw new SubscriptionPaymentRequestError(
        /expected pattern|syntaxerror|unexpected token/i.test(message) ? unreadableResponseMessage : message,
        response.status,
      );
    }
    return data as T;
  } catch (error) {
    if (options?.signal?.aborted) throw error;
    if (error instanceof SubscriptionPaymentRequestError) throw error;
    throw new SubscriptionPaymentRequestError("Tidak dapat terhubung ke layanan pembayaran. Periksa koneksi dan coba lagi. Jika sudah membayar, jangan bayar ulang.", 502);
  }
}
