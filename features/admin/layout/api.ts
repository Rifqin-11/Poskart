import { layoutService } from "@/server/admin/layout-service";

export const layoutApi = {
  getLayoutSchema: layoutService.getLayoutSchema,
  getLayoutSchemas: layoutService.getLayoutSchemas,
  getActiveThemeStatistics: layoutService.getActiveThemeStatistics,
  saveLayoutAsTheme: layoutService.saveLayoutAsTheme,
  setActiveLayout: layoutService.setActiveLayout,
  deactivateLayout: layoutService.deactivateLayout,
  deleteLayout: layoutService.deleteLayout,
  getThemes: layoutService.getThemes,
  publishThemeSchema: layoutService.publishThemeSchema,
};

export type LayoutSchemas = Awaited<ReturnType<typeof layoutApi.getLayoutSchemas>>;
export type LayoutSchemaRow = LayoutSchemas[number];
