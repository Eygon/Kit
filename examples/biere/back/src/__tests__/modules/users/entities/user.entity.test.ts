import { getMetadataArgsStorage } from "typeorm";
import { describe, expect, it } from "vitest";
import { User } from "@/modules/users/entities/user.entity";

describe("User entity", () => {
  it("maps to the users table", () => {
    const table = getMetadataArgsStorage().tables.find((entry) => entry.target === User);

    expect(table?.name).toBe("users");
  });

  it("maps a generated id, a bounded display name and an avatar color", () => {
    const columns = getMetadataArgsStorage()
      .filterColumns(User)
      .map((column) => [column.propertyName, column.mode, column.options.length]);

    expect(columns).toEqual([
      ["id", "regular", undefined],
      ["displayName", "regular", 50],
      ["avatarColor", "regular", 7],
    ]);
    expect(getMetadataArgsStorage().generations.find((entry) => entry.target === User)?.propertyName).toBe("id");
  });
});
