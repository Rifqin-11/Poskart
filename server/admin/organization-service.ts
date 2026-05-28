import { adminRepository } from "@/server/admin/_shared/admin-repository";

export const organizationService = {
  getOrganizations: adminRepository.organizations,
  createOrganization: adminRepository.createTenant,
  updateOrganization: adminRepository.updateTenant,
  deleteOrganization: adminRepository.deleteTenant,
  getMyOrganizationDetails: adminRepository.getMyTenantDetails,
  updateMyOrganizationName: adminRepository.updateMyTenantName,
  getMyOrganizationMembers: adminRepository.getMyTenantMembers,
  getMyOrganizationInvitations: adminRepository.getMyTenantInvitations,
  inviteUser: adminRepository.inviteUserToTenant,
  deleteInvitation: adminRepository.deleteTenantInvitation,
  removeMember: adminRepository.removeMemberFromTenant,
};
