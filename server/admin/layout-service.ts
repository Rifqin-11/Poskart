import {
  getLayoutSchema,
  getLayoutSchemas,
  getActiveThemeStatistics,
  publishLayoutSchema,
  publishThemeSchema,
  saveLayoutAsTheme,
  setActiveLayout,
  deactivateLayout,
  deleteLayout,
  getThemes,
} from "@/server/admin/actions/layout-actions";
import {
  getGalleryBranding,
  updateGalleryBranding as updateOrganizationGalleryBranding,
} from "@/server/admin/actions/gallery-branding-actions";

export const layoutService = {
  getLayoutSchema,
  getLayoutSchemas,
  getActiveThemeStatistics,
  publishLayoutSchema,
  publishThemeSchema,
  saveLayoutAsTheme,
  setActiveLayout,
  deactivateLayout,
  deleteLayout,
  getThemes,
  getGalleryBranding,
  updateOrganizationGalleryBranding,
};
