import {
  CORS_ORIGINS_SEPARATOR,
  DEFAULT_CORS_ORIGINS,
  DEFAULT_DATABASE_PATH,
  DEFAULT_PORT,
  DEFAULT_SEED_DEMO_ACTIVITY,
  MAX_PORT,
  SEED_DEMO_ACTIVITY_FALSE_VALUES,
  SEED_DEMO_ACTIVITY_TRUE_VALUES,
} from "@/config/app-config.constants";

export interface AppConfig {
  readonly port: number;
  readonly databasePath: string;
  readonly corsOrigins: readonly string[];
  readonly seedDemoActivity: boolean;
}

const readPort = (raw: string | undefined): number => {
  if (raw === undefined || raw.trim() === "") {
    return DEFAULT_PORT;
  }
  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0 || port > MAX_PORT) {
    throw new Error(`Invalid PORT: ${raw}`);
  }
  return port;
};

const readDatabasePath = (raw: string | undefined): string =>
  raw === undefined || raw.trim() === "" ? DEFAULT_DATABASE_PATH : raw.trim();

const readCorsOrigins = (raw: string | undefined): readonly string[] => {
  const origins = (raw ?? "")
    .split(CORS_ORIGINS_SEPARATOR)
    .map((origin) => origin.trim())
    .filter((origin) => origin !== "");
  return origins.length === 0 ? DEFAULT_CORS_ORIGINS : origins;
};

const readSeedDemoActivity = (raw: string | undefined): boolean => {
  if (raw === undefined || raw.trim() === "") {
    return DEFAULT_SEED_DEMO_ACTIVITY;
  }
  const value = raw.trim();
  if (SEED_DEMO_ACTIVITY_TRUE_VALUES.includes(value)) {
    return true;
  }
  if (SEED_DEMO_ACTIVITY_FALSE_VALUES.includes(value)) {
    return false;
  }
  throw new Error(`Invalid SEED_DEMO_ACTIVITY: ${raw}`);
};

export const loadAppConfig = (env: NodeJS.ProcessEnv): AppConfig => ({
  port: readPort(env.PORT),
  databasePath: readDatabasePath(env.DATABASE_PATH),
  corsOrigins: readCorsOrigins(env.CORS_ORIGINS),
  seedDemoActivity: readSeedDemoActivity(env.SEED_DEMO_ACTIVITY),
});
