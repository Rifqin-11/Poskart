import { adminRepository } from "@/server/admin/_shared/admin-repository";

export const layoutService = {
  getLayoutSchema: adminRepository.layoutSchema,
  getLayoutSchemas: adminRepository.layoutSchemas,
  publishLayoutSchema: adminRepository.publishLayoutSchema,
  publishThemeSchema: adminRepository.publishThemeSchema,
  saveLayoutAsTheme: adminRepository.saveLayoutAsTheme,
  setActiveLayout: adminRepository.setActiveLayout,
  deactivateLayout: adminRepository.deactivateLayout,
  deleteLayout: adminRepository.deleteLayout,
  getThemes: adminRepository.themes,
};
