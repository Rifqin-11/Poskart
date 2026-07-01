import { configService } from "@/server/config/config-service";

export const settingsApi = {
  getAppConfig: configService.get,
  saveAppConfig: configService.save,
};
