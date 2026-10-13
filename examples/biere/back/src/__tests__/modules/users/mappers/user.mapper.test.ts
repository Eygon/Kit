import { describe, expect, it } from "vitest";
import { User } from "@/modules/users/entities/user.entity";
import { toUserDto } from "@/modules/users/mappers/user.mapper";

describe("toUserDto", () => {
  it("copies only the public fields of the entity", () => {
    const entity = Object.assign(new User(), { id: 2, displayName: "Bob", avatarColor: "#10B981", extra: "x" });

    expect(toUserDto(entity)).toEqual({ id: 2, displayName: "Bob", avatarColor: "#10B981" });
  });
});
