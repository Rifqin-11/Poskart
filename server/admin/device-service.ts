import { adminRepository } from "@/server/admin/_shared/admin-repository";

export const deviceService = {
  getDevices: adminRepository.devices,
  createDevice: adminRepository.createBooth,
  updateDevice: adminRepository.updateBooth,
  deleteDevice: adminRepository.deleteBooth,
};
