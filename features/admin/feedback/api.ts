import {
  getMyProductFeedback,
  submitProductFeedback,
} from "@/server/admin/actions/feedback-actions";

export const feedbackApi = {
  getMine: getMyProductFeedback,
  submit: submitProductFeedback,
};
