import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { TypeOrmModuleOptions } from "@nestjs/typeorm";
import type { AppConfig } from "@/config/app-config";
import { IN_MEMORY_DATABASE_PATH } from "@/config/app-config.constants";

export const ensureDatabaseDirectory = (databasePath: string): void => {
  if (databasePath !== IN_MEMORY_DATABASE_PATH) {
    mkdirSync(dirname(databasePath), { recursive: true });
  }
};

export const buildDatabaseOptions = (config: AppConfig): TypeOrmModuleOptions => {
  ensureDatabaseDirectory(config.databasePath);
  return {
    type: "better-sqlite3",
    database: config.databasePath,
    autoLoadEntities: true,
    synchronize: true,
  };
};
