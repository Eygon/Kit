import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { Test } from "@nestjs/testing";
import type { TestingModule } from "@nestjs/testing";
import type { Repository } from "typeorm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AvatarEnum } from "@/modules/users/enums/avatar.enum";
import { User } from "@/modules/users/entities/user.entity";
import { UsersRepository } from "@/modules/users/users.repository";
import { inMemoryDatabase } from "@/__tests__/support/test-database";

describe("UsersRepository", () => {
  let moduleRef: TestingModule;
  let repository: UsersRepository;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [inMemoryDatabase(), TypeOrmModule.forFeature([User])],
      providers: [UsersRepository],
    }).compile();
    repository = moduleRef.get(UsersRepository);
    await moduleRef.get<Repository<User>>(getRepositoryToken(User)).insert([
      { id: 1, displayName: "Zoe", avatarColor: "#111111" },
      { id: 2, displayName: "Anna", avatarColor: "#222222", avatar: AvatarEnum.CAN },
    ]);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it("returns every user as a DTO ordered by display name", async () => {
    expect(await repository.findAll()).toEqual([
      { id: 2, displayName: "Anna", avatarColor: "#222222", avatar: "can" },
      { id: 1, displayName: "Zoe", avatarColor: "#111111", avatar: "hop" },
    ]);
  });

  it("returns one user as a DTO, a row stored without avatar reading as hop", async () => {
    expect(await repository.findById(1)).toEqual({ id: 1, displayName: "Zoe", avatarColor: "#111111", avatar: "hop" });
  });

  it("returns null for an unknown id", async () => {
    expect(await repository.findById(42)).toBeNull();
  });

  it("replaces the display name and the avatar of one user and returns him, leaving the others untouched", async () => {
    const updated = await repository.updateProfile(2, { displayName: "Anna B", avatar: AvatarEnum.FOAM });

    expect(updated).toEqual({ id: 2, displayName: "Anna B", avatarColor: "#222222", avatar: "foam" });
    expect(await repository.findById(2)).toEqual(updated);
    expect(await repository.findById(1)).toEqual({ id: 1, displayName: "Zoe", avatarColor: "#111111", avatar: "hop" });
  });

  it("tells that an existing user exists", async () => {
    expect(await repository.existsById(1)).toBe(true);
  });

  it("tells that an unknown user does not exist", async () => {
    expect(await repository.existsById(99)).toBe(false);
  });
});
