import { voucherService } from "@/server/admin/voucher-service";

export const vouchersApi = voucherService;

export type {
  GenerateVoucherInput,
  VoucherCampaignSummary,
  VoucherGenerationType,
} from "@/server/admin/actions/voucher-actions";
