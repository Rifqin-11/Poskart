import { organizationService } from "@/server/admin/organization-service";
import { profileService } from "@/server/admin/profile-service";
import {
  getSuperAdminDeviceErrors,
  setSuperAdminDeviceErrorResolved,
} from "@/server/admin/actions/superadmin-device-error-actions";
import {
  getSuperAdminSystemErrors,
  setSuperAdminSystemErrorResolved,
} from "@/server/admin/actions/superadmin-system-error-actions";
import { getSuperAdminSystemLogs } from "@/server/admin/actions/superadmin-system-log-actions";
import {
  broadcastAdminNotification,
  getSuperAdminNotifications,
  deleteSuperAdminNotification,
} from "@/server/admin/notifications";
import {
  listTrialRequests,
  getTrialRequestDetail,
  reviewTrialRequest,
  revokeTrialClaim,
  createTrialOverride,
  revokeTrialByRequestId,
} from "@/server/admin/actions/trial-actions";
import type { TenantInput } from "@/server/admin/_shared/admin-types";
import {
  getSuperAdminProductFeedback,
  reviewProductFeedback,
} from "@/server/admin/actions/feedback-actions";
import {
  checkSubscriptionPayment,
  exportSubscriptionPayments,
  getSubscriptionPaymentDetail,
  listSubscriptionPayments,
  overrideSubscriptionPayment,
  type AdminSubscriptionPaymentFilters,
  type AdminSubscriptionPayment,
  type AdminSubscriptionPaymentDetail,
  type AdminSubscriptionPaymentList,
  type AdminSubscriptionPaymentStatus,
  type AdminSubscriptionPaymentOverrideInput,
} from "@/server/admin/actions/superadmin-subscription-payment-actions";

export const superadminApi = {
  getOrganizations: organizationService.getOrganizations,
  createOrganization: organizationService.createOrganization,
  updateOrganization: organizationService.updateOrganization,
  deleteOrganization: organizationService.deleteOrganization,
  getProfiles: profileService.getProfiles,
  updateProfile: profileService.updateProfile,
  deleteProfile: profileService.deleteProfile,
  getDeviceErrors: getSuperAdminDeviceErrors,
  setDeviceErrorResolved: setSuperAdminDeviceErrorResolved,
  getSystemErrors: getSuperAdminSystemErrors,
  setSystemErrorResolved: setSuperAdminSystemErrorResolved,
  getSystemLogs: getSuperAdminSystemLogs,
  broadcastAdminNotification,
  getSuperAdminNotifications,
  deleteSuperAdminNotification,
  listTrialRequests,
  getTrialRequestDetail,
  reviewTrialRequest,
  revokeTrialClaim,
  createTrialOverride,
  revokeTrialByRequestId,
  getSuperAdminProductFeedback,
  reviewProductFeedback,
  listSubscriptionPayments,
  getSubscriptionPaymentDetail,
  checkSubscriptionPayment,
  overrideSubscriptionPayment,
  exportSubscriptionPayments,
};

export type { TenantInput };
export type {
  AdminSubscriptionPaymentFilters,
  AdminSubscriptionPayment,
  AdminSubscriptionPaymentDetail,
  AdminSubscriptionPaymentList,
  AdminSubscriptionPaymentStatus,
  AdminSubscriptionPaymentOverrideInput,
};
