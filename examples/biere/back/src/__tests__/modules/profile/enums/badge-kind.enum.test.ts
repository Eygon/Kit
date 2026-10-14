import { describe, expect, it } from "vitest";
import { BadgeKindEnum } from "@/modules/profile/enums/badge-kind.enum";

describe("BadgeKindEnum", () => {
  it("lists the 10 badge kinds of the contract in order", () => {
    expect(Object.values(BadgeKindEnum)).toStrictEqual([
      "firstSip",
      "explorer",
      "collector",
      "completionist",
      "globetrotter",
      "specialist",
      "photographer",
      "regular",
      "sentinel",
      "cartographer",
    ]);
    expect(BadgeKindEnum.FIRST_SIP).toBe("firstSip");
    expect(BadgeKindEnum.SENTINEL).toBe("sentinel");
  });
});
