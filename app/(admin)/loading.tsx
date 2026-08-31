import { AdminPageSkeleton } from "@/features/admin/_components/admin-page-skeleton";

export default function AdminLoading() {
  return (
    <main className="mx-auto w-full max-w-[1400px] p-4 sm:p-6 lg:p-8">
      <AdminPageSkeleton variant="dashboard" />
    </main>
  );
}
