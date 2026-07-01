import { organizationService } from "@/server/admin/organization-service";

export const organizationApi = {
  getMyOrganizationDetails: organizationService.getMyOrganizationDetails,
  updateMyOrganizationName: organizationService.updateMyOrganizationName,
  getMyOrganizationMembers: organizationService.getMyOrganizationMembers,
  getMyOrganizationInvitations: organizationService.getMyOrganizationInvitations,
  inviteUser: organizationService.inviteUser,
  deleteInvitation: organizationService.deleteInvitation,
  removeMember: organizationService.removeMember,
};
