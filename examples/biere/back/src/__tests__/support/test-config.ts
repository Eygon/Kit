import type { AppConfig } from "@/config/app-config";
import { DEFAULT_CORS_ORIGINS, DEFAULT_PORT, IN_MEMORY_DATABASE_PATH } from "@/config/app-config.constants";

export const TEST_CONFIG: AppConfig = {
  port: DEFAULT_PORT,
  databasePath: IN_MEMORY_DATABASE_PATH,
  corsOrigins: DEFAULT_CORS_ORIGINS,
};
