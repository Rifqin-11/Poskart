import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getTemplateShowcaseSettings,
  moveTemplateToFrameCategory,
  reorderTemplates,
  setTemplateShowcase,
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
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getTemplateShowcaseSettings,
  setTemplateShowcase,
  moveTemplateToFrameCategory,
  reorderTemplates,
  getFrameCategories,
  reorderFrameCategories,
  createFrameCategory,
  updateFrameCategory,
  deleteFrameCategory,
};
