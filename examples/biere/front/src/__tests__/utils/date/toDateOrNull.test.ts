import { toDateOrNull } from "@/utils/date/toDateOrNull";

describe("toDateOrNull", () => {
  it("returns null for null", () => {
    expect(toDateOrNull(null)).toBeNull();
  });

  it("parses an ISO string into the same instant", () => {
    const date = toDateOrNull("2026-10-09T23:30:00.000Z");

    expect(date).toBeInstanceOf(Date);
    expect(date?.toISOString()).toBe("2026-10-09T23:30:00.000Z");
  });

  it("does not treat an empty string as null", () => {
    expect(toDateOrNull("")).toBeInstanceOf(Date);
  });
});
