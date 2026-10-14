import { describe, expect, it } from "vitest";
import { CollectionKindEnum } from "@/modules/collections/enums/collection-kind.enum";

describe("CollectionKindEnum", () => {
  it("exposes the wishlist and custom contract values", () => {
    expect(CollectionKindEnum.WISHLIST).toBe("wishlist");
    expect(CollectionKindEnum.CUSTOM).toBe("custom");
    expect(Object.values(CollectionKindEnum)).toEqual(["wishlist", "custom"]);
  });
});
