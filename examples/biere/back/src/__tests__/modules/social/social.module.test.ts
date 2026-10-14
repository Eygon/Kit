import { MODULE_METADATA } from "@nestjs/common/constants";
import { Test } from "@nestjs/testing";
import { DataSource } from "typeorm";
import { describe, expect, it } from "vitest";
import { ProfilesController } from "@/modules/social/profiles.controller";
import { SocialModule } from "@/modules/social/social.module";
import { SocialRepository } from "@/modules/social/social.repository";
import { SocialService } from "@/modules/social/social.service";
import { TastingsModule } from "@/modules/tastings/tastings.module";
import { UsersModule } from "@/modules/users/users.module";
import { inMemoryDatabase } from "@/__tests__/support/test-database";

describe("SocialModule", () => {
  it("wires controller, service and repository", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [inMemoryDatabase(), SocialModule] }).compile();

    expect(moduleRef.get(ProfilesController)).toBeInstanceOf(ProfilesController);
    expect(moduleRef.get(SocialService)).toBeInstanceOf(SocialService);
    expect(moduleRef.get(SocialRepository)).toBeInstanceOf(SocialRepository);

    await moduleRef.close();
  });

  it("imports the users and tastings modules", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.IMPORTS, SocialModule)).toEqual(
      expect.arrayContaining([UsersModule, TastingsModule]),
    );
  });

  it("exports only the service to other modules", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.EXPORTS, SocialModule)).toEqual([SocialService]);
  });

  it("creates the empty follows table", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [inMemoryDatabase(), SocialModule] }).compile();
    const dataSource = moduleRef.get(DataSource);

    const tables = await dataSource.query<{ name: string }[]>("SELECT name FROM sqlite_master WHERE type = 'table'");
    const follows = await dataSource.query<{ total: number }[]>("SELECT COUNT(*) AS total FROM follows");

    expect(tables.map((table) => table.name)).toContain("follows");
    expect(follows[0].total).toBe(0);

    await moduleRef.close();
  });
});
