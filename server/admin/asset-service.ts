import { adminRepository } from "@/server/admin/_shared/admin-repository";

export const assetService = {
  getAssets: adminRepository.assets,
  createAsset: adminRepository.createAsset,
  updateAsset: adminRepository.updateAsset,
  deleteAsset: adminRepository.deleteAsset,
};
