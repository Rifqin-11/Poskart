import { deviceService } from "@/server/admin/device-service";
import { transactionService } from "@/server/admin/transaction-service";
import type {
  BoothInput,
  LayoutSchemaRow,
  PricingProduct,
  Template,
} from "@/server/admin/_shared/admin-types";

export const devicesApi = {
  getDevices: deviceService.getDevices,
  createDevice: deviceService.createDevice,
  createPairedDevice: deviceService.createPairedDevice,
  updateDevice: deviceService.updateDevice,
  deleteDevice: deviceService.deleteDevice,
  approveVoucherRequest: deviceService.approveVoucherRequest,
  rejectVoucherRequest: deviceService.rejectVoucherRequest,
  validateDevicePairingCode: deviceService.validateDevicePairingCode,
  getDeviceErrors: deviceService.getDeviceErrors,
  setDeviceErrorResolved: deviceService.setDeviceErrorResolved,
  getFailedPrintsByBooth: transactionService.getFailedPrintsByBooth,
  retryPrint: transactionService.retryPrint,
};

export type { BoothInput, LayoutSchemaRow, PricingProduct, Template };
