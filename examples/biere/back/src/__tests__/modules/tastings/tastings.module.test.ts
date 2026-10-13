import { MODULE_METADATA } from "@nestjs/common/constants";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { describe, expect, it } from "vitest";
import { TastingsModule } from "@/modules/tastings/tastings.module";
import { TastingsRepository } from "@/modules/tastings/tastings.repository";
import { TastingsService } from "@/modules/tastings/tastings.service";
import { inMemoryDatabase } from "@/__tests__/support/test-database";

describe("TastingsModule", () => {
  it("wires the service and the repository", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [inMemoryDatabase(), TastingsModule] }).compile();

    expect(moduleRef.get(TastingsService)).toBeInstanceOf(TastingsService);
    expect(moduleRef.get(TastingsRepository)).toBeInstanceOf(TastingsRepository);

    await moduleRef.close();
  });

  it("creates the empty checkins, wishlist_items and photos tables", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [inMemoryDatabase(), TastingsModule] }).compile();
    const dataSource = moduleRef.get(DataSource);

    const tables = await dataSource.query<{ name: string }[]>("SELECT name FROM sqlite_master WHERE type = 'table'");
    const checkins = await dataSource.query<{ total: number }[]>("SELECT COUNT(*) AS total FROM checkins");
    const wishlistItems = await dataSource.query<{ total: number }[]>("SELECT COUNT(*) AS total FROM wishlist_items");
    const photos = await dataSource.query<{ total: number }[]>("SELECT COUNT(*) AS total FROM photos");

    expect(tables.map((table) => table.name)).toEqual(expect.arrayContaining(["checkins", "wishlist_items", "photos"]));
    expect(checkins[0].total).toBe(0);
    expect(wishlistItems[0].total).toBe(0);
    expect(photos[0].total).toBe(0);

    await moduleRef.close();
  });

  it("exports only the service and imports no module", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.EXPORTS, TastingsModule)).toEqual([TastingsService]);
    expect(Reflect.getMetadata(MODULE_METADATA.PROVIDERS, TastingsModule)).toEqual([TastingsService, TastingsRepository]);
    expect(Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, TastingsModule)).toBeUndefined();

    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, TastingsModule) as { module: unknown }[];

    expect(imports).toHaveLength(1);
    expect(imports[0].module).toBe(TypeOrmModule);
  });
});
