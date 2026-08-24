"use server";

import {
  getAdminContext,
  getAdminMembership,
  requireSuperAdmin,
} from "@/server/admin/context";
import type {
  FeedbackCategory,
  FeedbackStatus,
  ProductFeedback,
  ReviewFeedbackInput,
  SubmitFeedbackInput,
} from "@/types/feedback";

const feedbackCategories = new Set<FeedbackCategory>([
  "criticism",
  "suggestion",
  "bug",
  "other",
]);

const feedbackStatuses = new Set<FeedbackStatus>([
  "new",
  "reviewing",
  "planned",
  "completed",
  "closed",
]);

type FeedbackRow = {
  id: string;
  reference_code: string;
  organization_id: string;
  organization_name: string;
  submitted_by: string;
  submitter_email: string;
  category: FeedbackCategory;
  subject: string;
  message: string;
  feature_area: string | null;
  page_url: string | null;
  status: FeedbackStatus;
  admin_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

const feedbackColumns =
  "id,reference_code,organization_id,organization_name,submitted_by,submitter_email,category,subject,message,feature_area,page_url,status,admin_note,reviewed_at,created_at,updated_at";

export async function submitProductFeedback(
  input: SubmitFeedbackInput,
): Promise<ProductFeedback> {
  const [{ supabase, user }, membership] = await Promise.all([
    getAdminContext(),
    getAdminMembership(),
  ]);
  if (!membership) throw new Error("Organization membership is required.");

  const values = normalizeFeedbackInput(input);
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", membership.organizationId)
    .maybeSingle();
  if (organizationError) {
    throw new Error(
      `Unable to load organization: ${organizationError.message}`,
    );
  }
  if (!organization) throw new Error("Organization was not found.");

  const { data, error } = await supabase
    .from("product_feedback")
    .insert({
      organization_id: membership.organizationId,
      submitted_by: user.id,
      submitter_email: user.email ?? "Unknown email",
      organization_name: organization.name,
      category: values.category,
      subject: values.subject,
      message: values.message,
      feature_area: values.featureArea || null,
      page_url: values.pageUrl || null,
    })
    .select(feedbackColumns)
    .single();
  if (error) throw new Error(`Unable to submit feedback: ${error.message}`);
  return mapFeedback(data as FeedbackRow);
}

export async function getMyProductFeedback(): Promise<ProductFeedback[]> {
  const { supabase, user } = await getAdminContext();
  const { data, error } = await supabase
    .from("product_feedback")
    .select(feedbackColumns)
    .eq("submitted_by", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    if (isMissingFeedbackTable(error.code)) return [];
    throw new Error(`Unable to load feedback: ${error.message}`);
  }
  return ((data ?? []) as FeedbackRow[]).map(mapFeedback);
}

export async function getSuperAdminProductFeedback(): Promise<
  ProductFeedback[]
> {
  const { supabase } = await requireSuperAdmin();
  const { data, error } = await supabase
    .from("product_feedback")
    .select(feedbackColumns)
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) {
    if (isMissingFeedbackTable(error.code)) return [];
    throw new Error(`Unable to load product feedback: ${error.message}`);
  }
  return ((data ?? []) as FeedbackRow[]).map(mapFeedback);
}

export async function reviewProductFeedback(
  input: ReviewFeedbackInput,
): Promise<void> {
  const { supabase, user } = await requireSuperAdmin();
  const id = input.id.trim();
  if (!id) throw new Error("Feedback is required.");
  if (!feedbackStatuses.has(input.status)) {
    throw new Error("Feedback status is invalid.");
  }
  const adminNote = input.adminNote?.trim() || null;
  if (adminNote && adminNote.length > 2000) {
    throw new Error("Admin note cannot exceed 2000 characters.");
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("product_feedback")
    .update({
      status: input.status,
      admin_note: adminNote,
      reviewed_by: user.id,
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`Unable to update feedback: ${error.message}`);
  if (!data) throw new Error("Feedback was not found.");
}

export type SuperAdminFeedback = ProductFeedback;

function normalizeFeedbackInput(input: SubmitFeedbackInput) {
  if (!feedbackCategories.has(input.category)) {
    throw new Error("Pilih kategori masukan yang valid.");
  }
  const subject = input.subject.trim();
  const message = input.message.trim();
  const featureArea = input.featureArea?.trim().slice(0, 80) ?? "";
  const pageUrl = input.pageUrl?.trim().slice(0, 500) ?? "";
  if (subject.length < 5 || subject.length > 120) {
    throw new Error("Judul harus terdiri dari 5 sampai 120 karakter.");
  }
  if (message.length < 20 || message.length > 4000) {
    throw new Error("Detail harus terdiri dari 20 sampai 4000 karakter.");
  }
  return { category: input.category, subject, message, featureArea, pageUrl };
}

function mapFeedback(row: FeedbackRow): ProductFeedback {
  return {
    id: row.id,
    referenceCode: row.reference_code,
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    submittedBy: row.submitted_by,
    submitterEmail: row.submitter_email,
    category: row.category,
    subject: row.subject,
    message: row.message,
    featureArea: row.feature_area ?? undefined,
    pageUrl: row.page_url ?? undefined,
    status: row.status,
    adminNote: row.admin_note ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isMissingFeedbackTable(code?: string) {
  return code === "42P01" || code === "PGRST202" || code === "PGRST205";
}
