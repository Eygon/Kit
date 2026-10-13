import { describe, expect, it } from "vitest";
import { VoteSenseEnum } from "@/modules/venues/enums/vote-sense.enum";

describe("VoteSenseEnum", () => {
  it("lists still and gone", () => {
    expect(Object.values(VoteSenseEnum)).toEqual(["still", "gone"]);
    expect(VoteSenseEnum.STILL).toBe("still");
    expect(VoteSenseEnum.GONE).toBe("gone");
  });
});
