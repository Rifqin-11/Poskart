"use client";

import { useState } from "react";

export function DeviceSettingsPinResetForm({ token }: { token: string }) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!token) {
      setError("Tautan reset PIN tidak valid.");
      return;
    }
    if (!/^\d{4,12}$/.test(pin)) {
      setError("PIN harus terdiri dari 4 sampai 12 angka.");
      return;
    }
    if (pin !== confirmPin) {
      setError("Konfirmasi PIN belum sama.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/device-settings-pin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, pin }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "PIN tidak dapat direset.");
      setComplete(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "PIN tidak dapat direset.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fb] px-5 py-10 text-zinc-950">
      <section className="w-full max-w-md rounded-[28px] border border-zinc-200 bg-white p-7 shadow-[0_24px_70px_rgba(15,23,42,0.10)] sm:p-9">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#00357B]">POSKART device security</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Atur PIN baru</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">
          PIN ini akan digunakan untuk membuka Settings pada tablet booth. Tautan reset hanya bisa digunakan sekali.
        </p>

        {complete ? (
          <div className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
            PIN berhasil diperbarui. Tablet akan menggunakan PIN baru pada sinkronisasi berikutnya. Jika tablet sedang online, biasanya kurang dari satu menit.
          </div>
        ) : (
          <form className="mt-7 space-y-4" onSubmit={submit}>
            <label className="block text-sm font-medium text-zinc-700">
              PIN baru
              <input
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={12}
                type="password"
                className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-base outline-none transition focus:border-[#00357B] focus:ring-4 focus:ring-[#00357B]/10"
                placeholder="4–12 angka"
              />
            </label>
            <label className="block text-sm font-medium text-zinc-700">
              Konfirmasi PIN baru
              <input
                value={confirmPin}
                onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={12}
                type="password"
                className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-base outline-none transition focus:border-[#00357B] focus:ring-4 focus:ring-[#00357B]/10"
                placeholder="Ulangi PIN baru"
              />
            </label>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <button
              type="submit"
              disabled={submitting}
              className="mt-2 h-11 w-full rounded-xl bg-[#00357B] px-4 text-sm font-semibold text-white transition hover:bg-[#00295f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Menyimpan…" : "Simpan PIN baru"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
