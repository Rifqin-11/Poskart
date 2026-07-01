import { organizationService } from "@/server/admin/organization-service";
import { profileService } from "@/server/admin/profile-service";
import type { TenantInput } from "@/server/admin/_shared/admin-types";

export const superadminApi = {
  getOrganizations: organizationService.getOrganizations,
  createOrganization: organizationService.createOrganization,
  updateOrganization: organizationService.updateOrganization,
  deleteOrganization: organizationService.deleteOrganization,
  getProfiles: profileService.getProfiles,
  updateProfile: profileService.updateProfile,
  deleteProfile: profileService.deleteProfile,
};

export type { TenantInput };
