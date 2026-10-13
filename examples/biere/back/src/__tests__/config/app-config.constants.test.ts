import { describe, expect, it } from "vitest";
import {
  APP_CONFIG,
  CORS_ORIGINS_SEPARATOR,
  DEFAULT_CORS_ORIGINS,
  DEFAULT_DATABASE_PATH,
  DEFAULT_PORT,
  IN_MEMORY_DATABASE_PATH,
  MAX_PORT,
} from "@/config/app-config.constants";

describe("app config constants", () => {
  it("listens on 5090 by default", () => {
    expect(DEFAULT_PORT).toBe(5090);
    expect(MAX_PORT).toBe(65535);
  });

  it("persists the database in data/mousse.db by default", () => {
    expect(DEFAULT_DATABASE_PATH).toBe("data/mousse.db");
    expect(IN_MEMORY_DATABASE_PATH).toBe(":memory:");
  });

  it("allows both Vite dev servers by default", () => {
    expect(DEFAULT_CORS_ORIGINS).toEqual(["http://localhost:5173", "http://localhost:5174"]);
    expect(CORS_ORIGINS_SEPARATOR).toBe(",");
  });

  it("exposes a symbol injection token", () => {
    expect(typeof APP_CONFIG).toBe("symbol");
  });
});
