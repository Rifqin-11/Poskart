import { assetService } from "@/server/admin/asset-service";
import type { AssetInput, AssetItem } from "@/server/admin/_shared/admin-types";

export const assetsApi = {
  getAssets: assetService.getAssets,
  createAsset: assetService.createAsset,
  updateAsset: assetService.updateAsset,
  deleteAsset: assetService.deleteAsset,
};

export type { AssetInput, AssetItem };
