import { voucherService } from "@/server/admin/voucher-service";

export const vouchersApi = voucherService;

export type {
  GenerateVoucherInput,
  VoucherExtensionDays,
  VoucherCampaignSummary,
  VoucherGenerationType,
} from "@/server/admin/actions/voucher-actions";
