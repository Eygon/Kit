import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserDto } from "@/modules/users/dtos/user.dto";
import { UsersRepository } from "@/modules/users/users.repository";
import { UsersService } from "@/modules/users/users.service";

const ALICE: UserDto = { id: 1, displayName: "Alice", avatarColor: "#F59E0B" };

describe("UsersService", () => {
  const repository = { findAll: vi.fn(), findById: vi.fn() };
  let service: UsersService;

  beforeEach(async () => {
    vi.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [UsersService, { provide: UsersRepository, useValue: repository }],
    }).compile();
    service = moduleRef.get(UsersService);
  });

  it("returns the users from the repository", async () => {
    repository.findAll.mockResolvedValue([ALICE]);

    expect(await service.getUsers()).toEqual([ALICE]);
  });

  it("returns one user", async () => {
    repository.findById.mockResolvedValue(ALICE);

    expect(await service.getUser(1)).toBe(ALICE);
    expect(repository.findById).toHaveBeenCalledWith(1);
  });

  it("throws 404 for an unknown user", async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.getUser(9)).rejects.toThrow(new NotFoundException("User 9 not found."));
  });
});
