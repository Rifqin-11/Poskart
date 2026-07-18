import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { BuilderThemesPage } from "@/features/admin/themes/builder-themes-page";
import { adminQueryKeys } from "@/features/admin/query-keys";
import { getQueryClient } from "@/lib/query-client.server";
import { layoutService } from "@/server/admin/layout-service";

export default async function ThemesPage() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: adminQueryKeys.themes,
    queryFn: layoutService.getThemes,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <BuilderThemesPage />
    </HydrationBoundary>
  );
}
