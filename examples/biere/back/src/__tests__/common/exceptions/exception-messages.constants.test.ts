import { describe, expect, it } from "vitest";
import {
  ERROR_MESSAGE_SEPARATOR,
  INTERNAL_ERROR_MESSAGE,
  UNIDENTIFIED_USER_MESSAGE,
} from "@/common/exceptions/exception-messages.constants";

describe("exception messages", () => {
  it("keeps the canonical client-facing messages stable", () => {
    expect(UNIDENTIFIED_USER_MESSAGE).toBe("Unable to identify the currently signed-in user.");
    expect(INTERNAL_ERROR_MESSAGE).toBe("Internal error");
    expect(ERROR_MESSAGE_SEPARATOR).toBe("; ");
  });
});
