import { describe, expect, it } from "vitest";
import { loadAppConfig } from "@/config/app-config";

describe("loadAppConfig", () => {
  it("falls back to the defaults when nothing is set", () => {
    expect(loadAppConfig({})).toEqual({
      port: 5090,
      databasePath: "data/mousse.db",
      corsOrigins: ["http://localhost:5173", "http://localhost:5174"],
    });
  });

  it("falls back to the defaults when values are blank", () => {
    expect(loadAppConfig({ PORT: " ", DATABASE_PATH: "", CORS_ORIGINS: " , " })).toEqual(loadAppConfig({}));
  });

  it("reads every value from the environment", () => {
    const config = loadAppConfig({
      PORT: "6000",
      DATABASE_PATH: " /tmp/mousse.db ",
      CORS_ORIGINS: "http://a.test, http://b.test",
    });

    expect(config).toEqual({
      port: 6000,
      databasePath: "/tmp/mousse.db",
      corsOrigins: ["http://a.test", "http://b.test"],
    });
  });

  it.each(["abc", "0", "-1", "70000", "50.5"])("rejects the invalid PORT %j", (port) => {
    expect(() => loadAppConfig({ PORT: port })).toThrow(`Invalid PORT: ${port}`);
  });
});
