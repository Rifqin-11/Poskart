export default function ShowcaseLoading() {
  return (
    <main className="min-h-[100dvh] bg-[#f7f9ff] px-5 pb-16 pt-28 sm:px-8 lg:px-12">
      <div className="mx-auto grid max-w-[90rem] gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <div className="space-y-5">
          <div className="h-4 w-44 animate-pulse rounded-full bg-blue-100" />
          <div className="h-32 max-w-xl animate-pulse rounded-[24px] bg-blue-100/70" />
          <div className="h-14 max-w-lg animate-pulse rounded-2xl bg-blue-50" />
        </div>
        <div className="h-[540px] animate-pulse rounded-[32px] border border-blue-100 bg-white" />
      </div>
    </main>
  );
}
