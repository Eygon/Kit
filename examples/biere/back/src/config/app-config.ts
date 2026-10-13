import {
  CORS_ORIGINS_SEPARATOR,
  DEFAULT_CORS_ORIGINS,
  DEFAULT_DATABASE_PATH,
  DEFAULT_PORT,
  MAX_PORT,
} from "@/config/app-config.constants";

export interface AppConfig {
  readonly port: number;
  readonly databasePath: string;
  readonly corsOrigins: readonly string[];
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

export const loadAppConfig = (env: NodeJS.ProcessEnv): AppConfig => ({
  port: readPort(env.PORT),
  databasePath: readDatabasePath(env.DATABASE_PATH),
  corsOrigins: readCorsOrigins(env.CORS_ORIGINS),
});
