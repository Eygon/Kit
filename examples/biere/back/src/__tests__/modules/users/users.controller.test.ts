import { HttpStatus } from "@nestjs/common";
import { HTTP_CODE_METADATA } from "@nestjs/common/constants";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserDto } from "@/modules/users/dtos/user.dto";
import { UsersController } from "@/modules/users/users.controller";
import { UsersService } from "@/modules/users/users.service";

const BOB: UserDto = { id: 2, displayName: "Bob", avatarColor: "#10B981" };

describe("UsersController", () => {
  const service = { getUsers: vi.fn(), getUser: vi.fn() };
  let controller: UsersController;

  beforeEach(async () => {
    vi.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: service }],
    }).compile();
    controller = moduleRef.get(UsersController);
  });

  it("lists the users", async () => {
    service.getUsers.mockResolvedValue([BOB]);

    expect(await controller.getAll()).toEqual([BOB]);
  });

  it("returns the current user", async () => {
    service.getUser.mockResolvedValue(BOB);

    expect(await controller.getMe(2)).toBe(BOB);
    expect(service.getUser).toHaveBeenCalledWith(2);
  });

  it("declares 200 on every action", () => {
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, UsersController.prototype.getAll)).toBe(HttpStatus.OK);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, UsersController.prototype.getMe)).toBe(HttpStatus.OK);
  });
});
