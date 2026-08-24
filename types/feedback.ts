export type FeedbackCategory = "criticism" | "suggestion" | "bug" | "other";

export type FeedbackStatus =
  "new" | "reviewing" | "planned" | "completed" | "closed";

export type ProductFeedback = {
  id: string;
  referenceCode: string;
  organizationId: string;
  organizationName: string;
  submittedBy: string;
  submitterEmail: string;
  category: FeedbackCategory;
  subject: string;
  message: string;
  featureArea?: string;
  pageUrl?: string;
  status: FeedbackStatus;
  adminNote?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type SubmitFeedbackInput = Pick<
  ProductFeedback,
  "category" | "subject" | "message"
> & {
  featureArea?: string;
  pageUrl?: string;
};

export type ReviewFeedbackInput = {
  id: string;
  status: FeedbackStatus;
  adminNote?: string;
};
