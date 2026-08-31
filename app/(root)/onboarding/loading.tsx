export default function OnboardingLoading() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#f5f6f8] p-6 text-zinc-950">
      <section className="w-full max-w-sm rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-zinc-100">
          <div className="size-5 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900" />
        </div>
        <h1 className="mt-5 text-lg font-semibold tracking-tight">Menyiapkan workspace</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Kami sedang memuat pengaturan akun Anda.
        </p>
      </section>
    </main>
  );
}
