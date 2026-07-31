import {
  createShowcase,
  deleteShowcase,
  getShowcases,
  updateShowcase,
} from "@/server/admin/actions/showcase-actions";

export const showcaseService = {
  getShowcases,
  createShowcase,
  updateShowcase,
  deleteShowcase,
};
