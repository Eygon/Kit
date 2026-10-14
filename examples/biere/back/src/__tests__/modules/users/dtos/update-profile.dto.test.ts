import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { UpdateProfileDto } from "@/modules/users/dtos/update-profile.dto";
import { AvatarEnum } from "@/modules/users/enums/avatar.enum";
import { USER_DISPLAY_NAME_EDIT_MAX_LENGTH, USER_DISPLAY_NAME_MIN_LENGTH } from "@/modules/users/users.constants";

const errorsOf = (payload: Record<string, unknown>) =>
  validate(plainToInstance(UpdateProfileDto, payload), { whitelist: true, forbidNonWhitelisted: true });

describe("UpdateProfileDto", () => {
  it("bounds the display name between 2 and 24 characters", () => {
    expect(USER_DISPLAY_NAME_MIN_LENGTH).toBe(2);
    expect(USER_DISPLAY_NAME_EDIT_MAX_LENGTH).toBe(24);
  });

  it.each(["ab", "a".repeat(24), "  ab  ", ` ${"a".repeat(24)} `])("accepts the display name %j", async (displayName) => {
    expect(await errorsOf({ displayName, avatar: AvatarEnum.FOAM })).toEqual([]);
  });

  it.each(["a", "a".repeat(25), "  a  ", ` ${"a".repeat(25)} `, "   ", ""])(
    "rejects the display name %j after trim",
    async (displayName) => {
      const errors = await errorsOf({ displayName, avatar: AvatarEnum.FOAM });

      expect(errors.map((error) => error.property)).toEqual(["displayName"]);
    },
  );

  it("trims the display name while transforming", () => {
    const dto = plainToInstance(UpdateProfileDto, { displayName: "  Alice B  ", avatar: AvatarEnum.FOAM });

    expect(dto.displayName).toBe("Alice B");
  });

  it("rejects a missing display name, a non string one, a missing avatar and an avatar outside the list", async () => {
    expect((await errorsOf({ avatar: AvatarEnum.FOAM })).map((error) => error.property)).toEqual(["displayName"]);
    expect((await errorsOf({ displayName: 12, avatar: AvatarEnum.FOAM })).map((error) => error.property)).toEqual([
      "displayName",
    ]);
    expect((await errorsOf({ displayName: "Alice" })).map((error) => error.property)).toEqual(["avatar"]);
    expect((await errorsOf({ displayName: "Alice", avatar: "beer" })).map((error) => error.property)).toEqual([
      "avatar",
    ]);
  });

  it("rejects an unknown field", async () => {
    const errors = await errorsOf({ displayName: "Alice", avatar: AvatarEnum.FOAM, avatarColor: "#000000" });

    expect(errors.map((error) => error.property)).toEqual(["avatarColor"]);
  });
});
