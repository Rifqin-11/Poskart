import { showcaseService } from "@/server/admin/showcase-service";

export const showcasesApi = {
  getShowcases: showcaseService.getShowcases,
  createShowcase: showcaseService.createShowcase,
  updateShowcase: showcaseService.updateShowcase,
  deleteShowcase: showcaseService.deleteShowcase,
};
