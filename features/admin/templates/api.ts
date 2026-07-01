import { templateService } from "@/server/admin/template-service";

export const templatesApi = {
  getTemplates: templateService.getTemplates,
  createTemplate: templateService.createTemplate,
  updateTemplate: templateService.updateTemplate,
  deleteTemplate: templateService.deleteTemplate,
  reorderTemplates: templateService.reorderTemplates,
};
