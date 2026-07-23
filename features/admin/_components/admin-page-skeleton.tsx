import { Skeleton } from "@/components/ui/skeleton";

type AdminPageSkeletonVariant =
  | "cards"
  | "dashboard"
  | "gallery"
  | "settings"
  | "table";

function PageHeadingSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-9 w-56 rounded-xl" />
      <Skeleton className="h-4 w-[min(36rem,85%)] rounded-lg" />
    </div>
  );
}

function StatisticsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className="rounded-[1.75rem] border border-zinc-100 bg-white/90 p-5 shadow-sm shadow-zinc-200/60"
        >
          <Skeleton className="h-4 w-24 rounded-lg" />
          <Skeleton className="mt-4 h-9 w-32 rounded-xl" />
          <Skeleton className="mt-6 h-8 w-full rounded-2xl" />
        </div>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-[1.75rem] border border-zinc-100 bg-white/90 p-5 shadow-sm shadow-zinc-200/60">
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-11 min-w-56 flex-1 rounded-2xl" />
        <Skeleton className="h-11 w-40 rounded-2xl" />
        <Skeleton className="h-11 w-36 rounded-2xl" />
      </div>
      <div className="mt-6 space-y-4">
        <Skeleton className="h-5 w-full rounded-lg" />
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

function CardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="rounded-[1.75rem] border border-zinc-100 bg-white/90 p-5 shadow-sm shadow-zinc-200/60"
        >
          <Skeleton className="aspect-[16/9] w-full rounded-2xl" />
          <Skeleton className="mt-4 h-5 w-2/3 rounded-lg" />
          <Skeleton className="mt-2 h-4 w-1/2 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="rounded-[1.75rem] border border-zinc-100 bg-white/90 p-5 shadow-sm shadow-zinc-200/60 sm:p-6">
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-10 w-28 shrink-0 rounded-xl" />
        ))}
      </div>
      <div className="mt-7 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Skeleton className="h-64 rounded-3xl" />
        <div className="space-y-4 rounded-3xl border border-zinc-100 p-5">
          <Skeleton className="h-6 w-40 rounded-lg" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function GallerySkeleton() {
  return (
    <>
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-11 min-w-56 flex-1 rounded-2xl" />
        <Skeleton className="h-11 w-36 rounded-2xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-[1.5rem] border border-zinc-100 bg-white shadow-sm"
          >
            <Skeleton className="aspect-square w-full rounded-none" />
            <div className="space-y-2 p-4">
              <Skeleton className="h-4 w-3/4 rounded-lg" />
              <Skeleton className="h-3 w-1/2 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function AdminPageSkeleton({
  variant = "table",
}: {
  variant?: AdminPageSkeletonVariant;
}) {
  return (
    <div
      className="space-y-7 py-2"
      aria-busy="true"
      aria-label="Memuat halaman"
      role="status"
    >
      <PageHeadingSkeleton />
      {variant === "dashboard" ? (
        <>
          <StatisticsSkeleton />
          <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
            <Skeleton className="h-80 rounded-[1.75rem]" />
            <Skeleton className="h-80 rounded-[1.75rem]" />
          </div>
        </>
      ) : variant === "gallery" ? (
        <GallerySkeleton />
      ) : variant === "settings" ? (
        <SettingsSkeleton />
      ) : variant === "cards" ? (
        <CardsSkeleton />
      ) : (
        <TableSkeleton />
      )}
    </div>
  );
}
