import { formatCheckinDate } from "@/utils/date/formatCheckinDate";

describe("formatCheckinDate", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("writes the day first with a four digit year in French", () => {
    expect(formatCheckinDate("2026-10-12T12:00:00.000Z", "fr")).toBe("12/10/2026");
  });

  it("follows the English short format in English", () => {
    expect(formatCheckinDate("2026-10-12T12:00:00.000Z", "en")).toBe("10/12/26");
  });

  it("gives two different strings for the same day when the language changes", () => {
    expect(formatCheckinDate("2026-01-02T12:00:00.000Z", "fr")).toBe("02/01/2026");
    expect(formatCheckinDate("2026-01-02T12:00:00.000Z", "en")).toBe("1/2/26");
  });

  it("writes the day of the phone time zone, not the UTC day", () => {
    vi.stubEnv("TZ", "Europe/Paris");

    expect(formatCheckinDate("2026-10-12T23:30:00.000Z", "fr")).toBe("13/10/2026");

    vi.stubEnv("TZ", "America/Los_Angeles");

    expect(formatCheckinDate("2026-10-12T03:30:00.000Z", "fr")).toBe("11/10/2026");
  });
});
