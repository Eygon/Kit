import { describe, expect, it } from "vitest";
import { IS_PUBLIC_KEY, USER_ID_HEADER } from "@/common/security/security.constants";

describe("security constants", () => {
  it("reads the identity from the lower-cased X-User-Id header", () => {
    expect(USER_ID_HEADER).toBe("x-user-id");
  });

  it("names the public route metadata key", () => {
    expect(IS_PUBLIC_KEY).toBe("isPublic");
  });
});
