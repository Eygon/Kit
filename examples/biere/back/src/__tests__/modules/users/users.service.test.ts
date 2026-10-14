import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserDto } from "@/modules/users/dtos/user.dto";
import { UpdateProfileDto } from "@/modules/users/dtos/update-profile.dto";
import { UsersRepository } from "@/modules/users/users.repository";
import { UsersService } from "@/modules/users/users.service";
import { AvatarEnum } from "@/modules/users/enums/avatar.enum";

const ALICE: UserDto = { id: 1, displayName: "Alice", avatarColor: "#F59E0B", avatar: AvatarEnum.HOP };

describe("UsersService", () => {
  const repository = { findAll: vi.fn(), findById: vi.fn(), existsById: vi.fn(), updateProfile: vi.fn() };
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

  it.each([true, false])("answers %s to isKnownUser from the repository existence check", async (exists) => {
    repository.existsById.mockResolvedValue(exists);

    expect(await service.isKnownUser(7)).toBe(exists);
    expect(repository.existsById).toHaveBeenCalledWith(7);
  });

  it("throws 404 for an unknown user", async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.getUser(9)).rejects.toThrow(new NotFoundException("User 9 not found."));
  });
});

describe("UsersService.updateProfile", () => {
  const repository = { findById: vi.fn(), updateProfile: vi.fn() };
  const dto = Object.assign(new UpdateProfileDto(), { displayName: "  Alice B  ", avatar: AvatarEnum.FOAM });
  let service: UsersService;

  beforeEach(async () => {
    vi.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [UsersService, { provide: UsersRepository, useValue: repository }],
    }).compile();
    service = moduleRef.get(UsersService);
  });

  it("writes the trimmed changes of an existing user and returns the updated user", async () => {
    const updated: UserDto = { ...ALICE, displayName: "Alice B", avatar: AvatarEnum.FOAM };
    repository.findById.mockResolvedValue(ALICE);
    repository.updateProfile.mockResolvedValue(updated);

    expect(await service.updateProfile(1, dto)).toBe(updated);
    expect(repository.updateProfile).toHaveBeenCalledExactlyOnceWith(1, { displayName: "Alice B", avatar: "foam" });
  });

  it("throws 404 for an unknown user without writing anything", async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.updateProfile(9, dto)).rejects.toThrow(new NotFoundException("User 9 not found."));
    expect(repository.updateProfile).not.toHaveBeenCalled();
  });
});
