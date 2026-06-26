import {
  getOrganizations,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  getMyOrganizationDetails,
  updateMyOrganizationName,
  getMyOrganizationMembers,
  getMyOrganizationInvitations,
  inviteUserToTenant,
  deleteTenantInvitation,
  removeMemberFromTenant,
} from "@/server/admin/actions/organization-actions";

export const organizationService = {
  getOrganizations,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  getMyOrganizationDetails,
  updateMyOrganizationName,
  getMyOrganizationMembers,
  getMyOrganizationInvitations,
  inviteUser: inviteUserToTenant,
  deleteInvitation: deleteTenantInvitation,
  removeMember: removeMemberFromTenant,
};
