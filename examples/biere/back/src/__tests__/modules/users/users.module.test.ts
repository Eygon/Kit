import { MODULE_METADATA } from "@nestjs/common/constants";
import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";
import { UsersController } from "@/modules/users/users.controller";
import { UsersModule } from "@/modules/users/users.module";
import { UsersRepository } from "@/modules/users/users.repository";
import { UsersService } from "@/modules/users/users.service";
import { inMemoryDatabase } from "@/__tests__/support/test-database";

describe("UsersModule", () => {
  it("wires controller, service and repository", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [inMemoryDatabase(), UsersModule] }).compile();

    expect(moduleRef.get(UsersController)).toBeInstanceOf(UsersController);
    expect(moduleRef.get(UsersService)).toBeInstanceOf(UsersService);
    expect(moduleRef.get(UsersRepository)).toBeInstanceOf(UsersRepository);

    await moduleRef.close();
  });

  it("exports only the service to other modules", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.EXPORTS, UsersModule)).toEqual([UsersService]);
  });
});
