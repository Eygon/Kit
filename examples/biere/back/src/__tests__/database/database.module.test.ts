import { Test } from "@nestjs/testing";
import { DataSource } from "typeorm";
import { describe, expect, it } from "vitest";
import { AppConfigModule } from "@/config/app-config.module";
import { APP_CONFIG } from "@/config/app-config.constants";
import { DataSeeder } from "@/database/data-seeder";
import { DatabaseModule } from "@/database/database.module";
import { TEST_CONFIG } from "@/__tests__/support/test-config";

describe("DatabaseModule", () => {
  it("opens the configured SQLite database and provides the seeder", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppConfigModule, DatabaseModule] })
      .overrideProvider(APP_CONFIG)
      .useValue(TEST_CONFIG)
      .compile();

    const dataSource = moduleRef.get(DataSource);
    expect(dataSource.isInitialized).toBe(true);
    expect(dataSource.options).toMatchObject({ type: "better-sqlite3", database: ":memory:" });
    expect(moduleRef.get(DataSeeder)).toBeInstanceOf(DataSeeder);

    await moduleRef.close();
  });
});
