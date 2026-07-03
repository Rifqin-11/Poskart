import { organizationService } from "@/server/admin/organization-service";

export const organizationApi = {
  getMyOrganizationDetails: organizationService.getMyOrganizationDetails,
  updateMyOrganizationName: organizationService.updateMyOrganizationName,
  getMyOrganizationMembers: organizationService.getMyOrganizationMembers,
  getMyOrganizationInvitations: organizationService.getMyOrganizationInvitations,
  inviteUser: organizationService.inviteUser,
  deleteInvitation: organizationService.deleteInvitation,
  removeMember: organizationService.removeMember,
  leaveOrganization: organizationService.leaveOrganization,
  transferOwnership: organizationService.transferOwnership,
  updateMemberRole: organizationService.updateMemberRole,
  acceptJoinRequest: organizationService.acceptJoinRequest,
  rejectJoinRequest: organizationService.rejectJoinRequest,
  cancelJoinRequest: organizationService.cancelJoinRequest,
  getPendingJoinRequests: organizationService.getPendingJoinRequests,
};
