import { describe, expect, it } from "vitest";
import {
  AVAILABILITY_STATUS_RANK,
  AvailabilityStatusEnum,
  isAvailabilityStatus,
} from "@/modules/venues/enums/availability-status.enum";

describe("AvailabilityStatusEnum", () => {
  it("lists confirmed, maybeGone, gone and unknown", () => {
    expect(Object.values(AvailabilityStatusEnum)).toEqual(["confirmed", "maybeGone", "gone", "unknown"]);
  });

  it("ranks confirmed first, then maybeGone, unknown and gone last", () => {
    expect(AVAILABILITY_STATUS_RANK).toEqual({ confirmed: 0, maybeGone: 1, unknown: 2, gone: 3 });
    expect(AVAILABILITY_STATUS_RANK[AvailabilityStatusEnum.CONFIRMED]).toBeLessThan(
      AVAILABILITY_STATUS_RANK[AvailabilityStatusEnum.GONE],
    );
  });

  it("recognises the four statuses and nothing else", () => {
    expect(["confirmed", "maybeGone", "gone", "unknown"].every((value) => isAvailabilityStatus(value))).toBe(true);
    expect(["Confirmed", "available", "", "toString"].some((value) => isAvailabilityStatus(value))).toBe(false);
  });
});
