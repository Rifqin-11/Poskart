import {
  getTemplates,
  getFrameUsageInsights,
  createTemplate,
  assignTemplateToDevices,
  updateTemplate,
  deleteTemplate,
  moveTemplateToFrameCategory,
  reorderTemplates,
} from "@/server/admin/actions/template-actions";
import {
  createFrameCategory,
  deleteFrameCategory,
  getFrameCategories,
  reorderFrameCategories,
  updateFrameCategory,
} from "@/server/admin/actions/frame-category-actions";

export const templateService = {
  getTemplates,
  getFrameUsageInsights,
  createTemplate,
  assignTemplateToDevices,
  updateTemplate,
  deleteTemplate,
  moveTemplateToFrameCategory,
  reorderTemplates,
  getFrameCategories,
  reorderFrameCategories,
  createFrameCategory,
  updateFrameCategory,
  deleteFrameCategory,
};
