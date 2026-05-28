import { adminRepository } from "@/server/admin/_shared/admin-repository";

export const profileService = {
  getProfiles: adminRepository.getProfiles,
  updateProfile: adminRepository.updateProfile,
  deleteProfile: adminRepository.deleteProfile,
};
