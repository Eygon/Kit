import { describe, expect, it } from "vitest";
import * as constants from "@/modules/pokedex/pokedex.constants";

describe("pokedex constants", () => {
  it("tolerates a clock five minutes ahead", () => {
    expect(constants.CHECKIN_FUTURE_TOLERANCE_MS).toBe(300_000);
  });
});
