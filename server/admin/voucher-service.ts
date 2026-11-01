import {
  deleteVoucherCampaign,
  extendVoucherCampaign,
  generateVoucherCampaign,
  getVoucherCampaigns,
} from "@/server/admin/actions/voucher-actions";

export const voucherService = {
  getVoucherCampaigns,
  generateVoucherCampaign,
  deleteVoucherCampaign,
  extendVoucherCampaign,
};
