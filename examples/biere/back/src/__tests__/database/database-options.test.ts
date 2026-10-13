import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildDatabaseOptions, ensureDatabaseDirectory } from "@/database/database-options";
import { TEST_CONFIG } from "@/__tests__/support/test-config";

describe("database options", () => {
  const createdRoots: string[] = [];

  afterEach(() => {
    for (const root of createdRoots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("targets better-sqlite3 with synchronized, auto-loaded entities", () => {
    expect(buildDatabaseOptions(TEST_CONFIG)).toEqual({
      type: "better-sqlite3",
      database: ":memory:",
      autoLoadEntities: true,
      synchronize: true,
    });
  });

  it("creates the parent directory of a file database", () => {
    const root = mkdtempSync(join(tmpdir(), "mousse-"));
    createdRoots.push(root);
    const databasePath = join(root, "nested", "mousse.db");

    ensureDatabaseDirectory(databasePath);

    expect(existsSync(join(root, "nested"))).toBe(true);
  });

  it("creates nothing for the in-memory database", () => {
    expect(() => ensureDatabaseDirectory(":memory:")).not.toThrow();
  });
});
