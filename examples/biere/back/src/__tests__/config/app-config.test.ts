import { describe, expect, it } from "vitest";
import { loadAppConfig } from "@/config/app-config";

describe("loadAppConfig", () => {
  it("falls back to the defaults when nothing is set", () => {
    expect(loadAppConfig({})).toEqual({
      port: 5090,
      databasePath: "data/mousse.db",
      corsOrigins: ["http://localhost:5173", "http://localhost:5174"],
      seedDemoActivity: true,
    });
  });

  it("falls back to the defaults when values are blank", () => {
    expect(loadAppConfig({ PORT: " ", DATABASE_PATH: "", CORS_ORIGINS: " , ", SEED_DEMO_ACTIVITY: " " })).toEqual(loadAppConfig({}));
  });

  it("reads every value from the environment", () => {
    const config = loadAppConfig({
      PORT: "6000",
      DATABASE_PATH: " /tmp/mousse.db ",
      CORS_ORIGINS: "http://a.test, http://b.test",
      SEED_DEMO_ACTIVITY: "false",
    });

    expect(config).toEqual({
      port: 6000,
      databasePath: "/tmp/mousse.db",
      corsOrigins: ["http://a.test", "http://b.test"],
      seedDemoActivity: false,
    });
  });

  it.each(["abc", "0", "-1", "70000", "50.5"])("rejects the invalid PORT %j", (port) => {
    expect(() => loadAppConfig({ PORT: port })).toThrow(`Invalid PORT: ${port}`);
  });

  it.each([
    ["true", true],
    ["1", true],
    ["false", false],
    ["0", false],
  ])("reads SEED_DEMO_ACTIVITY %j as %s", (raw, expected) => {
    expect(loadAppConfig({ SEED_DEMO_ACTIVITY: raw }).seedDemoActivity).toBe(expected);
  });

  it.each(["yes", "TRUE", "2", "off"])("rejects the invalid SEED_DEMO_ACTIVITY %j", (value) => {
    expect(() => loadAppConfig({ SEED_DEMO_ACTIVITY: value })).toThrow(`Invalid SEED_DEMO_ACTIVITY: ${value}`);
  });
});
