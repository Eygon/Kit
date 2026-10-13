import { describe, expectTypeOf, it } from "vitest";
import type { UserDto } from "@/modules/users/dtos/user.dto";

describe("UserDto", () => {
  it("exposes readonly id, displayName and avatarColor", () => {
    expectTypeOf<UserDto>().toEqualTypeOf<{
      readonly id: number;
      readonly displayName: string;
      readonly avatarColor: string;
    }>();
  });
});
