import {
  getDevices,
  createDevice,
  createPairedDevice,
  updateDevice,
  deleteDevice,
  approveVoucherRequest,
  rejectVoucherRequest,
  validateDevicePairingCode,
  getDeviceErrors,
  setDeviceErrorResolved,
} from "@/server/admin/actions/device-actions";

export const deviceService = {
  getDevices,
  createDevice,
  createPairedDevice,
  updateDevice,
  deleteDevice,
  approveVoucherRequest,
  rejectVoucherRequest,
  validateDevicePairingCode,
  getDeviceErrors,
  setDeviceErrorResolved,
};
