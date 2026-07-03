export type AdminNotificationAudience = "user" | "organization" | "superadmin";

export type AdminNotification = {
  id: string;
  audience: AdminNotificationAudience;
  recipientProfileId: string | null;
  organizationId: string | null;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  metadata: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

export type CreateAdminNotificationInput = {
  audience: AdminNotificationAudience;
  type: string;
  title: string;
  body?: string | null;
  href?: string | null;
  recipientProfileId?: string | null;
  organizationId?: string | null;
  metadata?: Record<string, unknown>;
};
