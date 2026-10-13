import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { Test } from "@nestjs/testing";
import type { TestingModule } from "@nestjs/testing";
import type { Repository } from "typeorm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DataSeeder } from "@/database/data-seeder";
import { User } from "@/modules/users/entities/user.entity";
import { inMemoryDatabase } from "@/__tests__/support/test-database";

describe("DataSeeder", () => {
  let moduleRef: TestingModule;
  let users: Repository<User>;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [inMemoryDatabase(), TypeOrmModule.forFeature([User])],
      providers: [DataSeeder],
    }).compile();
    users = moduleRef.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it("inserts Alice, Bob and Carol on bootstrap", async () => {
    await moduleRef.get(DataSeeder).onApplicationBootstrap();

    const seeded = await users.find({ order: { id: "ASC" } });
    expect(seeded.map((user) => user.displayName)).toEqual(["Alice", "Bob", "Carol"]);
  });

  it("is idempotent", async () => {
    const seeder = moduleRef.get(DataSeeder);

    await seeder.seed();
    await seeder.seed();

    expect(await users.count()).toBe(3);
  });

  it("leaves an already populated table untouched", async () => {
    await users.insert({ id: 10, displayName: "Dave", avatarColor: "#000000" });

    await moduleRef.get(DataSeeder).seed();

    expect(await users.count()).toBe(1);
  });
});
