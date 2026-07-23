import { AdminPageSkeleton } from "@/features/admin/_components/admin-page-skeleton";

/**
 * Prefetched for dynamic admin routes, so navigation acknowledges the click
 * immediately while the route-specific database work finishes.
 */
export default function AdminLoading() {
  return <AdminPageSkeleton />;
}
