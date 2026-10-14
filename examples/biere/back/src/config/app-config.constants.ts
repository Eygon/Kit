export const DEFAULT_PORT = 5090;

export const MAX_PORT = 65535;

export const DEFAULT_DATABASE_PATH = "data/mousse.db";

export const IN_MEMORY_DATABASE_PATH = ":memory:";

export const DEFAULT_CORS_ORIGINS: readonly string[] = ["http://localhost:5173", "http://localhost:5174"];

export const CORS_ORIGINS_SEPARATOR = ",";

export const DEFAULT_SEED_DEMO_ACTIVITY = true;

export const SEED_DEMO_ACTIVITY_TRUE_VALUES: readonly string[] = ["true", "1"];

export const SEED_DEMO_ACTIVITY_FALSE_VALUES: readonly string[] = ["false", "0"];

export const APP_CONFIG = Symbol("APP_CONFIG");
