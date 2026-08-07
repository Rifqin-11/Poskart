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
  broadcastAdminNotification,
  getSuperAdminNotifications,
  deleteSuperAdminNotification,
  listTrialRequests,
  getTrialRequestDetail,
  reviewTrialRequest,
  revokeTrialClaim,
  createTrialOverride,
  revokeTrialByRequestId,
};

export type { TenantInput };
