import { describe, expect, it } from "vitest";
import { toDiscoveryCountDto } from "@/modules/tastings/mappers/discovery-count.mapper";

describe("toDiscoveryCountDto", () => {
  it("lists the user id and the discovered count as numbers and leaks no other column", () => {
    const row = { userId: "2", discoveredCount: "7", extra: "x" };

    expect(toDiscoveryCountDto(row as never)).toStrictEqual({ userId: 2, discoveredCount: 7 });
  });
});
