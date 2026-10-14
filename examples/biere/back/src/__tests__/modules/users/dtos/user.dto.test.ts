import { describe, expectTypeOf, it } from "vitest";
import type { UserDto } from "@/modules/users/dtos/user.dto";
import type { AvatarEnum } from "@/modules/users/enums/avatar.enum";

describe("UserDto", () => {
  it("exposes readonly id, displayName, avatarColor and avatar", () => {
    expectTypeOf<UserDto>().toEqualTypeOf<{
      readonly id: number;
      readonly displayName: string;
      readonly avatarColor: string;
      readonly avatar: AvatarEnum;
    }>();
  });
});
