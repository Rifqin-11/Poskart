import { adminRepository } from "@/server/admin/_shared/admin-repository";

export const dashboardService = {
  getDashboard: adminRepository.dashboard,
};
