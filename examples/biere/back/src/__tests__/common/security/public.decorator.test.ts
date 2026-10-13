import { describe, expect, it } from "vitest";
import { Public } from "@/common/security/public.decorator";
import { IS_PUBLIC_KEY } from "@/common/security/security.constants";

describe("Public", () => {
  it("marks a class as public", () => {
    @Public()
    class OpenController {}

    expect(Reflect.getMetadata(IS_PUBLIC_KEY, OpenController)).toBe(true);
  });

  it("marks a handler as public", () => {
    class MixedController {
      @Public()
      open(): void {}
    }

    expect(Reflect.getMetadata(IS_PUBLIC_KEY, MixedController.prototype.open)).toBe(true);
  });
});
