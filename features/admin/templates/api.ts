import { templateService } from "@/server/admin/template-service";

export const templatesApi = {
  getTemplates: templateService.getTemplates,
  createTemplate: templateService.createTemplate,
  assignTemplateToDevices: templateService.assignTemplateToDevices,
  updateTemplate: templateService.updateTemplate,
  deleteTemplate: templateService.deleteTemplate,
  moveTemplateToFrameCategory: templateService.moveTemplateToFrameCategory,
  reorderTemplates: templateService.reorderTemplates,
  getFrameCategories: templateService.getFrameCategories,
  reorderFrameCategories: templateService.reorderFrameCategories,
  createFrameCategory: templateService.createFrameCategory,
  updateFrameCategory: templateService.updateFrameCategory,
  deleteFrameCategory: templateService.deleteFrameCategory,
};
