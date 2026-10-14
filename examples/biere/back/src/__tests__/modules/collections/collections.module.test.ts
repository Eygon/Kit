import { MODULE_METADATA } from "@nestjs/common/constants";
import { Test } from "@nestjs/testing";
import { DataSource } from "typeorm";
import { describe, expect, it } from "vitest";
import { AppModule } from "@/app.module";
import { BeersModule } from "@/modules/beers/beers.module";
import { CollectionsModule } from "@/modules/collections/collections.module";
import { CollectionsRepository } from "@/modules/collections/collections.repository";
import { CollectionsService } from "@/modules/collections/collections.service";
import { MyCollectionsController } from "@/modules/collections/my-collections.controller";
import { UserCollectionsController } from "@/modules/collections/user-collections.controller";
import { SocialModule } from "@/modules/social/social.module";
import { TastingsModule } from "@/modules/tastings/tastings.module";
import { UsersModule } from "@/modules/users/users.module";
import { inMemoryDatabase } from "@/__tests__/support/test-database";

describe("CollectionsModule", () => {
  it("wires controller, service and repository", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [inMemoryDatabase(), CollectionsModule] }).compile();

    expect(moduleRef.get(MyCollectionsController)).toBeInstanceOf(MyCollectionsController);
    expect(moduleRef.get(UserCollectionsController)).toBeInstanceOf(UserCollectionsController);
    expect(moduleRef.get(CollectionsService)).toBeInstanceOf(CollectionsService);
    expect(moduleRef.get(CollectionsRepository)).toBeInstanceOf(CollectionsRepository);

    await moduleRef.close();
  });

  it("imports the users, tastings, social and beers modules", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.IMPORTS, CollectionsModule)).toEqual(
      expect.arrayContaining([UsersModule, TastingsModule, SocialModule, BeersModule]),
    );
  });

  it("is registered in the application module", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule)).toContain(CollectionsModule);
  });

  it("creates the empty collection items table", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [inMemoryDatabase(), CollectionsModule] }).compile();
    const dataSource = moduleRef.get(DataSource);

    const tables = await dataSource.query<{ name: string }[]>("SELECT name FROM sqlite_master WHERE type = 'table'");
    const items = await dataSource.query<{ total: number }[]>("SELECT COUNT(*) AS total FROM collection_items");

    expect(tables.map((table) => table.name)).toContain("collection_items");
    expect(items[0].total).toBe(0);

    await moduleRef.close();
  });

  it("creates the empty collections table", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [inMemoryDatabase(), CollectionsModule] }).compile();
    const dataSource = moduleRef.get(DataSource);

    const tables = await dataSource.query<{ name: string }[]>("SELECT name FROM sqlite_master WHERE type = 'table'");
    const collections = await dataSource.query<{ total: number }[]>("SELECT COUNT(*) AS total FROM collections");

    expect(tables.map((table) => table.name)).toContain("collections");
    expect(collections[0].total).toBe(0);

    await moduleRef.close();
  });
});
