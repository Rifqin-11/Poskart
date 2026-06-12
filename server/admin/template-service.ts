import { adminRepository } from "@/server/admin/_shared/admin-repository";

export const templateService = {
  getTemplates: adminRepository.templates,
  createTemplate: adminRepository.createTemplate,
  updateTemplate: adminRepository.updateTemplate,
  deleteTemplate: adminRepository.deleteTemplate,
  reorderTemplates: adminRepository.reorderTemplates,
};
