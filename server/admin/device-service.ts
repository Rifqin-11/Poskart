import {
  getDevices,
  createDevice,
  updateDevice,
  deleteDevice,
  approveVoucherRequest,
  rejectVoucherRequest,
} from "@/server/admin/actions/device-actions";

export const deviceService = {
  getDevices,
  createDevice,
  updateDevice,
  deleteDevice,
  approveVoucherRequest,
  rejectVoucherRequest,
};
